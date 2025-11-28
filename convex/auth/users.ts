import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Internal mutation to link an employee to a user account
export const linkEmployeeToUser = internalMutation({
  args: {
    employeeId: v.id("employees"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.employeeId, {
      userId: args.userId,
      updatedAt: Date.now(),
    });
  },
});

// Query to find manager account by name for login purposes
export const findManagerAccountByName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, { name }) => {
    // Search for users with manager role using the index
    const managerUsers = await ctx.db.query("users")
      .withIndex("byRole", (q) => q.eq("role", "manager"))
      .collect();

    // Find the user that matches the name (case-insensitive)
    const matchingManager = managerUsers.find(user =>
      user.name?.toLowerCase() === name.toLowerCase()
    );

    return matchingManager ? {
      email: matchingManager.email,
      userId: matchingManager._id,
      name: matchingManager.name
    } : null;
  },
});

// Create a new admin user
export const createAdmin = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, { email, password, name }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Check if current user is admin
    const currentUser = await ctx.db.get(userId);
    if (!currentUser || (currentUser as any).role !== "admin") {
      throw new Error("Only admins can create users");
    }

    // Check if user already exists
    const existingUser = await ctx.db.query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Create new user
    const newUserId = await ctx.db.insert("users", {
      email,
      name,
      // Password will be hashed by Convex Auth
    });

    return { 
      success: true, 
      userId: newUserId,
      message: "Admin user created successfully" 
    };
  },
});

// Create a new manager user
export const createManager = mutation({
  args: {
    username: v.string(), // Manager username (without @rollcall.local)
    pin: v.string(), // Manager PIN
    name: v.string(),
    registerId: v.id("registers"), // Assign to specific register
  },
  handler: async (ctx, { username, pin, name, registerId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Check if current user is admin
    const currentUser = await ctx.db.get(userId);
    if (!currentUser || (currentUser as any).role !== "admin") {
      throw new Error("Only admins can create managers");
    }

    // Convert username to email format
    const email = `${username}@rollcall.local`;

    // Check if user already exists
    const existingUser = await ctx.db.query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      throw new Error("Manager already exists");
    }

    // Verify register exists
    const register = await ctx.db.get(registerId);
    if (!register) {
      throw new Error("Register not found");
    }

    // Create new user
    const newUserId = await ctx.db.insert("users", {
      email,
      name,
    });

    // Create employee record for the manager
    await ctx.db.insert("employees", {
      name,
      registerId,
      isManager: true,
      userId: newUserId,
      pin, // Store PIN (should be hashed in production)
      startTime: 9 * 60, // 9:00 AM in minutes from midnight
      endTime: 17 * 60, // 5:00 PM in minutes from midnight
      allowedBreakTime: 60, // 60 minutes break time
      ratePerDay: 800, // Default rate for managers
      isActive: true,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { 
      success: true, 
      userId: newUserId,
      message: "Manager created successfully" 
    };
  },
});

// Get all users (admin only)
export const getAllUsers = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Check if current user is admin
    const currentUser = await ctx.db.get(userId);
    if (!currentUser || (currentUser as any).role !== "admin") {
      throw new Error("Only admins can view all users");
    }

    const users = await ctx.db.query("users").collect();
    return users;
  },
});

// Check if user has specific role
export const hasRole = query({
  args: {
    requiredRole: v.union(v.literal("admin"), v.literal("manager")),
  },
  handler: async (ctx, { requiredRole }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return false;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return false;
    }

    const userRole = (user as any).role;
    return userRole === requiredRole;
  },
});

// Get current user's profile
export const getCurrentUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: (user as any).role,
    };
  },
});

// Get user's role
export const getUserRole = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    return (user as any).role;
  },
});

// Check if an email is already registered (public query for signup validation)
export const checkEmailExists = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    // Check if user exists with this email
    const existingUser = await ctx.db.query("users")
      .withIndex("email", (q) => q.eq("email", email.toLowerCase()))
      .first();

    return { exists: !!existingUser };
  },
});