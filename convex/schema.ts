import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * User roles for authentication and authorization
 */
export const UserRole = v.union(
  v.literal("admin"),
  v.literal("manager")
);

export default defineSchema({
  // Authentication tables from @convex-dev/auth
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    role: v.optional(v.union(v.literal("admin"), v.literal("manager"))),
  })
    .index("email", ["email"])
    .index("byRole", ["role"]),

  // Registers table - Physical store locations
  registers: defineTable({
    name: v.string(),                    // Store name (e.g., "Downtown Store")
    address: v.optional(v.string()),       // Physical address
    registerAvatar: v.optional(v.string()),            // Avatar seed for Dicebear API
    ownerId: v.id("users"),               // Shop owner who created this register
    isActive: v.boolean(),                // Whether register is active
    createdAt: v.number(),                // Creation timestamp
    updatedAt: v.number(),                // Last update timestamp
  })
    .index("byOwner", ["ownerId"])               // Get registers by owner
    .index("byActive", ["isActive"]),             // Get active registers

  // Register logs table - Daily shop opening records
  registerLogs: defineTable({
    registerId: v.id("registers"),      // Register reference
    timestamp: v.number(),              // When the shop opened for the day (Unix ms)
    createdBy: v.id("users"),           // Who opened the register
    createdAt: v.number(),              // Creation timestamp
    updatedAt: v.number(),              // Last update timestamp
  })
    .index("byRegisterDate", ["registerId", "timestamp"]) // Get register log by date
    .index("byDate", ["timestamp"]),                 // Get all register logs for a date

  // Employees table - Staff members who work at registers
  employees: defineTable({
    name: v.string(),                    // Employee full name

    // Work schedule
    registerId: v.id("registers"),       // Assigned register
    startTime: v.number(),               // Shift start time (Unix ms from midnight)
    endTime: v.number(),                 // Shift end time (Unix ms from midnight)
    allowedBreakTime: v.number(),         // Allowed break duration in minutes
    ratePerDay: v.number(),               // Daily wage rate

    // Manager settings
    isManager: v.boolean(),               // Whether this employee is a manager
    userId: v.optional(v.id("users")),  // Linked auth user (for managers)
    pin: v.optional(v.string()),          // Manager PIN (hashed)

    // Status
    isActive: v.boolean(),                // Whether employee is active
    createdBy: v.id("users"),           // Who created this employee
    createdAt: v.number(),               // Creation timestamp
    updatedAt: v.number(),               // Last update timestamp
  })
    .index("byRegister", ["registerId"])          // Get employees by register
    .index("byRegisterActive", ["registerId", "isActive"]) // Active employees by register
    .index("byUser", ["userId"])                 // Get employee by auth user ID
    .index("byManager", ["isManager", "isActive"]), // Get active managers

  // Employee rollcall table - Daily attendance marking
  employeeRollcall: defineTable({
    registerLogId: v.id("registerLogs"),  // Register log reference
    employeeId: v.id("employees"),        // Employee reference
    presentTime: v.optional(v.number()),  // When marked present (Unix ms)
    absentTime: v.optional(v.number()),   // When marked absent (Unix ms)
    halfDay: v.optional(v.boolean()),     // Whether this is a half-day attendance
    createdBy: v.id("users"),             // Who created this record
    createdAt: v.number(),                // Creation timestamp
    updatedAt: v.number(),                // Last update timestamp
  })
    .index("byRegisterLog", ["registerLogId"])     // Get rollcall entries for a register log
    .index("byEmployeeDate", ["employeeId", "registerLogId"]) // Get employee's rollcall for a date
    .index("byDate", ["createdAt"]),             // Get all rollcall entries for a date

  // Attendance logs table - Individual break/errand tracking
  attendanceLogs: defineTable({
    employeeRollcallId: v.id("employeeRollcall"), // Rollcall reference
    employeeId: v.id("employees"),                // Employee reference
    checkinTime: v.number(),                      // Break start time (Unix ms)
    checkOutTime: v.optional(v.number()),         // Break end time (Unix ms)
    createdBy: v.id("users"),                     // Who created this log
    createdAt: v.number(),                        // Creation timestamp
    updatedAt: v.number(),                        // Last update timestamp
  })
    .index("byRollcall", ["employeeRollcallId"])     // Get attendance logs for a rollcall entry
    .index("byEmployee", ["employeeId"])             // Get all attendance logs for an employee
    .index("byActiveBreaks", ["checkOutTime"])       // Find currently active breaks (checkOutTime is null)
});