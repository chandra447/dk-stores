# Project Brief: Retail Attendance & Rollcall System

## High-Level Overview
We are building a lightweight, real-time **Single Page Application (SPA)** for tracking retail employee attendance. The system replaces paper rollcall sheets with a digital board that tracks when staff are present, on break ("checked out"), or absent. It is designed to be "mobile-first" for store managers and "admin-first" for business owners.

## Core Goals
1.  **Real-Time Synchronization:** Updates must be instant across all devices (Manager's phone <-> Admin's laptop) without page reloads.
2.  **Frictionless Auth:** Managers must be able to log in quickly using a **Username + PIN** (masked as email/password for the backend).
3.  **Resilience:** The app must handle phone locking/unlocking gracefully, instantly reconnecting and fetching the latest state.
4.  **Zero Maintenance:** Serverless architecture (Convex) to avoid managing backend infrastructure.

## Architecture & Tech Stack
-   **Frontend:** React (Vite) + React Router v6+.
-   **Styling:** Tailwind CSS + DaisyUI.
-   **Backend:** Convex (Database + Serverless Functions).
-   **Authentication:** `@convex-dev/auth` (Convex Auth Beta) using the `Password` provider.
-   **Hosting:** Static SPA hosting (e.g., Netlify/Vercel) + Convex Backend.

## Key Features & Logic
### 1. Authentication Strategy
-   **Admins:** Log in via standard **Email + Password**.
-   **Managers:** Log in via **Username + PIN**.
    -   *Implementation:* Frontend appends a dummy domain (e.g., `@rollcall.local`) to the username to satisfy the backend's email requirement.

### 2. User Roles
-   **Admin:** Full access. Can create Registers (Locations), create Employees, and view all data.
-   **Manager:** Limited access. Can only view the specific `Register` they are assigned to.

### 3. Attendance State Machine
Each employee card on the board follows this strict flow:
-   **State A (Present):** Initial state. User clicks "Present" -> timestamps arrival.
-   **State B (Working):** User is active. Can transition to "Checkout" (Break) or "Absent".
-   **State C (Checked Out):** User is on break. Shows a **live incrementing timer** (duration since checkout). Clicking "Check In" returns to State B.
-   **State D (Absent):** Terminal state for the day (e.g., went home sick).

## Data Model (Mental Map)
-   **Registers:** Physical shop locations.
-   **Users:** Authenticated accounts (Admins & Managers).
-   **Employees:** The staff members being tracked.
    -   *Note:* Some Employees are just names on a list (Staff). Others are also Users (Managers) linked via `userId`.
-   **AttendanceLogs:** Daily records of start/end times and break durations.