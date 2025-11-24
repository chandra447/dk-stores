import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Edit3 } from 'lucide-react';
import { EmployeeLogData } from '../types/logs';
import { BreakGauge } from './BreakGauge';

interface LogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  logs: EmployeeLogData | null;
  formatTime: (minutes: number) => string;
  formatTimeWithAMPM: (timestamp: number) => string;
  formatDate: (timestamp: number) => string;
  formatBreakDuration: (milliseconds: number) => string;
  formatTotalDuration: (totalMilliseconds: number) => string;
  calculateLateness: (presentTime: number, shopOpenTime: number) => number;
}

export function LogDrawer({
  isOpen,
  onClose,
  employeeName,
  logs,
  formatTime,
  formatTimeWithAMPM,
  formatDate,
  formatBreakDuration,
  formatTotalDuration,
  calculateLateness
}: LogDrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Employee Attendance Log</DrawerTitle>
          <DrawerDescription>
            {employeeName} • {logs ? formatDate(logs.registerLog.timestamp) : ''}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {logs && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Start Time</div>
                  <div className="font-medium">{formatTimeWithAMPM(logs.employee.startTime)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Shop Opening Time</div>
                  <div className="font-medium">{formatTimeWithAMPM(logs.registerLog.timestamp)}</div>
                </div>
              </div>

              {/* Break Gauge */}
              <div className="px-1">
                <BreakGauge
                  used={Math.floor(logs.logs.reduce((total, log) => {
                    return total + (log.checkOutTime
                      ? log.checkOutTime - log.checkinTime
                      : Date.now() - log.checkinTime);
                  }, 0) / (1000 * 60))}
                  allowed={logs.employee.allowedBreakTime}
                />
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-3">
                {/* Lateness */}
                {logs.rollcall.presentTime && (
                  <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full text-sm">
                    🕐 {formatBreakDuration(calculateLateness(
                      logs.rollcall.presentTime!,
                      logs.registerLog.timestamp
                    ))} late
                  </div>
                )}

                {/* Total Break Duration */}
                {logs.logs.length > 0 && (
                  <div className="px-3 py-1.5 bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-full text-sm">
                    ☕ Total Break: {formatBreakDuration(
                      logs.logs.reduce((total, log) => {
                        return total + (log.checkOutTime
                          ? log.checkOutTime - log.checkinTime
                          : Date.now() - log.checkinTime);
                      }, 0)
                    )}
                  </div>
                )}
              </div>

              {/* Logs Table */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Break Logs</h3>
                {logs.logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No break logs for this employee today
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium">Checkout Time</th>
                          <th className="text-left p-3 text-sm font-medium">Check-in Time</th>
                          <th className="text-left p-3 text-sm font-medium">Duration</th>
                          <th className="text-left p-3 text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.logs.map((log) => {
                          const duration = log.checkOutTime
                            ? log.checkOutTime - log.checkinTime
                            : Date.now() - log.checkinTime;

                          return (
                            <tr
                              key={log.id}
                              className={`border-b ${log.isActive
                                  ? 'bg-red-50 dark:bg-red-950'
                                  : 'hover:bg-muted/25'
                                }`}
                            >
                              <td className="p-3">
                                {formatTimeWithAMPM(log.checkinTime)}
                                {log.isActive && (
                                  <span className="ml-2 text-xs text-red-600 dark:text-red-400 font-medium">
                                    (ACTIVE)
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                {log.checkOutTime ? formatTimeWithAMPM(log.checkOutTime) : '-'}
                              </td>
                              <td className="p-3">
                                {formatBreakDuration(duration)}
                              </td>
                              <td className="p-3">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}