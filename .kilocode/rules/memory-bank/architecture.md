# System Architecture

## High-Level Architecture
This is a **serverless full-stack application** with a clear separation between frontend and backend:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Convex       │    │   Convex Auth   │
│   (React SPA)   │◄──►│   Backend       │◄──►│   Service       │
│                 │    │                 │    │                 │
│ - React 19      │    │ - Database      │    │ - Password      │
│ - React Router  │    │ - Functions     │    │   Provider      │
│ - daisyUI       │    │ - Real-time     │    │                 │
│ - Tailwind      │    │   Sync          │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Frontend Architecture
### Component Structure
```
src/
├── components/          # Reusable UI components
│   ├── AttendanceBoard/ # Main attendance dashboard
│   ├── EmployeeCard/    # Individual employee status cards
│   ├── LoginForm/       # Authentication forms
│   └── common/         # Shared UI elements
├── pages/              # Route-level components
│   ├── Dashboard/      # Main dashboard for managers
│   ├── Admin/          # Admin interface
│   └── Auth/           # Login/register pages
├── hooks/              # Custom React hooks
│   ├── useAuth.js      # Authentication state
│   ├── useRealtime.js  # Real-time subscriptions
│   └── useAttendance.js # Attendance logic
├── services/           # API and external services
│   ├── convex.js       # Convex client setup
│   └── auth.js         # Authentication helpers
└── utils/              # Utility functions
    ├── time.js         # Time formatting helpers
    └── validation.js   # Form validation
```

### State Management
- **Local State:** React `useState` for component-level state
- **Global State:** React Context for authentication and user session
- **Server State:** Convex `useQuery` and `useMutation` hooks for data synchronization
- **Real-time Updates:** Convex subscriptions for live attendance updates

## Backend Architecture (Convex)
### Database Schema Design
```typescript
// Main tables
- users              // Authenticated users (admins, managers)
- registers          // Physical store locations  
- employees          // Staff members being tracked
- attendance_logs    // Daily attendance records

// Relationships
users 1:N registers    (manager assigned to register)
registers 1:N employees (employees work at register)
employees 1:N attendance_logs (daily records)
users 1:1 employees    (managers are also employees)
```

### Function Architecture
```
convex/
├── schema.ts          // Database schema definition
├── auth/             // Authentication functions
│   ├── login.ts       // User login logic
│   ├── register.ts    // User registration
│   └── session.ts    // Session management
├── registers/        // Register management
│   ├── create.ts     // Create new register
│   ├── list.ts       // List user's registers
│   └── assign.ts     // Assign manager to register
├── employees/        // Employee management
│   ├── create.ts     // Add new employee
│   ├── list.ts       // List employees by register
│   └── update.ts     // Update employee details
├── attendance/       // Attendance tracking
│   ├── checkIn.ts    // Check in employee
│   ├── checkOut.ts   // Check out for break
│   ├── endDay.ts     // End work day
│   └── status.ts     // Get current status
└── realtime/         // Real-time subscriptions
    ├── board.ts       // Live attendance board
    └── timers.ts      // Break timer updates
```

## Authentication Architecture
### User Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Login Page    │───►│  Auth Service   │───►│  Convex Auth    │
│                 │    │                 │    │                 │
│ - Email/Pass    │    │ - Format        │    │ - Validate      │
│ - Username/PIN  │    │ - Validate      │    │ - Create Token  │
│ - Role Detect   │    │ - Role Check    │    │ - Return User   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Role-Based Access Control
- **Admin:** Full system access, can manage all registers and employees
- **Manager:** Limited to assigned register only, can manage attendance for their location
- **Authentication:** All protected routes require valid session

## Real-Time Architecture
### Attendance State Machine
```
Present ──click──► Working ──checkout──► Checked Out
   │                    │                    │
   │                    │                 checkIn
   │                    │                    │
   └─────absent─────────┴────────────────────┘
```

### Real-Time Updates
- **Convex Subscriptions:** Live updates when attendance status changes
- **Optimistic Updates:** UI updates immediately, syncs with backend
- **Conflict Resolution:** Backend state always wins, UI reconciles automatically

## Deployment Architecture
### Frontend Deployment
- **Platform:** Netlify, Vercel, or similar static hosting
- **Build Process:** `npm run build` creates optimized SPA
- **Environment Variables:** Convex deployment URL and auth keys

### Backend Deployment
- **Platform:** Convex (serverless)
- **Automatic Scaling:** Handles load automatically
- **Data Persistence:** Managed by Convex, no maintenance required

## Security Architecture
### Authentication Security
- **Password Hashing:** Handled by Convex Auth
- **Session Management:** JWT tokens with secure storage
- **Role Validation:** Server-side permission checks on all mutations

### Data Security
- **Input Validation:** All user inputs validated using Convex schemas
- **Permission Checks:** Role-based access control on all operations
- **HTTPS Only:** All communication encrypted in transit

## Performance Considerations
### Frontend Optimizations
- **Code Splitting:** React Router lazy loading for large pages
- **Asset Optimization:** Vite handles bundling and minification
- **Caching:** Service worker for offline capability (future enhancement)

### Backend Optimizations
- **Indexing:** Strategic database indexes for common queries
- **Subscription Efficiency:** Minimal data transfer for real-time updates
- **Function Optimization:** Efficient Convex function design

## Development Workflow
### Local Development
```
Terminal 1: npm run dev          # Frontend dev server
Terminal 2: npx convex dev       # Backend dev server
```

### Code Organization
- **Feature-Based:** Group related files together
- **Type Safety:** TypeScript throughout the stack
- **Testing:** Unit tests for utilities, integration tests for user flows