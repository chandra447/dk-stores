import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { hasRegisterAccess } from "./register";

// Mark employee as present for the day
export const markEmployeePresent = mutation({
  args: {
    employeeId: v.id("employees"),
    registerLogId: v.id("registerLogs"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to mark attendance");
    }

    // Verify the employee and register log exist and belong to this user
    const [employee, registerLog] = await Promise.all([
      ctx.db.get(args.employeeId),
      ctx.db.get(args.registerLogId),
    ]);

    if (!employee || !registerLog) {
      throw new Error("Employee or register log not found");
    }

    const register = await ctx.db.get(registerLog.registerId);
    if (!register) {
      throw new Error("Register not found");
    }

    // Check if user has access (owner or assigned manager)
    const hasAccess = await hasRegisterAccess(ctx, register._id, userId);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Check if employee is already marked present for this register log
    const existingRollcall = await ctx.db.query("employeeRollcall")
      .filter(q => q.eq(q.field("employeeId"), args.employeeId))
      .filter(q => q.eq(q.field("registerLogId"), args.registerLogId))
      .first();

    if (existingRollcall) {
      // If already present, just return the existing record
      if (existingRollcall.presentTime && !existingRollcall.absentTime) {
        return existingRollcall._id;
      }

      // If was absent, clear absentTime and mark present again
      await ctx.db.patch(existingRollcall._id, {
        presentTime: Date.now(),
        absentTime: undefined,
        updatedAt: Date.now(),
      });
      return existingRollcall._id;
    }

    // Create new rollcall entry
    const rollcallId = await ctx.db.insert("employeeRollcall", {
      registerLogId: args.registerLogId,
      employeeId: args.employeeId,
      presentTime: Date.now(),
      halfDay: false, // Default to full day
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return rollcallId;
  },
});

// Mark employee as absent
export const markEmployeeAbsent = mutation({
  args: {
    employeeId: v.id("employees"),
    registerLogId: v.id("registerLogs"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to mark attendance");
    }

    // Verify the employee and register log exist and belong to this user
    const [employee, registerLog] = await Promise.all([
      ctx.db.get(args.employeeId),
      ctx.db.get(args.registerLogId),
    ]);

    if (!employee || !registerLog) {
      throw new Error("Employee or register log not found");
    }

    const register = await ctx.db.get(registerLog.registerId);
    if (!register) {
      throw new Error("Register not found");
    }

    // Check if user has access (owner or assigned manager)
    const hasAccess = await hasRegisterAccess(ctx, register._id, userId);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Check if employee has a rollcall entry for this register log
    const existingRollcall = await ctx.db.query("employeeRollcall")
      .filter(q => q.eq(q.field("employeeId"), args.employeeId))
      .filter(q => q.eq(q.field("registerLogId"), args.registerLogId))
      .first();

    if (existingRollcall) {
      // Update existing rollcall to mark as absent
      await ctx.db.patch(existingRollcall._id, {
        absentTime: Date.now(),
        updatedAt: Date.now(),
      });
      return existingRollcall._id;
    }

    // Create new rollcall entry with absent time
    const rollcallId = await ctx.db.insert("employeeRollcall", {
      registerLogId: args.registerLogId,
      employeeId: args.employeeId,
      absentTime: Date.now(),
      halfDay: false,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return rollcallId;
  },
});

// Start employee break (checkout)
export const startEmployeeBreak = mutation({
  args: {
    employeeId: v.id("employees"),
    rollcallId: v.id("employeeRollcall"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to manage attendance");
    }

    // Verify the rollcall exists and belongs to this user's register
    const [rollcall, employee] = await Promise.all([
      ctx.db.get(args.rollcallId),
      ctx.db.get(args.employeeId),
    ]);

    if (!rollcall || !employee) {
      throw new Error("Rollcall or employee not found");
    }

    const registerLog = await ctx.db.get(rollcall.registerLogId);
    if (!registerLog) {
      throw new Error("Register log not found");
    }

    const register = await ctx.db.get(registerLog.registerId);
    if (!register) {
      throw new Error("Register not found");
    }

    // Check if user has access (owner or assigned manager)
    const hasAccess = await hasRegisterAccess(ctx, register._id, userId);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Check if employee is already on break
    const activeBreak = await ctx.db.query("attendanceLogs")
      .filter(q => q.eq(q.field("employeeRollcallId"), args.rollcallId))
      .filter(q => q.eq(q.field("employeeId"), args.employeeId))
      .filter(q => q.eq(q.field("checkOutTime"), undefined))
      .first();

    if (activeBreak) {
      throw new Error("Employee is already on break");
    }

    // Create new attendance log entry (break start)
    const attendanceLogId = await ctx.db.insert("attendanceLogs", {
      employeeRollcallId: args.rollcallId,
      employeeId: args.employeeId,
      checkinTime: Date.now(), // Start of break
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return attendanceLogId;
  },
});

// End employee break (checkin)
export const endEmployeeBreak = mutation({
  args: {
    attendanceLogId: v.id("attendanceLogs"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to manage attendance");
    }

    // Get the attendance log
    const attendanceLog = await ctx.db.get(args.attendanceLogId);
    if (!attendanceLog) {
      throw new Error("Attendance log not found");
    }

    if (attendanceLog.checkOutTime !== undefined) {
      throw new Error("Break has already ended");
    }

    // Verify access through employee and register
    const [rollcall, employee] = await Promise.all([
      ctx.db.get(attendanceLog.employeeRollcallId),
      ctx.db.get(attendanceLog.employeeId),
    ]);

    if (!rollcall || !employee) {
      throw new Error("Rollcall or employee not found");
    }

    const registerLog = await ctx.db.get(rollcall.registerLogId);
    if (!registerLog) {
      throw new Error("Register log not found");
    }

    const register = await ctx.db.get(registerLog.registerId);
    if (!register) {
      throw new Error("Register not found");
    }

    // Check if user has access (owner or assigned manager)
    const hasAccess = await hasRegisterAccess(ctx, register._id, userId);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Update attendance log with checkout time
    await ctx.db.patch(args.attendanceLogId, {
      checkOutTime: Date.now(),
      updatedAt: Date.now(),
    });

    return args.attendanceLogId;
  },
});

// Return from absence (convert absent period to break)
export const returnFromAbsence = mutation({
  args: {
    rollcallId: v.id("employeeRollcall"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to manage attendance");
    }

    // Get the rollcall entry
    const rollcall = await ctx.db.get(args.rollcallId);
    if (!rollcall) {
      throw new Error("Rollcall not found");
    }

    if (!rollcall.absentTime) {
      throw new Error("Employee was not marked absent");
    }

    // Verify access through employee and register
    const [employee, registerLog] = await Promise.all([
      ctx.db.get(rollcall.employeeId),
      ctx.db.get(rollcall.registerLogId),
    ]);

    if (!employee || !registerLog) {
      throw new Error("Employee or register log not found");
    }

    const register = await ctx.db.get(registerLog.registerId);
    if (!register) {
      throw new Error("Register not found");
    }

    // Check if user has access (owner or assigned manager)
    const hasAccess = await hasRegisterAccess(ctx, register._id, userId);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Create attendance log entry for the absent period
    const attendanceLogId = await ctx.db.insert("attendanceLogs", {
      employeeRollcallId: args.rollcallId,
      employeeId: rollcall.employeeId,
      checkinTime: rollcall.absentTime, // When they went absent
      checkOutTime: Date.now(), // When they returned
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Clear absent time from rollcall
    await ctx.db.patch(args.rollcallId, {
      absentTime: undefined,
      updatedAt: Date.now(),
    });

    return attendanceLogId;
  },
});

// Mark employee as half-day
export const markHalfDay = mutation({
  args: {
    rollcallId: v.id("employeeRollcall"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to manage attendance");
    }

    // Get the rollcall entry
    const rollcall = await ctx.db.get(args.rollcallId);
    if (!rollcall) {
      throw new Error("Rollcall not found");
    }

    // Verify access through employee and register
    const [employee, registerLog] = await Promise.all([
      ctx.db.get(rollcall.employeeId),
      ctx.db.get(rollcall.registerLogId),
    ]);

    if (!employee || !registerLog) {
      throw new Error("Employee or register log not found");
    }

    const register = await ctx.db.get(registerLog.registerId);
    if (!register) {
      throw new Error("Register not found");
    }

    // Check if user has access (owner or assigned manager)
    const hasAccess = await hasRegisterAccess(ctx, register._id, userId);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Update rollcall to mark as half-day
    await ctx.db.patch(args.rollcallId, {
      halfDay: true,
      updatedAt: Date.now(),
    });

    return args.rollcallId;
  },
});

// Get employee's current attendance status
export const getEmployeeAttendanceStatus = query({
  args: {
    employeeId: v.id("employees"),
    registerLogId: v.id("registerLogs"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Verify access through employee and register
    const [employee, registerLog] = await Promise.all([
      ctx.db.get(args.employeeId),
      ctx.db.get(args.registerLogId),
    ]);

    if (!employee || !registerLog) {
      return null;
    }

    const register = await ctx.db.get(registerLog.registerId);
    if (!register) {
      return null;
    }

    // Check if user has access (owner or assigned manager)
    const hasAccess = await hasRegisterAccess(ctx, register._id, userId);
    if (!hasAccess) {
      return null;
    }

    // Get rollcall entry for this employee and register log
    const rollcall = await ctx.db.query("employeeRollcall")
      .filter(q => q.eq(q.field("employeeId"), args.employeeId))
      .filter(q => q.eq(q.field("registerLogId"), args.registerLogId))
      .first();

    if (!rollcall) {
      return {
        status: "not_marked",
        rollcallId: null,
        currentBreakId: null,
        breakDuration: null,
      };
    }

    // If marked absent, return absent status
    if (rollcall.absentTime) {
      return {
        status: "absent",
        rollcallId: rollcall._id,
        currentBreakId: null,
        breakDuration: null,
        absentTime: rollcall.absentTime,
      };
    }

    // Check for active break
    const activeBreak = await ctx.db.query("attendanceLogs")
      .filter(q => q.eq(q.field("employeeRollcallId"), rollcall._id))
      .filter(q => q.eq(q.field("employeeId"), args.employeeId))
      .filter(q => q.eq(q.field("checkOutTime"), undefined))
      .order("desc")
      .first();

    if (activeBreak) {
      const breakDuration = Date.now() - activeBreak.checkinTime;
      return {
        status: "checkout",
        rollcallId: rollcall._id,
        currentBreakId: activeBreak._id,
        breakDuration,
        checkinTime: activeBreak.checkinTime,
      };
    }

    // If present and no active break, they're working
    if (rollcall.presentTime) {
      return {
        status: "present",
        rollcallId: rollcall._id,
        currentBreakId: null,
        breakDuration: null,
        presentTime: rollcall.presentTime,
        halfDay: rollcall.halfDay || false,
      };
    }

    return {
      status: "not_marked",
      rollcallId: rollcall._id,
      currentBreakId: null,
      breakDuration: null,
    };
  },
});

// Get active attendance logs (currently on break)
export const getActiveAttendanceLogs = query({
  args: {
    registerLogId: v.id("registerLogs"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify access through register log
    const registerLog = await ctx.db.get(args.registerLogId);
    if (!registerLog) {
      return [];
    }

    const register = await ctx.db.get(registerLog.registerId);
    if (!register) {
      return [];
    }

    // Check if user has access (owner or assigned manager)
    const hasAccess = await hasRegisterAccess(ctx, register._id, userId);
    if (!hasAccess) {
      return [];
    }

    // Get all rollcall entries for this register log
    const rollcalls = await ctx.db.query("employeeRollcall")
      .filter(q => q.eq(q.field("registerLogId"), args.registerLogId))
      .collect();

    if (rollcalls.length === 0) {
      return [];
    }

    // Get active attendance logs for all employees
    const activeLogs = await ctx.db.query("attendanceLogs")
      .filter(q => q.eq(q.field("checkOutTime"), undefined))
      .collect();

    // Filter to only include logs for employees in this register log
    const rollcallIds = rollcalls.map(r => r._id.toString());
    const filteredLogs = activeLogs.filter(log =>
      rollcallIds.includes(log.employeeRollcallId.toString())
    );

    // Get employee details for each log
    const logsWithEmployeeDetails = await Promise.all(
      filteredLogs.map(async (log) => {
        const employee = await ctx.db.get(log.employeeId);

        return {
          id: log._id,
          employeeId: log.employeeId,
          employeeName: employee?.name || "Unknown",
          rollcallId: log.employeeRollcallId,
          checkinTime: log.checkinTime,
          duration: Date.now() - log.checkinTime,
        };
      })
    );

    return logsWithEmployeeDetails;
  },
});

// Get attendance logs for an employee for a specific date
export const getEmployeeAttendanceLogs = query({
  args: {
    employeeId: v.id("employees"),
    registerLogId: v.id("registerLogs"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the employee to verify access
    const employee = await ctx.db.get(args.employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    // Verify the register belongs to this user
    const registerLog = await ctx.db.get(args.registerLogId);
    if (!registerLog) {
      throw new Error("Register log not found");
    }

    const register = await ctx.db.get(registerLog.registerId);
    if (!register) {
      throw new Error("Register not found");
    }

    // Check if user has access (owner or assigned manager)
    const hasAccess = await hasRegisterAccess(ctx, register._id, userId);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Get the employee rollcall entry for present time
    const rollcall = await ctx.db.query("employeeRollcall")
      .filter(q => q.eq(q.field("employeeId"), args.employeeId))
      .filter(q => q.eq(q.field("registerLogId"), args.registerLogId))
      .first();

    // Get all attendance logs for this employee on this date
    let attendanceLogs: any[] = [];
    if (rollcall) {
      attendanceLogs = await ctx.db.query("attendanceLogs")
        .filter(q => q.eq(q.field("employeeRollcallId"), rollcall._id))
        .filter(q => q.eq(q.field("employeeId"), args.employeeId))
        .order("asc") // Order by creation time (earliest first)
        .collect();
    }

    return {
      employee: {
        id: employee._id,
        name: employee.name,
        startTime: employee.startTime,
        allowedBreakTime: employee.allowedBreakTime,
      },
      rollcall: {
        presentTime: rollcall?.presentTime,
        absentTime: rollcall?.absentTime,
      },
      registerLog: {
        timestamp: registerLog.timestamp,
      },
      logs: attendanceLogs.map(log => ({
        id: log._id,
        checkinTime: log.checkinTime,
        checkOutTime: log.checkOutTime,
        isActive: log.checkOutTime === undefined,
      })),
    };
  },
});