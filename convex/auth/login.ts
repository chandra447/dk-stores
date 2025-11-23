import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const login = mutation({
  args: {
    identifier: v.string(),
    password: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager")),
  },
  handler: async (ctx, { identifier, password, role }) => {
    // Convert username to email format for managers
    let email = identifier;
    if (role === "manager" && !email.includes("@")) {
      email = `${identifier}@rollcall.local`;
    }

    // Get user from auth tables using email index
    const user = await ctx.db.query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    return {
      email,
      userId: user._id,
      name: user.name,
    };
  },
});

export const logout = mutation({
  handler: async (ctx) => {
    // This will be handled by frontend auth context
    return { success: true };
  },
});

export const getCurrentUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    // Get user details from database
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
    };
  },
});