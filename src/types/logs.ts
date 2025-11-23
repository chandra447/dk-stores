export interface EmployeeLogData {
  employee: {
    id: string;
    name: string;
    startTime: number;
  };
  rollcall: {
    presentTime?: number;
    absentTime?: number;
  };
  registerLog: {
    timestamp: number;
  };
  logs: Array<{
    id: string;
    checkinTime: number;
    checkOutTime?: number;
    isActive: boolean;
  }>;
}