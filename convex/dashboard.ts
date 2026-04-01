import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { hasRegisterAccess } from "./register";

// Get dashboard statistics for a date range
export const getDashboardStats = query({
  args: {
    registerId: v.optional(v.id("registers")),
    employeeId: v.optional(v.id("employees")),
    startDate: v.number(), // Unix timestamp
    endDate: v.number(),   // Unix timestamp
    timezoneOffset: v.optional(v.number()), // Client's timezone offset in minutes (UTC - Local)
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to view dashboard stats");
    }

    // If registerId is provided, check access
    if (args.registerId) {
      const hasAccess = await hasRegisterAccess(ctx, args.registerId, userId);
      if (!hasAccess) {
        throw new Error("Access denied");
      }
    }

    // Get all registers the user has access to if no specific register is provided
    let accessibleRegisters: any[] = [];
    if (args.registerId) {
      const register = await ctx.db.get(args.registerId);
      if (register) {
        accessibleRegisters = [register];
      }
    } else {
      // Get all registers the user has access to (admin: all, manager: assigned)
      const user = await ctx.db.query("users").filter(q => q.eq(q.field("_id"), userId)).first();
      if (!user) {
        throw new Error("User not found");
      }

      if (user.role === "admin") {
        accessibleRegisters = await ctx.db.query("registers")
          .filter(q => q.eq(q.field("isActive"), true))
          .collect();
      } else {
        // Manager - get registers where they are assigned as manager
        const managerEmployees = await ctx.db.query("employees")
          .filter(q =>
            q.and(
              q.eq(q.field("userId"), userId),
              q.eq(q.field("isManager"), true),
              q.eq(q.field("isActive"), true)
            )
          )
          .collect();

        const registerIds = [...new Set(managerEmployees.map(emp => emp.registerId.toString()))];
        accessibleRegisters = await Promise.all(
          registerIds.map(id => ctx.db.get(id as any))
        );
      }
    }

    if (accessibleRegisters.length === 0) {
      return {
        registerDays: 0,
        presentDays: 0,
        halfDays: 0,
        totalHours: 0,
        wageDetails: {
          fullDayWage: 0,
          halfDayWage: 0,
          totalWage: 0
        }
      };
    }

    const registerIds = accessibleRegisters.map(r => r._id);

    // Convert client date range to UTC for consistent filtering
    const offset = args.timezoneOffset || 0;
    const startDateUTC = args.startDate - (offset * 60 * 1000);
    const endDateUTC = args.endDate - (offset * 60 * 1000);

    // Get register logs in the date range (using UTC-converted dates)
    const registerLogs = await ctx.db.query("registerLogs")
      .filter(q =>
        q.and(
          q.gte(q.field("timestamp"), startDateUTC),
          q.lte(q.field("timestamp"), endDateUTC),
          ...registerIds.map(id => q.eq(q.field("registerId"), id))
        )
      )
      .collect();

    // Get employees to filter by if specified
    let employeeIds = [];
    if (args.employeeId) {
      employeeIds = [args.employeeId];
    } else {
      // Get all employees for the accessible registers
      const employees = await ctx.db.query("employees")
        .filter(q =>
          q.and(
            q.eq(q.field("isActive"), true),
            ...registerIds.map(id => q.eq(q.field("registerId"), id))
          )
        )
        .collect();
      employeeIds = employees.map(emp => emp._id);
    }

    if (employeeIds.length === 0) {
      return {
        registerDays: registerLogs.length,
        presentDays: 0,
        halfDays: 0,
        totalHours: 0,
        wageDetails: {
          fullDayWage: 0,
          halfDayWage: 0,
          totalWage: 0
        }
      };
    }

    // Get rollcall entries for the date range (using UTC-converted dates)
    const rollcallEntries = await ctx.db.query("employeeRollcall")
      .filter(q =>
        q.and(
          q.gte(q.field("createdAt"), startDateUTC),
          q.lte(q.field("createdAt"), endDateUTC),
          ...(args.employeeId ? [q.eq(q.field("employeeId"), args.employeeId)] : [])
        )
      )
      .collect();

    // Calculate statistics
    let presentDays = 0;
    let halfDays = 0;
    let totalHours = 0;
    let totalFullDayWage = 0;
    let totalHalfDayWage = 0;
    let totalBreakTime = 0;

    // Get employee details for wage calculation
    let employees: any[] = [];
    if (args.employeeId) {
      const employee = await ctx.db.get(args.employeeId);
      if (employee) employees = [employee];
    } else {
      // Get all employees for the accessible registers
      employees = await ctx.db.query("employees")
        .filter(q =>
          q.and(
            q.eq(q.field("isActive"), true),
            ...registerIds.map(id => q.eq(q.field("registerId"), id))
          )
        )
        .collect();
    }

    const employeeRates = new Map();
    employees.forEach(emp => {
      if (emp) {
        employeeRates.set(emp._id.toString(), emp.ratePerDay);
      }
    });

    // Batch: fetch all attendance logs for all rollcalls using indexed queries
    const allBreaksResults = await Promise.all(
      rollcallEntries
        .filter(r => r.presentTime)
        .map(async (rollcall) => {
          const breaks = await ctx.db.query("attendanceLogs")
            .withIndex("byRollcall", q => q.eq("employeeRollcallId", rollcall._id))
            .collect();
          return { rollcallId: rollcall._id.toString(), breaks };
        })
    );
    const breaksByRollcall = new Map(
      allBreaksResults.map(({ rollcallId, breaks }) => [rollcallId, breaks] as const)
    );

    for (const rollcall of rollcallEntries) {
      if (rollcall.presentTime) {
        const employeeRate = employeeRates.get(rollcall.employeeId.toString()) || 0;

        if (rollcall.halfDay) {
          halfDays++;
          totalHalfDayWage += employeeRate / 2;
        } else {
          presentDays++;
          totalFullDayWage += employeeRate;
        }

        // Calculate hours worked (from present time to absent time or employee end time)
        const employee = employees.find(emp => emp?._id === rollcall.employeeId);
        if (employee) {
          const endTime = rollcall.absentTime ||
            new Date(new Date(rollcall.presentTime).setHours(
              Math.floor(employee.endTime / (1000 * 60 * 60)),
              Math.floor((employee.endTime % (1000 * 60 * 60)) / (1000 * 60)),
              0
            )).getTime();

          const hoursWorked = (endTime - rollcall.presentTime) / (1000 * 60 * 60);
          totalHours += Math.max(0, hoursWorked);

          // Calculate break time usage from pre-fetched data
          // Cap unclosed breaks at the employee's shift end time (not Date.now())
          // to prevent hanging logs from inflating break durations
          const attendanceLogs = breaksByRollcall.get(rollcall._id.toString()) || [];
          const employeeBreakTime = attendanceLogs.reduce((total, log) => {
            let breakEndTime = log.checkOutTime;
            if (!breakEndTime) {
              const breakDate = new Date(log.checkinTime);
              const shiftEnd = new Date(breakDate);
              shiftEnd.setHours(
                Math.floor(employee.endTime / (1000 * 60 * 60)),
                Math.floor((employee.endTime % (1000 * 60 * 60)) / (1000 * 60)),
                0, 0
              );
              breakEndTime = shiftEnd.getTime();
            }
            return total + (breakEndTime - log.checkinTime);
          }, 0);

          totalBreakTime += employeeBreakTime;
        }
      }
    }

    // Deduplicate register logs by local date (same day opened twice counts as 1)
    const uniqueRegisterDates = new Set(
      registerLogs.map(log => {
        const localTime = log.timestamp - (offset * 60 * 1000);
        return new Date(localTime).toISOString().split('T')[0];
      })
    );

    return {
      registerDays: uniqueRegisterDates.size,
      presentDays,
      halfDays,
      totalHours: Math.round(totalHours * 100) / 100,
      totalBreakTimeMinutes: Math.round(totalBreakTime / (1000 * 60)), // Convert ms to minutes
      allowedBreakTimeMinutes: employees.reduce((sum, emp) => sum + (emp?.allowedBreakTime || 0), 0),
      wageDetails: {
        fullDayWage: totalFullDayWage,
        halfDayWage: totalHalfDayWage,
        totalWage: totalFullDayWage + totalHalfDayWage,
        breakTimeCompliance: {
          totalAllowed: employees.reduce((sum, emp) => sum + (emp?.allowedBreakTime || 0), 0),
          totalUsed: Math.round(totalBreakTime / (1000 * 60)),
          compliant: totalBreakTime <= employees.reduce((sum, emp) => sum + (emp?.allowedBreakTime || 0), 0) * 1000 * 60
        }
      }
    };
  },
});

// Get contribution data for the graph
export const getContributionData = query({
  args: {
    registerId: v.optional(v.id("registers")),
    employeeId: v.optional(v.id("employees")),
    startDate: v.number(),
    endDate: v.number(),
    timezoneOffset: v.optional(v.number()), // Client's timezone offset in minutes (UTC - Local)
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Similar access control as above
    if (args.registerId) {
      const hasAccess = await hasRegisterAccess(ctx, args.registerId, userId);
      if (!hasAccess) {
        return [];
      }
    }

    // Convert client date range to UTC for consistent filtering
    const offset = args.timezoneOffset || 0;
    const startDateUTC = args.startDate - (offset * 60 * 1000);
    const endDateUTC = args.endDate - (offset * 60 * 1000);

    // Get rollcall entries (using UTC-converted dates)
    const rollcalls = await ctx.db.query("employeeRollcall")
      .filter(q =>
        q.and(
          q.gte(q.field("createdAt"), startDateUTC),
          q.lte(q.field("createdAt"), endDateUTC),
          ...(args.employeeId ? [q.eq(q.field("employeeId"), args.employeeId)] : [])
        )
      )
      .collect();

    // Get employee details for intensity calculation
    const employeeIds = [...new Set(rollcalls.map(r => r.employeeId.toString()))];
    const employees = await Promise.all(
      employeeIds.map(id => ctx.db.get(id as any))
    );
    const employeeMap = new Map();
    employees.forEach(emp => {
      if (emp) {
        employeeMap.set(emp._id.toString(), emp);
      }
    });

    // Group by date
    const dataByDate = new Map<string, any>();

    for (const rollcall of rollcalls) {
      // Include if present OR absent
      if (rollcall.presentTime || rollcall.absentTime) {
        const employee = employeeMap.get(rollcall.employeeId.toString());
        if (!employee) continue;

        // Adjust for timezone to get Local Date
        // Local Time = UTC Time - (Offset * 60 * 1000)
        // Note: offset is positive if behind UTC (e.g. PST is 480), negative if ahead (e.g. IST is -330)
        const offset = args.timezoneOffset || 0;
        const localTime = rollcall.createdAt - (offset * 60 * 1000);
        const date = new Date(localTime).toISOString().split('T')[0];

        let intensity = 0;

        if (rollcall.presentTime) {
          // Calculate Intensity
          // Formula: (present - (absent || shiftEnd)) / (start - end - break)
          // Note: Times are in ms. Start/End are ms from midnight.

          // 1. Calculate Actual Duration (Numerator)
          // We use (absent || shiftEnd) - present to get positive duration
          let actualEndTime = rollcall.absentTime;
          if (!actualEndTime) {
            const rollcallDate = new Date(rollcall.presentTime);
            const shiftEnd = new Date(rollcallDate);
            const shiftEndHours = Math.floor(employee.endTime / (1000 * 60 * 60));
            const shiftEndMinutes = Math.floor((employee.endTime % (1000 * 60 * 60)) / (1000 * 60));
            shiftEnd.setHours(shiftEndHours, shiftEndMinutes, 0, 0);
            actualEndTime = shiftEnd.getTime();
          }
          const actualDuration = Math.max(0, actualEndTime - rollcall.presentTime);

          // 2. Calculate Expected Duration (Denominator)
          // (End - Start) - Break
          // employee.endTime and startTime are ms from midnight
          let shiftDuration = employee.endTime - employee.startTime;
          if (shiftDuration < 0) shiftDuration += 24 * 60 * 60 * 1000; // Handle overnight shift

          const allowedBreakMs = (employee.allowedBreakTime || 0) * 60 * 1000;
          const expectedDuration = Math.max(1, shiftDuration - allowedBreakMs); // Avoid zero division

          intensity = Math.min(1, Math.max(0, actualDuration / expectedDuration));
        }

        // We only take the first entry per day for simplicity if multiple exist (though usually 1 per day)
        if (!dataByDate.has(date)) {
          dataByDate.set(date, {
            date,
            count: rollcall.presentTime ? 1 : 0, // 1 for present, 0 for absent
            level: 0, // Not used anymore
            intensity,
            registerLogId: rollcall.registerLogId,
            employeeId: rollcall.employeeId,
            rollcallId: rollcall._id,
            halfDay: rollcall.halfDay || false // Include half-day flag
          });
        }
      }
    }

    // Add absent entries for register open days with no rollcall for this employee
    if (args.registerId) {
      const registerLogs = await ctx.db.query("registerLogs")
        .withIndex("byRegisterDate", q => q.eq("registerId", args.registerId!))
        .filter(q =>
          q.and(
            q.gte(q.field("timestamp"), startDateUTC),
            q.lte(q.field("timestamp"), endDateUTC)
          )
        )
        .collect();

      for (const regLog of registerLogs) {
        const localTime = regLog.timestamp - (offset * 60 * 1000);
        const date = new Date(localTime).toISOString().split('T')[0];
        if (!dataByDate.has(date)) {
          dataByDate.set(date, {
            date,
            count: 0,
            level: 0,
            intensity: 0,
            registerLogId: regLog._id,
            employeeId: args.employeeId,
            halfDay: false
          });
        }
      }
    }

    return Array.from(dataByDate.values());
  },
});

// Get detailed log data for LogDrawer
export const getEmployeeLog = query({
  args: {
    registerLogId: v.id("registerLogs"),
    employeeId: v.id("employees"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const registerLog = await ctx.db.get(args.registerLogId);
    if (!registerLog) throw new Error("Register log not found");

    const employee = await ctx.db.get(args.employeeId);
    if (!employee) throw new Error("Employee not found");

    const rollcall = await ctx.db.query("employeeRollcall")
      .withIndex("byEmployeeDate", q =>
        q.eq("employeeId", args.employeeId).eq("registerLogId", args.registerLogId)
      )
      .first();

    if (!rollcall) return null;

    const logs = await ctx.db.query("attendanceLogs")
      .withIndex("byRollcall", q => q.eq("employeeRollcallId", rollcall._id))
      .collect();

    // Map to EmployeeLogData structure
    return {
      registerLog,
      employee,
      rollcall,
      logs: logs.map(log => ({
        id: log._id,
        checkinTime: log.checkinTime,
        checkOutTime: log.checkOutTime,
        isActive: !log.checkOutTime
      }))
    };
  }
});

export const getEmployeeLogByTimeRange = query({
  args: {
    employeeId: v.id("employees"),
    from: v.number(),
    to: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const employee = await ctx.db.get(args.employeeId);
    if (!employee) throw new Error("Employee not found");

    // Find rollcall for this employee in the time range
    const rollcalls = await ctx.db.query("employeeRollcall")
      .withIndex("byDate", q => q.gte("createdAt", args.from).lte("createdAt", args.to))
      .filter(q => q.eq(q.field("employeeId"), args.employeeId))
      .collect();

    const rollcall = rollcalls[0]; // Should be only one per day

    if (!rollcall) return null;

    const registerLog = await ctx.db.get(rollcall.registerLogId);
    if (!registerLog) return null;

    const logs = await ctx.db.query("attendanceLogs")
      .withIndex("byRollcall", q => q.eq("employeeRollcallId", rollcall._id))
      .collect();

    return {
      registerLog,
      employee,
      rollcall,
      logs: logs.map(log => ({
        id: log._id,
        checkinTime: log.checkinTime,
        checkOutTime: log.checkOutTime,
        isActive: !log.checkOutTime
      }))
    };
  }
});

// Get hourly data for bar chart
export const getHourlyData = query({
  args: {
    registerId: v.optional(v.id("registers")),
    employeeId: v.optional(v.id("employees")),
    startDate: v.number(),
    endDate: v.number(),
    timezoneOffset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Similar access control
    if (args.registerId) {
      const hasAccess = await hasRegisterAccess(ctx, args.registerId, userId);
      if (!hasAccess) {
        return [];
      }
    }

    // Convert client date range to UTC for consistent filtering
    const offset = args.timezoneOffset || 0;
    const startDateUTC = args.startDate - (offset * 60 * 1000);
    const endDateUTC = args.endDate - (offset * 60 * 1000);

    // Get rollcall entries (using UTC-converted dates)
    const rollcalls = await ctx.db.query("employeeRollcall")
      .filter(q =>
        q.and(
          q.gte(q.field("createdAt"), startDateUTC),
          q.lte(q.field("createdAt"), endDateUTC),
          ...(args.employeeId ? [q.eq(q.field("employeeId"), args.employeeId)] : [])
        )
      )
      .collect();

    // Get employee details for end times
    const employeeIds = [...new Set(rollcalls.map(r => r.employeeId.toString()))];
    const employees = await Promise.all(
      employeeIds.map(id => ctx.db.get(id as any))
    );

    const employeeMap = new Map();
    employees.forEach(emp => {
      if (emp) {
        employeeMap.set(emp._id.toString(), emp);
      }
    });

    // Batch: fetch all attendance logs for present rollcalls using indexed queries
    const presentRollcalls = rollcalls.filter(r => r.presentTime);
    const hourlyBreaksResults = await Promise.all(
      presentRollcalls.map(async (rollcall) => {
        const breaks = await ctx.db.query("attendanceLogs")
          .withIndex("byRollcall", q => q.eq("employeeRollcallId", rollcall._id))
          .collect();
        return { rollcallId: rollcall._id.toString(), breaks };
      })
    );
    const hourlyBreaksByRollcall = new Map(
      hourlyBreaksResults.map(({ rollcallId, breaks }) => [rollcallId, breaks] as const)
    );

    // Group by date and calculate hours
    const hoursByDate = new Map<string, { workDuration: number; breakDuration: number }>();

    for (const rollcall of presentRollcalls) {
      const employee = employeeMap.get(rollcall.employeeId.toString());
      if (!employee) continue;

      // Adjust for timezone
      const offset = args.timezoneOffset || 0;
      const localTime = rollcall.createdAt - (offset * 60 * 1000);
      const date = new Date(localTime).toISOString().split('T')[0];

      // Calculate End Time: Absent Time OR Shift End Time
      let endTime = rollcall.absentTime;
      if (!endTime) {
        const rollcallDate = new Date(rollcall.presentTime!);
        const shiftEnd = new Date(rollcallDate);

        const shiftEndHours = Math.floor(employee.endTime / (1000 * 60 * 60));
        const shiftEndMinutes = Math.floor((employee.endTime % (1000 * 60 * 60)) / (1000 * 60));

        shiftEnd.setHours(shiftEndHours, shiftEndMinutes, 0, 0);
        endTime = shiftEnd.getTime();
      }

      // Calculate Total Duration (Present to End)
      const totalDurationMs = Math.max(0, endTime - rollcall.presentTime!);

      // Calculate Break Duration from pre-fetched data
      // Cap unclosed breaks at the employee's shift end time on that day
      const attendanceLogs = hourlyBreaksByRollcall.get(rollcall._id.toString()) || [];
      const breakDurationMs = attendanceLogs.reduce((total, log) => {
        let breakEndTime = log.checkOutTime;
        if (!breakEndTime) {
          const breakDate = new Date(log.checkinTime);
          const shiftEnd = new Date(breakDate);
          shiftEnd.setHours(
            Math.floor(employee.endTime / (1000 * 60 * 60)),
            Math.floor((employee.endTime % (1000 * 60 * 60)) / (1000 * 60)),
            0, 0
          );
          breakEndTime = shiftEnd.getTime();
        }
        return total + Math.max(0, breakEndTime - log.checkinTime);
      }, 0);

      // Work Duration = Total Duration - Break Duration
      const workDurationMs = Math.max(0, totalDurationMs - breakDurationMs);

      // Convert to Hours
      const workDurationHours = workDurationMs / (1000 * 60 * 60);
      const breakDurationHours = breakDurationMs / (1000 * 60 * 60);

      const current = hoursByDate.get(date) || { workDuration: 0, breakDuration: 0 };
      hoursByDate.set(date, {
        workDuration: current.workDuration + workDurationHours,
        breakDuration: current.breakDuration + breakDurationHours
      });
    }

    // Convert to chart format
    const chartData = [];
    for (const [date, hours] of hoursByDate.entries()) {
      chartData.push({
        date: date,
        workDuration: Math.round(hours.workDuration * 100) / 100,
        breakDuration: Math.round(hours.breakDuration * 100) / 100,
        totalHours: Math.round((hours.workDuration + hours.breakDuration) * 100) / 100
      });
    }

    return chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },
});