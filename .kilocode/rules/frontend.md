# Backend Rules (Convex + Convex Auth)

## Auth Configuration
- **Library**: `@convex-dev/auth`.
- **Config**: You MUST use the `Password` provider.
- **Identity**:
  - Admins: `email` is identifier.
  - Managers: `username` is identifier, `pin` is password.

## Schema (convex/schema.ts)
- Import `authTables` from `@convex-dev/auth/server`.
- Define custom tables: `registers`, `employees`, `attendance_logs`.
- Use `v.id()` for referencing other tables.
- **Timestamps**: Store times as `v.number()` (Unix ms).

## Functions
- **Mutations**: Use `ctx.auth.getUserIdentity()` to verify permissions.
- **Logic**:
  - **Creating a Manager**: Requires two steps in one mutation:
    1. Create the Auth User (so they can login).
    2. Create the Employee record (linked to the User ID).
  - **Creating a Staff**: Only creates an Employee record (No Auth User created).