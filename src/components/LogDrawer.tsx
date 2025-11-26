import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Edit3, Save, X } from 'lucide-react';
import { EmployeeLogData } from '../types/logs';
import { BreakGauge } from './BreakGauge';
import { TimeInput, validateTimePair } from './ui/time-input';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useState, useEffect } from 'react';

interface LogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  logs: EmployeeLogData | null;
  formatTimeWithAMPM: (timestamp: number) => string;
  formatDate: (timestamp: number) => string;
  formatBreakDuration: (milliseconds: number) => string;
  calculateLateness: (presentTime: number, shopOpenTime: number) => number;
}

export function LogDrawer({
  isOpen,
  onClose,
  employeeName,
  logs,
  formatTimeWithAMPM,
  formatDate,
  formatBreakDuration,
  calculateLateness
}: LogDrawerProps) {
  const updateAttendanceLog = useMutation(api.attendance.updateAttendanceLog);

  // State for editing functionality
  const [editingLogId, setEditingLogId] = useState<Id<"attendanceLogs"> | null>(null);
  const [editForm, setEditForm] = useState({
    checkinTime: '',
    checkOutTime: ''
  });
  const [editTimestamps, setEditTimestamps] = useState({
    checkinTimestamp: 0,
    checkoutTimestamp: 0
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({
    checkin: '',
    checkout: '',
    general: ''
  });

  // Reset editing state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setEditingLogId(null);
      setEditForm({ checkinTime: '', checkOutTime: '' });
      setEditTimestamps({ checkinTimestamp: 0, checkoutTimestamp: 0 });
      setErrors({ checkin: '', checkout: '', general: '' });
    }
  }, [isOpen]);

  // Check if the register log is from today
  const isToday = logs ? formatDate(logs.registerLog.timestamp) === formatDate(Date.now()) : false;

  // Start editing a log
  const startEditing = (log: EmployeeLogData['logs'][0]) => {
    // Only allow editing for today's logs
    if (!isToday) {
      setErrors(prev => ({
        ...prev,
        general: 'Only today\'s attendance logs can be edited'
      }));
      return;
    }

    setEditingLogId(log.id);
    setEditForm({
      checkinTime: log.checkinTime.toString(),
      checkOutTime: log.checkOutTime ? log.checkOutTime.toString() : ''
    });
    setEditTimestamps({
      checkinTimestamp: log.checkinTime,
      checkoutTimestamp: log.checkOutTime || 0
    });
    setErrors({ checkin: '', checkout: '', general: '' });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingLogId(null);
    setEditForm({ checkinTime: '', checkOutTime: '' });
    setEditTimestamps({ checkinTimestamp: 0, checkoutTimestamp: 0 });
    setErrors({ checkin: '', checkout: '', general: '' });
  };

  // Handle form field changes
  const handleFieldChange = (field: 'checkinTime' | 'checkOutTime', value: string, timestamp?: number) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    if (timestamp) {
      setEditTimestamps(prev => ({
        ...prev,
        [field === 'checkinTime' ? 'checkinTimestamp' : 'checkoutTimestamp']: timestamp
      }));
    }

    // Clear specific field error when user starts typing
    setErrors(prev => ({ ...prev, [field === 'checkinTime' ? 'checkin' : 'checkout']: '' }));
  };

  // Save edited log
  const saveLog = async () => {
    if (!editingLogId) return;

    // Validation
    const newErrors = { checkin: '', checkout: '', general: '' };

    if (!editTimestamps.checkinTimestamp) {
      newErrors.checkin = 'Check-in time is required';
    }

    if (editTimestamps.checkoutTimestamp && !editTimestamps.checkinTimestamp) {
      newErrors.general = 'Cannot set check-out time without valid check-in time';
    }

    // Validate time pair if both are set
    if (editTimestamps.checkinTimestamp && editTimestamps.checkoutTimestamp) {
      const pairError = validateTimePair(editTimestamps.checkinTimestamp, editTimestamps.checkoutTimestamp);
      if (pairError) {
        newErrors.general = pairError;
      }
    }

    setErrors(newErrors);

    if (newErrors.checkin || newErrors.checkout || newErrors.general) {
      return;
    }

    setIsSaving(true);
    try {
      await updateAttendanceLog({
        attendanceLogId: editingLogId,
        checkinTime: editTimestamps.checkinTimestamp,
        checkOutTime: editTimestamps.checkoutTimestamp || undefined
      });

      // Reset editing state on success
      setEditingLogId(null);
      setEditForm({ checkinTime: '', checkOutTime: '' });
      setEditTimestamps({ checkinTimestamp: 0, checkoutTimestamp: 0 });
      setErrors({ checkin: '', checkout: '', general: '' });
    } catch (error: any) {
      setErrors(prev => ({ ...prev, general: error.message || 'Failed to update log' }));
    } finally {
      setIsSaving(false);
    }
  };
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
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Break Logs</h3>
                  {!isToday && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Historical View
                    </div>
                  )}
                </div>

                {/* General Error Display */}
                {errors.general && (
                  <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
                  </div>
                )}

                {/* Date restriction notice */}
                {!isToday && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      <strong>Historical Data:</strong> Only today's attendance logs can be edited. These logs are preserved for record-keeping.
                    </p>
                  </div>
                )}
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
                          const isEditing = editingLogId === log.id;

                          return (
                            <tr
                              key={log.id}
                              className={`border-b ${isEditing
                                  ? 'bg-blue-50 dark:bg-blue-950'
                                  : log.isActive
                                    ? 'bg-red-50 dark:bg-red-950'
                                    : 'hover:bg-muted/25'
                                }`}
                            >
                              <td className="p-3">
                                {isEditing ? (
                                  <div className="min-w-[220px]">
                                    <TimeInput
                                      value={editTimestamps.checkinTimestamp || undefined}
                                      onChange={(value, timestamp) => handleFieldChange('checkinTime', value, timestamp)}
                                      placeholder="Check-in time"
                                      error={errors.checkin}
                                      required
                                    />
                                  </div>
                                ) : (
                                  <>
                                    {formatTimeWithAMPM(log.checkinTime)}
                                    {log.isActive && (
                                      <span className="ml-2 text-xs text-red-600 dark:text-red-400 font-medium">
                                        (ACTIVE)
                                      </span>
                                    )}
                                  </>
                                )}
                              </td>
                              <td className="p-3">
                                {isEditing ? (
                                  <div className="min-w-[220px]">
                                    <TimeInput
                                      value={editTimestamps.checkoutTimestamp || undefined}
                                      onChange={(value, timestamp) => handleFieldChange('checkOutTime', value, timestamp)}
                                      placeholder="Check-out time"
                                      error={errors.checkout}
                                    />
                                  </div>
                                ) : (
                                  log.checkOutTime ? formatTimeWithAMPM(log.checkOutTime) : '-'
                                )}
                              </td>
                              <td className="p-3">
                                {formatBreakDuration(duration)}
                              </td>
                              <td className="p-3">
                                {isEditing ? (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={saveLog}
                                      disabled={isSaving}
                                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                    >
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={cancelEditing}
                                      disabled={isSaving}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="relative group">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditing(log)}
                                      disabled={!isToday}
                                      className={`h-8 w-8 p-0 ${!isToday ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                    {!isToday && (
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        Only today's logs can be edited
                                      </div>
                                    )}
                                  </div>
                                )}
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