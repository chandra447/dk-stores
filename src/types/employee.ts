export interface Employee {
  id: string;
  name: string;
  isManager: boolean;
  startTime: number;
  endTime: number;
  allowedBreakTime: number;
  ratePerDay: number;
  createdAt: number;
  // New status fields
  status: 'not_marked' | 'present' | 'checkout' | 'absent' | 'register_not_started';
  rollcallId?: string | null;
  currentBreakId?: string | null;
  breakDuration?: number | null;
  breakStartTime?: number | null;
  presentTime?: number | null;
  absentTime?: number | null;
  halfDay?: boolean;
}

export type EmployeeFilter = 'all' | 'present' | 'checkout' | 'absent';

export interface CreateEmployeeFormData {
  name: string;
  startTime: string;
  endTime: string;
  breakHours: string;
  breakMinutes: string;
  ratePerDay: string;
  isManager: boolean;
  pin: string;
}

export interface EditEmployeeFormData {
  name: string;
  startTime: string;
  endTime: string;
  breakHours: string;
  breakMinutes: string;
  ratePerDay: string;
  isManager: boolean;
  pin: string;
}