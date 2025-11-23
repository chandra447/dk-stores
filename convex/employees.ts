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

        if (rollcall) {
          halfDay = rollcall.halfDay || false;

          if (rollcall.absentTime) {
            status = "absent";
            absentTime = rollcall.absentTime;
          } else if (rollcall.presentTime) {
            presentTime = rollcall.presentTime;

            // Check for active break
            const activeBreak = await ctx.db.query("attendanceLogs")
              .filter(q => q.eq(q.field("employeeRollcallId"), rollcall._id))
              .filter(q => q.eq(q.field("employeeId"), employee._id))
              .filter(q => q.eq(q.field("checkOutTime"), undefined))
              .order("desc")
              .first();

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

