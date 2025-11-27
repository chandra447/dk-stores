import { v } from "convex/values";
import { mutation, query, action, internalMutation, ActionCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getStartOfDay, getEndOfDay, hasRegisterAccess } from "./register";
import { createAccount } from "@convex-dev/auth/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Create a new employee record for a register
export const createEmployee = mutation({
  args: {
    name: v.string(),
    registerId: v.id("registers"),
    startTime: v.number(), // Shift start time (minutes from midnight)
    endTime: v.number(),   // Shift end time (minutes from midnight)
    allowedBreakTime: v.number(), // Allowed break duration in minutes
    ratePerDay: v.number(), // Daily wage rate
    isManager: v.boolean(), // Whether this employee is a manager
    pin: v.optional(v.string()), // Manager PIN (only if isManager is true)
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to create an employee");
    }

    // Verify the register exists and belongs to this user
    const register = await ctx.db.get(args.registerId);
    if (!register) {
      throw new Error("Register not found");
    }

    if (register.ownerId !== userId) {
      throw new Error("You don't have permission to add employees to this register");
    }

    // If this is a manager, ensure PIN is provided
    if (args.isManager && !args.pin) {
      throw new Error("Manager PIN is required for manager employees");
    }

    // Create the employee record
    const employeeId = await ctx.db.insert("employees", {
      name: args.name,
      registerId: args.registerId,
      startTime: args.startTime,
      endTime: args.endTime,
      allowedBreakTime: args.allowedBreakTime,
      ratePerDay: args.ratePerDay,
      isManager: args.isManager,
      userId: undefined, // Employees don't have user accounts by default
      pin: args.pin, // Store PIN for managers (in production, hash this)
      isActive: true,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // If this is a manager, create a corresponding auth account
    // Note: This is handled by the client calling createManagerAuthAccount action
    // after this mutation returns the employeeId

    return employeeId;
  },
});

// Create auth account for a manager employee
export const createManagerAuthAccount = action({
  args: {
    employeeId: v.id("employees"),
    name: v.string(),
    pin: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<{ success: boolean; userId: Id<"users">; email: string }> => {
    try {
      // Generate unique email for manager account using name and part of employeeId
      // Format: name.last4ofID@rollcall.local
      const idSuffix = args.employeeId.slice(-4);
      const cleanName = args.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
      const managerEmail = `${cleanName}.${idSuffix}@rollcall.local`;

      // Create Convex auth account for the manager
      const { user } = await createAccount(ctx, {
        provider: "password",
        account: {
          id: managerEmail,
          secret: args.pin
        },
        profile: {
          name: args.name,
          email: managerEmail,
          role: "manager"
        }
      });

      // Link the employee record to the new user account
      // @ts-ignore
      const linkMutation = internal.auth.users.linkEmployeeToUser;
      await (ctx as any).runMutation(linkMutation, {
        employeeId: args.employeeId,
        userId: user._id,
      });

      return { success: true, userId: user._id, email: managerEmail };
    } catch (error: any) {
      throw new Error(`Failed to create manager auth account: ${error.message}`);
    }
  },
});

// Get employees for a specific register
export const getRegisterEmployees = query({
  args: {
    registerId: v.id("registers"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify the register exists and user has access
    const register = await ctx.db.get(args.registerId);
    if (!register) {
      throw new Error("Register not found");
    }

    // Check if user has access (owner or assigned manager)
    const hasAccess = await hasRegisterAccess(ctx, args.registerId, userId);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const employees = await ctx.db.query("employees")
      .filter(q => q.eq(q.field("registerId"), args.registerId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();

    return employees.map(employee => ({
      id: employee._id,
      name: employee.name,
      isManager: employee.isManager,
      startTime: employee.startTime,
      endTime: employee.endTime,
      allowedBreakTime: employee.allowedBreakTime,
      ratePerDay: employee.ratePerDay,
      createdAt: employee.createdAt,
    }));
  },
});

// Get employees with their status for a register
export const getEmployeesWithStatus = query({
  args: {
    registerId: v.id("registers"),
    clientLocalStartOfDay: v.optional(v.number()), // Client's local start of day in milliseconds
    clientLocalEndOfDay: v.optional(v.number()), // Client's local end of day in milliseconds
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify the register exists and user has access
    const register = await ctx.db.get(args.registerId);
    if (!register) {
      throw new Error("Register not found");
    }

    // Check if user has access (owner or assigned manager)
    const hasAccess = await hasRegisterAccess(ctx, args.registerId, userId);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Use client's local date range if provided, otherwise use server's date
    let startOfDay: number;
    let endOfDay: number;

    if (args.clientLocalStartOfDay && args.clientLocalEndOfDay) {
      startOfDay = args.clientLocalStartOfDay;
      endOfDay = args.clientLocalEndOfDay;
    } else {
      startOfDay = getStartOfDay();
      endOfDay = getEndOfDay();
    }

    const todayRegisterLog = await ctx.db.query("registerLogs")
      .filter(q => q.eq(q.field("registerId"), args.registerId))
      .filter(q => q.gte(q.field("timestamp"), startOfDay))
      .filter(q => q.lte(q.field("timestamp"), endOfDay))
      .first();

    if (!todayRegisterLog) {
      // Return employees with no status (register not started)
      const employees = await ctx.db.query("employees")
        .filter(q => q.eq(q.field("registerId"), args.registerId))
        .filter(q => q.eq(q.field("isActive"), true))
        .collect();

      return employees.map(employee => ({
        id: employee._id,
        name: employee.name,
        isManager: employee.isManager,
        startTime: employee.startTime,
        endTime: employee.endTime,
        allowedBreakTime: employee.allowedBreakTime,
        ratePerDay: employee.ratePerDay,
        createdAt: employee.createdAt,
        status: "register_not_started",
        rollcallId: null,
        currentBreakId: null,
        breakDuration: null,
        breakStartTime: null,
        presentTime: null,
        absentTime: null,
        halfDay: false,
      }));
    }

    // Get employees for this register
    const employees = await ctx.db.query("employees")
      .filter(q => q.eq(q.field("registerId"), args.registerId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();

    // Get status for each employee
    const employeesWithStatus = await Promise.all(
      employees.map(async (employee) => {
        const rollcall = await ctx.db.query("employeeRollcall")
          .filter(q => q.eq(q.field("employeeId"), employee._id))
          .filter(q => q.eq(q.field("registerLogId"), todayRegisterLog._id))
          .first();

        let status = "not_marked";
        let rollcallId = rollcall?._id || null;
        let currentBreakId = null;
        let breakDuration = null;
        let breakStartTime = null;
        let presentTime = null;
        let absentTime = null;
        let halfDay = false;

        let usedBreakTime = 0;

        if (rollcall) {
          halfDay = rollcall.halfDay || false;

          // Calculate total used break time from all logs
          const allBreaks = await ctx.db.query("attendanceLogs")
            .filter(q => q.eq(q.field("employeeRollcallId"), rollcall._id))
            .collect();

          usedBreakTime = allBreaks.reduce((total, log) => {
            const endTime = log.checkOutTime || Date.now();
            return total + (endTime - log.checkinTime);
          }, 0);

          if (rollcall.absentTime) {
            status = "absent";
            absentTime = rollcall.absentTime;
          } else if (rollcall.presentTime) {
            presentTime = rollcall.presentTime;

            // Check for active break
            const activeBreak = allBreaks.find(log => !log.checkOutTime);

            if (activeBreak) {
              status = "checkout";
              currentBreakId = activeBreak._id;
              breakDuration = Date.now() - activeBreak.checkinTime;
              breakStartTime = activeBreak.checkinTime;
            } else {
              status = "present";
            }
          }
        }

        return {
          id: employee._id,
          name: employee.name,
          isManager: employee.isManager,
          startTime: employee.startTime,
          endTime: employee.endTime,
          allowedBreakTime: employee.allowedBreakTime,
          ratePerDay: employee.ratePerDay,
          createdAt: employee.createdAt,
          status,
          rollcallId,
          currentBreakId,
          breakDuration,
          breakStartTime,
          presentTime,
          absentTime,
          halfDay,
          usedBreakTime, // Add this field
        };
      })
    );

    return employeesWithStatus;
  },
});

// Update an existing employee record
export const updateEmployee = mutation({
  args: {
    employeeId: v.id("employees"),
    name: v.string(),
    startTime: v.number(), // Shift start time (minutes from midnight)
    endTime: v.number(),   // Shift end time (minutes from midnight)
    allowedBreakTime: v.number(), // Allowed break duration in minutes
    ratePerDay: v.number(), // Daily wage rate
    isManager: v.boolean(), // Whether this employee is a manager
    pin: v.optional(v.string()), // Manager PIN (only if isManager is true and updating PIN)
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to update an employee");
    }

    // Get the existing employee
    const employee = await ctx.db.get(args.employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    // Verify the register exists and belongs to this user
    const register = await ctx.db.get(employee.registerId);
    if (!register) {
      throw new Error("Register not found");
    }

    if (register.ownerId !== userId) {
      throw new Error("You don't have permission to update employees in this register");
    }

    // If this is a manager, ensure PIN is provided or keep existing
    let finalPin = employee.pin; // Keep existing PIN by default
    if (args.isManager && args.pin) {
      // Update PIN only if a new one is provided
      finalPin = args.pin;
    } else if (args.isManager && !employee.pin) {
      throw new Error("Manager PIN is required for manager employees");
    } else if (!args.isManager) {
      // Remove PIN if no longer a manager
      finalPin = undefined;
    }

    // Note: Auth account changes for managers should be handled separately
    // This mutation only handles the basic employee record
    if (args.isManager !== employee.isManager || finalPin !== employee.pin) {
      if (args.isManager && !employee.isManager) {
        // Employee became a manager - auth account creation should be handled via action
        console.log(`Employee ${args.name} is now a manager - auth account creation needed via action`);
      } else if (!args.isManager && employee.isManager) {
        // Manager became regular employee - auth account remains but could be deactivated
        console.log(`Manager ${args.name} is no longer a manager - auth account preserved`);
      } else if (args.isManager && employee.isManager && finalPin !== employee.pin) {
        // Manager PIN changed - credentials update should be handled via action
        console.log(`Manager PIN changed - credentials update needed via action`);
      } else if (args.isManager && args.name !== employee.name) {
        // Manager name changed - profile update should be handled via action
        console.log(`Manager name changed from ${employee.name} to ${args.name}`);
      }
    }

    // Update the employee record
    await ctx.db.patch(args.employeeId, {
      name: args.name,
      startTime: args.startTime,
      endTime: args.endTime,
      allowedBreakTime: args.allowedBreakTime,
      ratePerDay: args.ratePerDay,
      isManager: args.isManager,
      pin: finalPin,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Employee updated successfully" };
  },
});

// Helper function to check if employee is currently active (present/working)
export const getEmployeeActiveStatus = query({
  args: {
    employeeId: v.id("employees"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the employee
    const employee = await ctx.db.get(args.employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    // Verify register access
    const hasAccess = await hasRegisterAccess(ctx, employee.registerId, userId);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Get current date range (server's date)
    const startOfDay = getStartOfDay();
    const endOfDay = getEndOfDay();

    // Find today's register log for the employee's register
    const todayRegisterLog = await ctx.db.query("registerLogs")
      .filter(q => q.eq(q.field("registerId"), employee.registerId))
      .filter(q => q.gte(q.field("timestamp"), startOfDay))
      .filter(q => q.lte(q.field("timestamp"), endOfDay))
      .first();

    if (!todayRegisterLog) {
      return { isActive: false, status: "register_not_started" };
    }

    // Get today's rollcall for this employee
    const rollcall = await ctx.db.query("employeeRollcall")
      .filter(q => q.eq(q.field("employeeId"), args.employeeId))
      .filter(q => q.eq(q.field("registerLogId"), todayRegisterLog._id))
      .first();

    if (!rollcall || !rollcall.presentTime) {
      return { isActive: false, status: "not_marked" };
    }

    if (rollcall.absentTime) {
      return { isActive: false, status: "absent" };
    }

    // Check for active break
    const activeBreak = await ctx.db.query("attendanceLogs")
      .filter(q => q.eq(q.field("employeeRollcallId"), rollcall._id))
      .filter(q => q.eq(q.field("checkOutTime"), undefined))
      .first();

    if (activeBreak) {
      return { isActive: true, status: "on_break" };
    }

    return { isActive: true, status: "working" };
  },
});

// Delete an employee with cascading deletion (admin only)
export const deleteEmployee = mutation({
  args: {
    employeeId: v.id("employees"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to delete an employee");
    }

    // Verify current user is admin
    const currentUser = await ctx.db.get(userId);
    if (!currentUser || (currentUser as any).role === "manager") {
      throw new Error("Only admins can delete employees");
    }

    // Get the employee to delete
    const employee = await ctx.db.get(args.employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    // Verify register access (admin should have access to all registers)
    const hasAccess = await hasRegisterAccess(ctx, employee.registerId, userId);
    if (!hasAccess) {
      throw new Error("You don't have permission to delete employees in this register");
    }

    // Check if employee is currently active (duplicate logic from getEmployeeActiveStatus query)
    // Get current date range (server's date)
    const startOfDay = getStartOfDay();
    const endOfDay = getEndOfDay();

    // Find today's register log for the employee's register
    const todayRegisterLog = await ctx.db.query("registerLogs")
      .filter(q => q.eq(q.field("registerId"), employee.registerId))
      .filter(q => q.gte(q.field("timestamp"), startOfDay))
      .filter(q => q.lte(q.field("timestamp"), endOfDay))
      .first();

    if (todayRegisterLog) {
      // Get today's rollcall for this employee
      const rollcall = await ctx.db.query("employeeRollcall")
        .filter(q => q.eq(q.field("employeeId"), args.employeeId))
        .filter(q => q.eq(q.field("registerLogId"), todayRegisterLog._id))
        .first();

      if (rollcall && rollcall.presentTime && !rollcall.absentTime) {
        // Check for active break
        const activeBreak = await ctx.db.query("attendanceLogs")
          .filter(q => q.eq(q.field("employeeRollcallId"), rollcall._id))
          .filter(q => q.eq(q.field("checkOutTime"), undefined))
          .first();

        if (activeBreak) {
          throw new Error("Cannot delete employee while they are on break. Please wait until they are checked in.");
        }

        throw new Error("Cannot delete employee while they are working. Please wait until they are checked out.");
      }
    }

    try {
      // 1. Get all rollcall entries for this employee
      const rollcallEntries = await ctx.db.query("employeeRollcall")
        .filter(q => q.eq(q.field("employeeId"), args.employeeId))
        .collect();

      // 2. Delete all attendance logs for this employee (cascade through rollcall entries)
      for (const rollcall of rollcallEntries) {
        const attendanceLogs = await ctx.db.query("attendanceLogs")
          .filter(q => q.eq(q.field("employeeRollcallId"), rollcall._id))
          .collect();

        for (const log of attendanceLogs) {
          await ctx.db.delete(log._id);
        }
      }

      // 3. Delete all rollcall entries for this employee
      for (const rollcall of rollcallEntries) {
        await ctx.db.delete(rollcall._id);
      }

      // 4. Delete auth account if this employee is a manager
      if (employee.isManager && employee.userId) {
        // Note: Convex Auth doesn't provide a direct way to delete auth accounts
        // We'll delete the user record from our users table
        // The actual auth session cleanup will be handled by the system
        try {
          await ctx.db.delete(employee.userId);
        } catch (error) {
          // Log error but continue with employee deletion
          console.warn(`Warning: Could not delete auth account for employee ${employee.name}:`, error);
        }
      }

      // 5. Finally delete the employee record
      await ctx.db.delete(args.employeeId);

      return {
        success: true,
        message: `Employee "${employee.name}" has been successfully deleted. All attendance records and related data have been removed.`
      };

    } catch (error) {
      console.error("Error deleting employee:", error);
      throw new Error(`Failed to delete employee: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

// Get employees by register (for dashboard filters)
export const getEmployeesByRegister = query({
  args: {
    registerId: v.optional(v.id("registers")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    let employees: any[] = [];

    if (args.registerId) {
      // Check access to the register
      const hasAccess = await hasRegisterAccess(ctx, args.registerId, userId);
      if (!hasAccess) {
        return [];
      }

      employees = await ctx.db.query("employees")
        .filter(q => q.and(
          q.eq(q.field("registerId"), args.registerId),
          q.eq(q.field("isActive"), true)
        ))
        .collect();
    } else {
      // Get employees for all registers the user has access to
      const user = await ctx.db.query("users").filter(q => q.eq(q.field("_id"), userId)).first();
      if (!user) {
        return [];
      }

      if (user.role === "admin") {
        // Admin can see all employees
        employees = await ctx.db.query("employees")
          .filter(q => q.eq(q.field("isActive"), true))
          .collect();
      } else {
        // Manager - get employees from their assigned register
        const managerEmployee = await ctx.db.query("employees")
          .withIndex("byUser", (q) => q.eq("userId", userId))
          .filter(q => q.and(
            q.eq(q.field("isManager"), true),
            q.eq(q.field("isActive"), true)
          ))
          .first();

        if (managerEmployee && managerEmployee.registerId) {
          employees = await ctx.db.query("employees")
            .filter(q => q.and(
              q.eq(q.field("registerId"), managerEmployee.registerId),
              q.eq(q.field("isActive"), true)
            ))
            .collect();
        }
      }
    }

    return employees.map(employee => ({
      _id: employee._id,
      name: employee.name,
      ratePerDay: employee.ratePerDay,
    }));
  },
});

