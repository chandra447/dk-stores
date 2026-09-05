import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Monthly retention sweep: delete shop day-data (register logs, rollcalls,
// breaks) older than a rolling 6 months. Runs overnight Australia time
// (hourUTC 16 = ~2am AEST); Convex spreads the minute within the hour.
crons.monthly(
  "retention-sweep-old-shop-data",
  { day: 1, hourUTC: 16, minuteUTC: 23 },
  // @ts-ignore Convex function-reference inference exceeds repo tsc depth limits (see employees.ts:124); runtime binding is validated by Convex.
  internal.cleanup.retentionSweep,
  {}
);

export default crons;
