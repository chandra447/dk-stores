import { Id } from '../../convex/_generated/dataModel';

export interface EmployeeLogData {
  employee: {
    id: string;
    name: string;
    startTime: number;
    allowedBreakTime: number;
  };
  rollcall: {
    presentTime?: number;
    absentTime?: number;
  };
  registerLog: {
    timestamp: number;
  };
  logs: Array<{
    id: Id<"attendanceLogs">;
    checkinTime: number;
    checkOutTime?: number;
    isActive: boolean;
  }>;
}