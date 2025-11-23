# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start development server with hot module replacement
npm run build    # Build for production
npm run preview  # Preview production build locally
npm run lint     # Run ESLint checks
```

For Convex backend development:
```bash
npx convex dev    # Start Convex backend in development mode
npx convex deploy # Deploy to production Convex backend
```

## Architecture Overview

This is a full-stack TypeScript attendance management system for DK Store using React + Convex.

### Frontend Architecture
- **React 19.2.0** with TypeScript and Vite build system
- **React Router DOM** for client-side routing with nested layouts
- **shadcn/ui** component library (20+ Radix UI components) with Tailwind CSS
- **Role-based authentication** supporting admin (email/password) and manager (username/PIN) login
- **Protected routes** with `ProtectedRoute.tsx` component

### Backend Architecture
- **Convex** for full-stack database with real-time capabilities
- **@convex-dev/auth** for password-based authentication with role management
- **Schema-driven database** with proper indexing and relationships

### Key Application Structure

**Layout System:**
- `PublicLayout` - Non-authenticated pages (login, about)
- `DashboardLayout` - Authenticated pages with navigation and user menu

**Main Pages:**
- `Login` - Dual authentication flow (admin/manager tabs)
- `Dashboard` - Central hub with real-time statistics and quick actions
- `Registers` - Store location management with employee counts
- `RollcallBoard` - Real-time attendance tracking with employee state management
- `About` - Information page

**Authentication System:**
- `useAuth` hook manages authentication state and role detection
- Supports admin and manager roles with different login flows
- Managers use username + PIN, admins use email + password
- Role-based access control throughout the application

### Database Schema Design

The system uses a sophisticated attendance tracking schema:

1. **Registers** - Physical store locations with operating hours and manager assignments
2. **Employees** - Staff members with work schedules, break allowances, and manager settings
3. **AttendanceLogs** - Daily attendance records with state transitions:
   - States: `present` → `working` → `checked_out` (break) → `absent`
   - Tracks timestamps for each state change
   - Monitors break time allowances and compliance
4. **BreakSessions** - Detailed tracking of individual break sessions

### Component Architecture

- **UI Components**: Located in `src/components/ui/` using Radix UI primitives
- **Layout Components**: Reusable layout wrappers with navigation
- **Page Components**: Feature-complete pages in `src/pages/`
- **Custom Hooks**: Business logic hooks like `useAuth`

### Important Implementation Notes

**Path Aliases**: Use `@/` prefix for imports from `src/` directory (configured in both Vite and TypeScript)

**State Management**:
- Authentication state via Convex Auth context
- Component state with React hooks
- Database state via Convex queries and mutations

**Styling**:
- Tailwind CSS v4 with dark mode support
- shadcn/ui design system patterns
- Mobile-first responsive design

**Type Safety**: Full TypeScript coverage with strict mode enabled

### Current Development Status

The frontend is complete with all pages and components implemented using mock data. The Convex backend schema is defined and authentication is configured, but the actual Convex functions (queries/mutations) need to be implemented for full functionality.

The architecture is designed for real-time synchronization between multiple users viewing the same rollcall board, with proper state management for attendance tracking.