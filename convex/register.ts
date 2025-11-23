import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
    if (!register || register.ownerId !== userId || !register.isActive) {
      return null;
    }

    return {
      id: register._id,
      name: register.name,
      address: register.address,
      createdAt: register.createdAt,
    };
  },
});

// Get registers for the current shop owner
export const getMyRegisters = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const registers = await ctx.db.query("registers")
      .filter(q => q.eq(q.field("ownerId"), userId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();

    return registers.map(register => ({
      id: register._id,
      name: register.name,
      address: register.address,
      createdAt: register.createdAt,
    }));
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

    // Verify the register exists and belongs to this user
    const register = await ctx.db.get(args.registerId);
    if (!register || register.ownerId !== userId) {
      throw new Error("Register not found or access denied");
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

    // Verify the register belongs to this user
    const register = await ctx.db.get(args.registerId);
    if (!register || register.ownerId !== userId) {
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

