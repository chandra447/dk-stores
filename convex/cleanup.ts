import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internalMutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Retention cleanup for shop data older than a cutoff.
 *
 * Deletes, in dependency order: attendanceLogs -> employeeRollcall ->
 * registerLogs. Old daily data otherwise keeps inflating every range scan
 * (dashboard month queries, today's-log lookups) and counts toward
 * database I/O + storage billing.
 *
 * Three entry points share one batch worker:
 * - `countOldData` (admin-only query): paginated dry run. Sum page totals
 *   until `isDone`, passing back `continueCursor`.
 * - `deleteOldData` (internal): manual/backfill runs with an explicit cutoff.
 *   No auth check — `internal.*` is unreachable from client code (precedent:
 *   linkEmployeeToUser), and schedulers/CLI carry no Convex Auth identity.
 *   The cutoff-must-be-past guard is the backstop against a wrong-arg wipe.
 * - `retentionSweep` (internal, scheduler-only): monthly cron with a rolling
 *   6-month cutoff. One batch per transaction, chained via the scheduler
 *   until done or the chain budget runs out.
 */
const SIX_MONTHS_MS = 183 * 24 * 60 * 60 * 1000;
const SWEEP_BATCH = 50;
const MAX_SWEEP_CHAIN = 20;
const SAFETY_MAX_LOGS = 5000;

// Count docs older than `cutoff` (unix ms) without deleting anything.
// Paginated: one page of parent logs plus bounded child counts per call.
// Collecting the whole backlog at once (Promise.all per log and per rollcall)
// exceeds Convex concurrent-IO budgets on exactly the datasets this exists to
// measure. Sum page totals until `isDone`, passing back `continueCursor`.
export const countOldData = query({
  args: {
    cutoff: v.number(),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Admin only");

    const page = await ctx.db
      .query("registerLogs")
      .withIndex("byDate", (q) => q.lt("timestamp", args.cutoff))
      .order("asc")
      .paginate(args.paginationOpts ?? { numItems: 50, cursor: null });

    // Sequential on purpose: bounded reads per call, no concurrent-IO burst.
    let employeeRollcall = 0;
    let attendanceLogs = 0;
    for (const log of page.page) {
      const rollcalls = await ctx.db
        .query("employeeRollcall")
        .withIndex("byRegisterLog", (q) => q.eq("registerLogId", log._id))
        .collect();
      employeeRollcall += rollcalls.length;
      for (const rollcall of rollcalls) {
        const breaks = await ctx.db
          .query("attendanceLogs")
          .withIndex("byRollcall", (q) =>
            q.eq("employeeRollcallId", rollcall._id)
          )
          .collect();
        attendanceLogs += breaks.length;
      }
    }

    return {
      cutoff: args.cutoff,
      registerLogs: page.page.length,
      employeeRollcall,
      attendanceLogs,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

// Deletes one bounded batch of pre-cutoff shop data, oldest first, in
// dependency order (breaks -> rollcalls -> register logs). Shared by the
// manual entry point and the scheduled sweep. The parent cap is deliberately
// small: children fan out per parent inside a single transaction, so the
// budget that matters is total reads+writes, not parent count.
async function deleteOldBatch(ctx: MutationCtx, cutoff: number, limit?: number) {
  const capped = Math.min(limit ?? 50, 100);
  let deletedRegisterLogs = 0;
  let deletedRollcalls = 0;
  let deletedBreaks = 0;

  // Oldest register logs first so each batch makes progress in date order.
  const oldLogs = await ctx.db
    .query("registerLogs")
    .withIndex("byDate", (q) => q.lt("timestamp", cutoff))
    .order("asc")
    .take(capped);

  for (const log of oldLogs) {
    const rollcalls = await ctx.db
      .query("employeeRollcall")
      .withIndex("byRegisterLog", (q) => q.eq("registerLogId", log._id))
      .collect();
    for (const rollcall of rollcalls) {
      const breaks = await ctx.db
        .query("attendanceLogs")
        .withIndex("byRollcall", (q) =>
          q.eq("employeeRollcallId", rollcall._id)
        )
        .collect();
      for (const b of breaks) {
        await ctx.db.delete(b._id);
        deletedBreaks++;
      }
      await ctx.db.delete(rollcall._id);
      deletedRollcalls++;
    }
    await ctx.db.delete(log._id);
    deletedRegisterLogs++;
  }

  const remaining = await ctx.db
    .query("registerLogs")
    .withIndex("byDate", (q) => q.lt("timestamp", cutoff))
    .first();

  return {
    deletedRegisterLogs,
    deletedRollcalls,
    deletedBreaks,
    hasMore: remaining !== null,
  };
}

// Backstop against a wrong cutoff: an implausibly large backlog aborts loudly
// instead of wiping the tables. Shared by the manual and scheduled paths.
async function assertBacklogWithinSafety(ctx: MutationCtx, cutoff: number) {
  const probe = await ctx.db
    .query("registerLogs")
    .withIndex("byDate", (q) => q.lt("timestamp", cutoff))
    .take(SAFETY_MAX_LOGS + 1);
  if (probe.length > SAFETY_MAX_LOGS) {
    throw new Error(
      `Retention aborted: backlog exceeds safety bound ${SAFETY_MAX_LOGS} register logs`
    );
  }
}

// Manual entry point: one bounded batch. Repeat until `hasMore` is false.
export const deleteOldData = internalMutation({
  args: {
    cutoff: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.cutoff >= Date.now()) {
      throw new Error("Refusing to delete with a cutoff in the future");
    }
    await assertBacklogWithinSafety(ctx, args.cutoff);
    return deleteOldBatch(ctx, args.cutoff, args.limit);
  },
});

// Monthly cron entry point (see convex/crons.ts). Schedulers carry no user
// identity, so there is no admin check here — safety comes from the internal
// boundary, the batch/chain caps, and the shared backlog guardrail.
//
// One batch = one transaction; follow-ups chain via the scheduler until done
// or the budget runs out (50 logs x 20 = 1000 logs max per monthly run,
// far above steady-state aging, bounded against a wrong-cutoff wipe).
export const retentionSweep = internalMutation({
  args: {
    cutoff: v.optional(v.number()),
    batchesRemaining: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = args.cutoff ?? Date.now() - SIX_MONTHS_MS;
    const budget = args.batchesRemaining ?? MAX_SWEEP_CHAIN;

    await assertBacklogWithinSafety(ctx, cutoff);

    const result = await deleteOldBatch(ctx, cutoff, SWEEP_BATCH);

    let scheduledFollowUp = false;
    if (result.hasMore && budget > 1) {
      // @ts-ignore Convex function-reference inference exceeds repo tsc depth limits (see crons.ts); runtime binding is validated by Convex.
      await ctx.scheduler.runAfter(60 * 1000, internal.cleanup.retentionSweep, { cutoff, batchesRemaining: budget - 1 });
      scheduledFollowUp = true;
    }

    return { cutoff, ...result, scheduledFollowUp };
  },
});
