import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Home, Coffee, FileText, Edit3 } from 'lucide-react';
import { useMotionValue, useTransform, motion } from 'motion/react';
import { useEffect } from 'react';
import { Employee } from '../types/employee';
import { BreakGauge } from './BreakGauge';

interface EmployeeCardProps {
  employee: Employee & { usedBreakTime?: number };
  todayRegisterLog: any;
  userRole: string | null;
  isToday: boolean;
  onMarkPresent: (employeeId: string, registerLogId: string) => void;
  onMarkAbsent: (employeeId: string, registerLogId: string) => void;
  onStartBreak: (employeeId: string, rollcallId: string) => void;
  onEndBreak: (attendanceLogId: string) => void;
  onReturnFromAbsence: (rollcallId: string) => void;
  onViewLogs: (employee: Employee) => void;
  onEditEmployee: (employee: Employee) => void;
  onMarkHalfDay: (rollcallId: string) => void;
  onRemoveHalfDay: (rollcallId: string) => void;
  formatTimeWithAMPM: (timestamp: number) => string;
}


// Break Timer Component - shows how long employee has been on personal errand
function BreakTimer({ startTime, className = "" }: { startTime: number | null; className?: string }) {
  // Handle invalid values - if no valid start time, don't render anything
  if (!startTime || isNaN(startTime) || startTime < 0) {
    return null;
  }

  const elapsed = useMotionValue(Date.now() - startTime);

  useEffect(() => {
    // Update immediately
    elapsed.set(Date.now() - startTime);

    const interval = setInterval(() => {
      elapsed.set(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, elapsed]);

  const hours = useTransform(elapsed, (value: number) => {
    const safeValue = isNaN(value) || value < 0 ? 0 : value;
    return Math.floor(safeValue / (1000 * 60 * 60));
  });

  const minutes = useTransform(elapsed, (value: number) => {
    const safeValue = isNaN(value) || value < 0 ? 0 : value;
    return Math.floor((safeValue % (1000 * 60 * 60)) / (1000 * 60));
  });

  const seconds = useTransform(elapsed, (value: number) => {
    const safeValue = isNaN(value) || value < 0 ? 0 : value;
    return Math.floor((safeValue % (1000 * 60)) / 1000);
  });


  return (
    <motion.div
      className={`font - mono text - sm ${className} `}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.span className="text-orange-600 dark:text-orange-400">
        <motion.span>{hours}</motion.span>h
        <motion.span className="ml-1">{minutes}</motion.span>m
        <motion.span className="ml-1">{seconds}</motion.span>s
      </motion.span>
    </motion.div>
  );
}

export function EmployeeCard({
  employee,
  todayRegisterLog,
  userRole,
  isToday,
  onMarkPresent,
  onMarkAbsent,
  onStartBreak,
  onEndBreak,
  onReturnFromAbsence,
  onViewLogs,
  onEditEmployee,
  onMarkHalfDay,
  onRemoveHalfDay,
  formatTimeWithAMPM
}: EmployeeCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow relative flex flex-col h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 flex items-center gap-2">
            <CardTitle className="text-xl">
              {employee.name}
            </CardTitle>
            {employee.halfDay && (
              <div className="relative flex h-3 w-3" title="Half Day">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </div>
            )}
          </div>

          {/* Three-dot menu for edit and log options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {userRole !== 'manager' && (
                <DropdownMenuItem onClick={() => onEditEmployee(employee)}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Employee
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onViewLogs(employee)}>
                <FileText className="w-4 h-4 mr-2" />
                View Log
              </DropdownMenuItem>
              {employee.status === 'present' && employee.rollcallId && !employee.halfDay && (
                <DropdownMenuItem onClick={() => onMarkHalfDay(employee.rollcallId!)}>
                  Mark Half Day
                </DropdownMenuItem>
              )}
              {employee.status === 'present' && employee.rollcallId && employee.halfDay && (
                <DropdownMenuItem onClick={() => onRemoveHalfDay(employee.rollcallId!)}>
                  Remove Half Day
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col justify-center">
        {/* Status Badge */}
        <div className="text-center">
          {employee.status === 'present' && (
            <div className="space-y-2">
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                <Home className="w-3 h-3 mr-1" />
                Present
              </Badge>
              {employee.presentTime && (
                <div className="text-sm text-green-600 dark:text-green-400">
                  Present since {formatTimeWithAMPM(employee.presentTime)}
                </div>
              )}
            </div>
          )}
          {employee.status === 'checkout' && (
            <div className="space-y-2">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                <Coffee className="w-3 h-3 mr-1" />
                On Break
              </Badge>
              {employee.breakStartTime && (
                <BreakTimer startTime={employee.breakStartTime} />
              )}
            </div>
          )}
          {employee.status === 'absent' && (
            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
              Absent
            </Badge>
          )}
        </div>
      </CardContent>

      {/* Break Time Gauge */}
      {(employee.status === 'present' || employee.status === 'checkout') && (
        <div className="px-6 pb-4">
          <BreakGauge
            used={Math.floor((employee.usedBreakTime || 0) / (1000 * 60))}
            allowed={employee.allowedBreakTime}
          />
        </div>
      )}

      <CardFooter className="pt-0">
        {/* Action Buttons */}
        <div className="w-full">
          {employee.status === 'not_marked' && todayRegisterLog && (
            <Button
              onClick={() => onMarkPresent(employee.id, todayRegisterLog._id)}
              className="w-full"
              size="sm"
              disabled={!isToday}
            >
              Mark Present
            </Button>
          )}

          {employee.status === 'present' && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => onStartBreak(employee.id, employee.rollcallId!)}
                variant="outline"
                size="sm"
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                disabled={!isToday}
              >
                Check Out
              </Button>
              <Button
                onClick={() => onMarkAbsent(employee.id, todayRegisterLog._id)}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={!isToday}
              >
                Absent
              </Button>
            </div>
          )}

          {employee.status === 'checkout' && employee.currentBreakId && (
            <Button
              onClick={() => onEndBreak(employee.currentBreakId!)}
              className="w-full"
              size="sm"
              variant="outline"
              disabled={!isToday}
            >
              Check In
            </Button>
          )}

          {employee.status === 'absent' && employee.rollcallId && (
            <Button
              onClick={() => onReturnFromAbsence(employee.rollcallId!)}
              className="w-full"
              size="sm"
              variant="outline"
              disabled={!isToday}
            >
              Return to Work
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}