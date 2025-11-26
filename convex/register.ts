import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper function to generate random avatar seed
function generateRandomAvatarSeed(): string {
  const randomNames = [
    'Liam', 'Olivia', 'Noah', 'Emma', 'Oliver', 'Charlotte', 'James', 'Amelia',
    'Elijah', 'Sophia', 'William', 'Isabella', 'Henry', 'Ava', 'Lucas', 'Mia',
    'Benjamin', 'Evelyn', 'Theodore', 'Harper', 'Alexander', 'Emily', 'Daniel',
    'Madison', 'Matthew', 'Abigail', 'Jackson', 'Sophia', 'David', 'Elizabeth'
  ];
  return randomNames[Math.floor(Math.random() * randomNames.length)];
}

// Helper function to check if user has access to a register (either as owner or assigned manager)
export async function hasRegisterAccess(ctx: any, registerId: any, userId: any): Promise<boolean> {
  // Check if user is the owner
  const register = await ctx.db.get(registerId);
  if (register && register.ownerId === userId) {
    return true;
  }

  // Check if user is a manager assigned to this register
  const managerEmployee = await ctx.db.query("employees")
    .withIndex("byUser", (q: any) => q.eq("userId", userId))
    .filter((q: any) => q.eq(q.field("isManager"), true))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .first();

  return managerEmployee !== null && managerEmployee.registerId === registerId;
}

// Helper function to get start of day timestamp
export function getStartOfDay(date: Date = new Date()): number {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay.getTime();
}

// Helper function to get end of day timestamp
export function getEndOfDay(date: Date = new Date()): number {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime();
}

// Create a new register (store) for shop owner
export const createRegister = mutation({
  args: {
    name: v.string(),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to create a register");
    }

    // Create the register record
    const registerId = await ctx.db.insert("registers", {
      name: args.name,
      address: args.address,
      registerAvatar: generateRandomAvatarSeed(), // Store generated avatar seed
      ownerId: userId, // Shop owner creates this register
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return registerId;
  },
});

// Get a specific register by ID
export const getRegister = query({
  args: {
    id: v.id("registers"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const register = await ctx.db.get(args.id);
    if (!register || !register.isActive) {
      return null;
    }

    // Check if user has access (owner or assigned manager)
    const hasAccess = await hasRegisterAccess(ctx, args.id, userId);
    if (!hasAccess) {
      return null;
    }

    return {
      id: register._id,
      name: register.name,
      address: register.address,
      registerAvatar: register.registerAvatar,
      createdAt: register.createdAt,
    };
  },
});

// Get registers for the current shop owner or manager
export const getMyRegisters = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get registers owned by this user (admin/owner) - FIXED: Only show owned registers
    const ownedRegisters = await ctx.db.query("registers")
      .filter(q => q.eq(q.field("ownerId"), userId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();

    // If user owns registers, return those
    if (ownedRegisters.length > 0) {
      return ownedRegisters.map(register => ({
        id: register._id,
        name: register.name,
        address: register.address,
        registerAvatar: register.registerAvatar,
        createdAt: register.createdAt,
      }));
    }

    // Check if user is a manager and get their assigned register
    const managerEmployee = await ctx.db.query("employees")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .filter(q => q.eq(q.field("isManager"), true))
      .filter(q => q.eq(q.field("isActive"), true))
      .first();

    if (managerEmployee && managerEmployee.registerId) {
      const assignedRegister = await ctx.db.get(managerEmployee.registerId);

      if (assignedRegister && assignedRegister.isActive) {
        // Calculate break time usage for the manager
        let usedBreakTime = 0;
        const now = Date.now();
        const startOfDay = getStartOfDay(new Date(now));
        const endOfDay = getEndOfDay(new Date(now));

        // Get today's register log
        const registerLog = await ctx.db.query("registerLogs")
          .filter(q => q.eq(q.field("registerId"), assignedRegister._id))
          .filter(q => q.gte(q.field("timestamp"), startOfDay))
          .filter(q => q.lte(q.field("timestamp"), endOfDay))
          .first();

        if (registerLog) {
          // Get rollcall for this employee
          const rollcall = await ctx.db.query("employeeRollcall")
            .withIndex("byEmployeeDate", (q) =>
              q.eq("employeeId", managerEmployee._id).eq("registerLogId", registerLog._id)
            )
            .first();

          if (rollcall) {
            // Get attendance logs (breaks)
            const breaks = await ctx.db.query("attendanceLogs")
              .withIndex("byRollcall", (q) => q.eq("employeeRollcallId", rollcall._id))
              .collect();

            // Calculate total break time
            usedBreakTime = breaks.reduce((total, log) => {
              const endTime = log.checkOutTime || now;
              return total + (endTime - log.checkinTime);
            }, 0);
          }
        }

        return [{
          id: assignedRegister._id,
          name: assignedRegister.name,
          address: assignedRegister.address,
          registerAvatar: assignedRegister.registerAvatar,
          createdAt: assignedRegister.createdAt,
          breakTimeInfo: {
            allowed: managerEmployee.allowedBreakTime || 0, // in minutes
            used: Math.floor(usedBreakTime / (1000 * 60)) // convert ms to minutes
          }
        }];
      }
    }

    // No registers found for this user
    return [];
  },
});

// Start register for the day
export const startRegister = mutation({
  args: {
    registerId: v.id("registers"),
    openingTime: v.optional(v.number()), // Custom opening time, defaults to now
    clientLocalStartOfDay: v.optional(v.number()), // Client's local start of day in milliseconds
    clientLocalEndOfDay: v.optional(v.number()), // Client's local end of day in milliseconds
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to start a register");
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
      const now = new Date();
      startOfDay = getStartOfDay(now);
      endOfDay = getEndOfDay(now);
    }

    // Check if register is already started for this date range
    const existingLog = await ctx.db.query("registerLogs")
      .filter(q => q.eq(q.field("registerId"), args.registerId))
      .filter(q => q.gte(q.field("timestamp"), startOfDay))
      .filter(q => q.lte(q.field("timestamp"), endOfDay))
      .first();

    if (existingLog) {
      // Update existing log with new opening time if provided
      if (args.openingTime && args.openingTime !== existingLog.timestamp) {
        await ctx.db.patch(existingLog._id, {
          timestamp: args.openingTime,
          updatedAt: Date.now(),
        });
        return existingLog._id;
      }
      return existingLog._id; // Return existing log if no update needed
    }

    // Create new register log for this date range
    const registerLogId = await ctx.db.insert("registerLogs", {
      registerId: args.registerId,
      timestamp: args.openingTime || Date.now(),
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return registerLogId;
  },
});

// Get today's register log for a register
export const getTodayRegisterLog = query({
  args: {
    registerId: v.id("registers"),
    clientLocalStartOfDay: v.optional(v.number()), // Client's local start of day in milliseconds
    clientLocalEndOfDay: v.optional(v.number()), // Client's local end of day in milliseconds
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Verify the register exists and user has access
    const register = await ctx.db.get(args.registerId);
    if (!register) {
      return null;
    }

    // Check if user has access (owner or assigned manager)
    const hasAccess = await hasRegisterAccess(ctx, args.registerId, userId);
    if (!hasAccess) {
      return null;
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

    const registerLog = await ctx.db.query("registerLogs")
      .filter(q => q.eq(q.field("registerId"), args.registerId))
      .filter(q => q.gte(q.field("timestamp"), startOfDay))
      .filter(q => q.lte(q.field("timestamp"), endOfDay))
      .first();

    return registerLog;
  },
});

// Get all registers accessible to the current user (for dashboard - admin/owner only)
export const getAccessibleRegisters = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get registers owned by this user (admin/owner)
    const registers = await ctx.db.query("registers")
      .filter(q => q.and(
        q.eq(q.field("ownerId"), userId),
        q.eq(q.field("isActive"), true)
      ))
      .collect();

    return registers.map(register => ({
      _id: register._id,
      name: register.name,
      address: register.address,
    }));
  },
});


