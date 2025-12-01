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
    console.log("🔍 [DEBUG] Searching for manager with name:", name);

    // BYPASS INDEX: Direct scan since index appears to have issues
    console.log("🔍 [DEBUG] Using direct scan (bypassing byRole index)...");
    const allUsers = await ctx.db.query("users").collect();
    console.log("🔍 [DEBUG] Total users in database:", allUsers.length);

    // Filter for manager users manually
    const managerUsers = allUsers.filter(user => {
      const userRole = (user as any).role;
      const isManager = userRole === "manager";
      if (isManager) {
        console.log("✅ [DEBUG] Found manager:", {
          name: user.name,
          email: user.email,
          role: userRole,
          id: user._id
        });
      }
      return isManager;
    });

    console.log("🔍 [DEBUG] Found manager users:", managerUsers.length);

    if (managerUsers.length === 0) {
      console.log("❌ [DEBUG] No manager users found in database");
      return null;
    }

    // Normalize the input name the same way as during account creation
    const normalizedInputName = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    console.log("🔍 [DEBUG] Normalized input name:", normalizedInputName);

    // Try multiple matching strategies
    let matchingManager = null;

    // Strategy 1: Exact match (case-insensitive)
    matchingManager = managerUsers.find(user =>
      user.name?.toLowerCase() === name.toLowerCase()
    );

    if (matchingManager) {
      console.log("✅ [DEBUG] Found exact match:", matchingManager.name);
    } else {
      // Strategy 2: Normalized match (same logic as account creation)
      matchingManager = managerUsers.find(user => {
        const normalizedUserName = user.name?.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        return normalizedUserName === normalizedInputName;
      });

      if (matchingManager) {
        console.log("✅ [DEBUG] Found normalized match:", matchingManager.name);
      } else {
        // Strategy 3: Emergency fallback - check if name is substring of email
        matchingManager = managerUsers.find(user =>
          user.email?.toLowerCase().includes(name.toLowerCase()) ||
          user.name?.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(user.name?.toLowerCase() || '')
        );

        if (matchingManager) {
          console.log("🚨 [EMERGENCY FALLBACK] Found substring match:", matchingManager.name);
        }
      }
    }

    if (!matchingManager) {
      console.log("❌ [DEBUG] No matching manager found for name:", name);
      console.log("🔍 [DEBUG] Available manager names:", managerUsers.map(u => u.name));
      console.log("🔍 [DEBUG] Available manager emails:", managerUsers.map(u => u.email));

      // EMERGENCY FALLBACK: If name is "adi", try to find any user with "adi" in email
      const emergencyMatch = managerUsers.find(user =>
        user.email?.toLowerCase().includes(name.toLowerCase())
      );

      if (emergencyMatch) {
        console.log("🚨 [EMERGENCY FALLBACK] Found emergency match by email:", emergencyMatch.email);
        matchingManager = emergencyMatch;
      } else {
        return null;
      }
    }

    // Verify the user has the required fields
    const userRecord = matchingManager as any;
    if (!userRecord.role || userRecord.role !== "manager") {
      console.log("❌ [DEBUG] Found user but role is not 'manager':", userRecord.role);
      return null;
    }

    if (!userRecord.email) {
      console.log("❌ [DEBUG] Found manager but email is missing");
      return null;
    }

    console.log("✅ [DEBUG] Manager account found successfully:", {
      name: matchingManager.name,
      email: userRecord.email,
      role: userRecord.role
    });

    return {
      email: userRecord.email,
      userId: matchingManager._id,
      name: matchingManager.name
    };
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

// Debug: Get detailed information about manager accounts (admin only)
export const debugManagerAccounts = query({
  args: {
    searchName: v.optional(v.string()),
  },
  handler: async (ctx, { searchName }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Check if current user is admin
    const currentUser = await ctx.db.get(userId);
    if (!currentUser || (currentUser as any).role !== "admin") {
      throw new Error("Only admins can debug manager accounts");
    }

    // Get all users with manager role
    const managerUsers = await ctx.db.query("users")
      .withIndex("byRole", (q) => q.eq("role", "manager"))
      .collect();

    // Get all employees with manager flag
    const managerEmployees = await ctx.db.query("employees")
      .withIndex("byManager", (q) => q.eq("isManager", true).eq("isActive", true))
      .collect();

    // Fetch linked user info for manager employees
    const managerEmployeesWithUsers = await Promise.all(
      managerEmployees.map(async (employee) => {
        const linkedUser = employee.userId ? await ctx.db.get(employee.userId) : null;
        return {
          employeeId: employee._id,
          employeeName: employee.name,
          employeePin: employee.pin,
          userId: employee.userId,
          linkedUser: linkedUser ? {
            id: linkedUser._id,
            name: linkedUser.name,
            email: linkedUser.email,
            role: (linkedUser as any).role
          } : null,
          registerId: employee.registerId,
        };
      })
    );

    // Normalize search name if provided
    let filteredUsers = managerUsers;
    if (searchName) {
      const normalizedSearch = searchName.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
      filteredUsers = managerUsers.filter(user => {
        const normalizedUserName = user.name?.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        return normalizedUserName === normalizedSearch ||
               user.name?.toLowerCase() === searchName.toLowerCase();
      });
    }

    return {
      searchName,
      totalManagerUsers: managerUsers.length,
      totalManagerEmployees: managerEmployees.length,
      filteredUsers: filteredUsers.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: (user as any).role,
        normalizedForLogin: user.name?.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, ''),
      })),
      managerEmployees: managerEmployeesWithUsers,
      recommendations: generateRecommendations(managerUsers, managerEmployeesWithUsers),
    };
  },
});

// Helper function to generate debugging recommendations
function generateRecommendations(managerUsers: any[], managerEmployees: any[]): string[] {
  const recommendations: string[] = [];

  if (managerUsers.length === 0) {
    recommendations.push("❌ No manager users found in users table");
  }

  if (managerEmployees.length === 0) {
    recommendations.push("❌ No manager employees found in employees table");
  }

  // Check for employees without linked users
  const employeesWithoutUsers = managerEmployees.filter(emp => !emp.userId);
  if (employeesWithoutUsers.length > 0) {
    recommendations.push(`⚠️ ${employeesWithoutUsers.length} manager employees without linked user accounts`);
  }

  // Check for users without corresponding employees
  const userIds = new Set(managerEmployees.map(emp => emp.userId).filter(Boolean));
  const usersWithoutEmployees = managerUsers.filter(user => !userIds.has(user._id));
  if (usersWithoutEmployees.length > 0) {
    recommendations.push(`⚠️ ${usersWithoutEmployees.length} manager users without corresponding employee records`);
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ All manager accounts appear to be properly configured");
  }

  return recommendations;
}