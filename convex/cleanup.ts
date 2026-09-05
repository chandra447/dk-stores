import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Retention cleanup for shop data older than a cutoff.
 *
 * Deletes, in dependency order: attendanceLogs -> employeeRollcall ->
 * registerLogs. Old daily data otherwise keeps inflating every range scan
 * (dashboard month queries, today's-log lookups) and counts toward
 * database I/O + storage billing.
 *
 * Two entry points share one batch worker:
 * - `deleteOldData` (admin-only): manual/backfill runs with an explicit cutoff.
 * - `retentionSweep` (scheduler-only): monthly cron with a rolling 6-month
 *   cutoff. Schedulers carry no user identity; this stays safe because
 *   `internal.*` is unreachable from client code, the batch is capped, and
 *   an implausible backlog aborts instead of deleting.
 */
const SIX_MONTHS_MS = 183 * 24 * 60 * 60 * 1000;
const SWEEP_BATCH = 200;
const SAFETY_MAX_LOGS = 5000;

// Count docs older than `cutoff` (unix ms) without deleting anything.
export const countOldData = query({
  args: { cutoff: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Admin only");

    const oldLogs = await ctx.db
      .query("registerLogs")
      .withIndex("byDate", (q) => q.lt("timestamp", args.cutoff))
      .collect();

    const oldRollcallsNested = await Promise.all(
      oldLogs.map((log) =>
        ctx.db
          .query("employeeRollcall")
          .withIndex("byRegisterLog", (q) => q.eq("registerLogId", log._id))
          .collect()
      )
    );
    const oldRollcalls = oldRollcallsNested.flat();

    const oldBreaksNested = await Promise.all(
      oldRollcalls.map((rollcall) =>
        ctx.db
          .query("attendanceLogs")
          .withIndex("byRollcall", (q) =>
            q.eq("employeeRollcallId", rollcall._id)
          )
          .collect()
      )
    );
    const oldBreaksCount = oldBreaksNested.reduce(
      (sum, logs) => sum + logs.length,
      0
    );

    return {
      cutoff: args.cutoff,
      registerLogs: oldLogs.length,
      employeeRollcall: oldRollcalls.length,
      attendanceLogs: oldBreaksCount,
    };
  },
});

// Deletes one bounded batch of pre-cutoff shop data, oldest first, in
// dependency order (breaks -> rollcalls -> register logs). Shared by the
// manual admin entry point and the scheduled sweep.
async function deleteOldBatch(ctx: MutationCtx, cutoff: number, limit?: number) {
  const capped = Math.min(limit ?? 200, 500);
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

// Manual entry point: one bounded batch. Admin-only. Repeat until `hasMore`
// is false.
export const deleteOldData = internalMutation({
  args: {
    cutoff: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Admin only");

    return deleteOldBatch(ctx, args.cutoff, args.limit);
  },
});

// Monthly cron entry point (see convex/crons.ts). Schedulers carry no user
// identity, so there is no admin check here — safety comes from the internal
// boundary, the batch cap, and the backlog guardrail below.
//
// One batch per run: steady state adds ~30 days of newly-aged logs a month,
// well under the batch cap, so the cron trickles while the manual
// `deleteOldData` covers any historical backfill. A leftover `hasMore` is
// picked up by next month's run and is visible in the cron logs.
export const retentionSweep = internalMutation({
  args: {
    cutoff: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = args.cutoff ?? Date.now() - SIX_MONTHS_MS;

    // Guardrail: an implausibly large backlog means a wrong cutoff — abort
    // loudly (cron error log) instead of wiping the tables.
    const backlogProbe = await ctx.db
      .query("registerLogs")
      .withIndex("byDate", (q) => q.lt("timestamp", cutoff))
      .take(SAFETY_MAX_LOGS + 1);
    if (backlogProbe.length > SAFETY_MAX_LOGS) {
      throw new Error(
        `Retention sweep aborted: backlog exceeds safety bound ${SAFETY_MAX_LOGS} register logs`
      );
    }

    const result = await deleteOldBatch(ctx, cutoff, SWEEP_BATCH);
    return { cutoff, ...result };
  },
});
