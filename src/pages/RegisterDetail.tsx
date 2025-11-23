import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Users, Plus, Clock, Store, Coffee, Home, Calendar, Search } from 'lucide-react';
import { EmployeeCard } from '../components/EmployeeCard';
import { LogDrawer } from '../components/LogDrawer';
import { EmployeeDialog } from '../components/EmployeeDialog';

import { Employee, EmployeeFilter, CreateEmployeeFormData, EditEmployeeFormData } from '../types/employee';

function RegisterDetail() {
  const { id } = useParams<{ id: string }>();

  // Helper function to get start of day in local timezone
  const getStartOfDayLocal = (date: Date = new Date()): number => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay.getTime();
  };

  // Helper function to get end of day in local timezone
  const getEndOfDayLocal = (date: Date = new Date()): number => {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime();
  };

  // Get client's local date range
  const clientLocalStartOfDay = getStartOfDayLocal();
  const clientLocalEndOfDay = getEndOfDayLocal();

  // Queries for register info and employee status
  const registerId = id as Id<"registers">;
  
  const registerArgs = registerId ? { id: registerId } : "skip";
  const register = useQuery(api.register.getRegister, registerArgs);

  const logArgs = registerId ? {
    registerId: registerId,
    clientLocalStartOfDay,
    clientLocalEndOfDay
  } : "skip";
  const todayRegisterLog = useQuery(api.register.getTodayRegisterLog, logArgs);

  const employeesArgs = registerId ? {
    registerId: registerId,
    clientLocalStartOfDay,
    clientLocalEndOfDay
  } : "skip";
  const employees = useQuery(api.mutations.getEmployeesWithStatus, employeesArgs);
  const userRole = useQuery(api.auth.users.getUserRole);

  // Simple check: only use register log if it exists (backend will handle date logic)
  const todayRegister = todayRegisterLog;

  
  // Mutations
  const createEmployee = useMutation(api.mutations.createEmployee);
  const startRegister = useMutation(api.mutations.startRegister);
  const markPresent = useMutation(api.mutations.markEmployeePresent);
  const markAbsent = useMutation(api.mutations.markEmployeeAbsent);
  const startBreak = useMutation(api.mutations.startEmployeeBreak);
  const endBreak = useMutation(api.mutations.endEmployeeBreak);
  const returnFromAbsence = useMutation(api.mutations.returnFromAbsence);
  const markHalfDay = useMutation(api.mutations.markHalfDay);
  const updateEmployee = useMutation(api.employees.updateEmployee);
  const createManagerAuthAccount = useAction(api.employees.createManagerAuthAccount);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<EmployeeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Employee logs query (declared after state to avoid hoisting issues)
  const employeeLogs = useQuery(api.attendance.getEmployeeAttendanceLogs,
    viewingEmployee && todayRegister ?
      { employeeId: viewingEmployee.id as any, registerLogId: todayRegister._id as any } :
      "skip"
  );

  // Type guard to safely cast employees from backend
  const typedEmployees = employees?.map(emp => ({
    ...emp,
    status: emp.status as Employee['status'], // Safe cast since backend should return valid status
    rollcallId: emp.rollcallId as string | null,
    currentBreakId: emp.currentBreakId as string | null,
    breakDuration: emp.breakDuration as number | null,
    presentTime: emp.presentTime as number | null,
    absentTime: emp.absentTime as number | null,
    halfDay: emp.halfDay as boolean | undefined,
  }));

  const [formData, setFormData] = useState<CreateEmployeeFormData>({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    breakHours: '0',
    breakMinutes: '30',
    ratePerDay: '500',
    isManager: false,
    pin: '',
  });

  const [editFormData, setEditFormData] = useState<EditEmployeeFormData>({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    breakHours: '0',
    breakMinutes: '30',
    ratePerDay: '500',
    isManager: false,
    pin: '',
  });

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const calculateBreakTime = (hours: string, minutes: string): number => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    return (h * 60) + m;
  };

  const minutesToHoursAndMinutes = (totalMinutes: number): { hours: string; minutes: string } => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours: hours.toString(), minutes: minutes.toString() };
  };

  
  const formatTimeFromTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeWithAMPM = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatBreakDuration = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}hr ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTotalDuration = (totalMilliseconds: number): string => {
    const totalSeconds = Math.floor(totalMilliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const calculateLateness = (presentTime: number, shopOpenTime: number): number => {
    return Math.max(0, presentTime - shopOpenTime);
  };

  // Attendance action handlers
  const handleStartRegister = async () => {
    if (!registerId) {
      setError('Register ID not found');
      return;
    }
    try {
      await startRegister({
        registerId: registerId,
        clientLocalStartOfDay,
        clientLocalEndOfDay
      });

      // The register should be started now, let the component re-render automatically
      // The todayRegisterLog query should update on its own due to Convex reactivity
    } catch (err: any) {
      setError(err.message || 'Failed to start register');
    }
  };

  const handleMarkPresent = async (employeeId: string, registerLogId: string) => {
    try {
      await markPresent({ employeeId: employeeId as any, registerLogId: registerLogId as any });
    } catch (err: any) {
      setError(err.message || 'Failed to mark present');
    }
  };

  const handleMarkAbsent = async (employeeId: string, registerLogId: string) => {
    try {
      await markAbsent({ employeeId: employeeId as any, registerLogId: registerLogId as any });
    } catch (err: any) {
      setError(err.message || 'Failed to mark absent');
    }
  };

  const handleStartBreak = async (employeeId: string, rollcallId: string) => {
    try {
      await startBreak({ employeeId: employeeId as any, rollcallId: rollcallId as any });
    } catch (err: any) {
      setError(err.message || 'Failed to start break');
    }
  };

  const handleEndBreak = async (attendanceLogId: string) => {
    try {
      await endBreak({ attendanceLogId: attendanceLogId as any });
    } catch (err: any) {
      setError(err.message || 'Failed to end break');
    }
  };

  const handleReturnFromAbsence = async (rollcallId: string) => {
    try {
      await returnFromAbsence({ rollcallId: rollcallId as any });
    } catch (err: any) {
      setError(err.message || 'Failed to return from absence');
    }
  };

  const handleMarkHalfDay = async (rollcallId: string) => {
    try {
      await markHalfDay({ rollcallId: rollcallId as any });
    } catch (err: any) {
      setError(err.message || 'Failed to mark half day');
    }
  };

  const handleViewLogs = (employee: Employee) => {
    setViewingEmployee(employee);
    setIsLogDrawerOpen(true);
    setError('');
  };

  // Edit employee handlers
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);

    // Convert break time to hours and minutes
    const { hours, minutes } = minutesToHoursAndMinutes(employee.allowedBreakTime);

    setEditFormData({
      name: employee.name,
      startTime: formatTime(employee.startTime),
      endTime: formatTime(employee.endTime),
      breakHours: hours,
      breakMinutes: minutes,
      ratePerDay: employee.ratePerDay.toString(),
      isManager: employee.isManager,
      pin: '', // Don't pre-fill PIN for security
    });

    setIsEditDialogOpen(true);
    setError('');
  };

  const handleEditInputChange = (field: keyof EditEmployeeFormData, value: string | boolean) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    setError('');

    if (!editFormData.name.trim()) {
      setError('Employee name is required');
      return;
    }

    if (editFormData.isManager && !editFormData.pin.trim()) {
      setError('Manager PIN is required for manager employees');
      return;
    }

    if (editFormData.pin && editFormData.pin.length !== 4) {
      setError('Manager PIN must be 4 digits');
      return;
    }

    if (!editFormData.ratePerDay || parseFloat(editFormData.ratePerDay) <= 0) {
      setError('Daily rate is required and must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      const breakTime = calculateBreakTime(editFormData.breakHours, editFormData.breakMinutes);

      await updateEmployee({
        employeeId: editingEmployee.id as any,
        name: editFormData.name.trim(),
        startTime: timeToMinutes(editFormData.startTime),
        endTime: timeToMinutes(editFormData.endTime),
        allowedBreakTime: breakTime,
        ratePerDay: parseFloat(editFormData.ratePerDay),
        isManager: editFormData.isManager,
        pin: editFormData.isManager && editFormData.pin ? editFormData.pin : undefined,
      });

      // Close dialog and reset editing state
      setIsEditDialogOpen(false);
      setEditingEmployee(null);
      setEditFormData({
        name: '',
        startTime: '09:00',
        endTime: '17:00',
        breakHours: '0',
        breakMinutes: '30',
        ratePerDay: '500',
        isManager: false,
        pin: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update employee');
    } finally {
      setLoading(false);
    }
  };

  // Filter employees based on selected filter
  const filteredEmployees = typedEmployees?.filter(employee => {
    if (searchQuery && !employee.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'present') return employee.status === 'present';
    if (selectedFilter === 'checkout') return employee.status === 'checkout';
    if (selectedFilter === 'absent') return employee.status === 'absent' || employee.status === 'not_marked';
    return true;
  }) || [];

  const handleInputChange = (field: keyof CreateEmployeeFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleCreateEmployee = async () => {
    setError('');

    if (!formData.name.trim()) {
      setError('Employee name is required');
      return;
    }

    if (formData.isManager && !formData.pin.trim()) {
      setError('Manager PIN is required for manager employees');
      return;
    }

    if (formData.pin && formData.pin.length !== 4) {
      setError('Manager PIN must be 4 digits');
      return;
    }

    if (!formData.ratePerDay || parseFloat(formData.ratePerDay) <= 0) {
      setError('Daily rate is required and must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      const breakTime = calculateBreakTime(formData.breakHours, formData.breakMinutes);

      const employeeId = await createEmployee({
        name: formData.name.trim(),
        registerId: registerId,
        startTime: timeToMinutes(formData.startTime),
        endTime: timeToMinutes(formData.endTime),
        allowedBreakTime: breakTime,
        ratePerDay: parseFloat(formData.ratePerDay),
        isManager: formData.isManager,
        pin: formData.isManager ? formData.pin : undefined,
      });

      // If this is a manager, create the auth account
      if (formData.isManager && formData.pin) {
        try {
          const result = await createManagerAuthAccount({
            employeeId: employeeId,
            name: formData.name.trim(),
            pin: formData.pin,
          });
          
          if (result && result.email) {
            toast.success('Manager account created!', {
              description: (
                <div className="mt-2 space-y-1">
                  <p><strong>Username:</strong> {result.email}</p>
                  <p><strong>PIN:</strong> {formData.pin}</p>
                  <p className="text-xs text-muted-foreground mt-2">Please share these credentials with the manager.</p>
                </div>
              ),
              duration: 10000, // Show for 10 seconds
            });
          }
          
          console.log(`Manager auth account created for ${formData.name.trim()}`);
        } catch (authError: any) {
          console.error('Failed to create manager auth account:', authError);
          toast.error('Failed to create manager login', {
            description: authError.message
          });
        }
      } else {
        toast.success('Employee created successfully');
      }

      // Reset form and close dialog
      setFormData({
        name: '',
        startTime: '09:00',
        endTime: '17:00',
        breakHours: '0',
        breakMinutes: '30',
        ratePerDay: '500',
        isManager: false,
        pin: '',
      });
      setIsCreateDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (employees === undefined || todayRegisterLog === undefined) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading employees...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" className='hover:bg-primary rounded-b-md bg-accent p-2 sm:p-3' asChild>
              <Link to="/registers">
                <ArrowLeft className="font-semibold" size={32} sm:size={48} strokeWidth={3}/>
              </Link>
            </Button>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Store className="w-6 h-6 sm:w-8 sm:h-8" />
                {register?.name || 'Store'} Employees
              </h1>

            </div>
          </div>

          {/* Create Employee Button */}
          <Button
        className="flex items-center gap-2 w-full sm:w-auto"
        onClick={() => setIsCreateDialogOpen(true)}
      >
        <Plus className="w-4 h-4" />
        Add Employee
      </Button>
      <EmployeeDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateEmployee}
        title="Add New Employee"
        description="Add a new employee to this store. Managers will need a 4-digit PIN for login."
        formData={formData}
        onInputChange={handleInputChange}
        loading={loading}
        error={error}
        submitText="Add Employee"
      />

        {/* Edit Employee Dialog */}
      <EmployeeDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingEmployee(null);
          setError('');
        }}
        onSubmit={handleUpdateEmployee}
        title="Edit Employee"
        formData={editFormData}
        onInputChange={handleEditInputChange}
        loading={loading}
        error={error}
        submitText="Update Employee"
      />
    </div>

    <Separator />

        {/* Register Status - Only show when register is started */}
        {todayRegister && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <Clock className="w-4 h-4" />
                Opened at {formatTimeFromTimestamp(todayRegister.timestamp)}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <Calendar className="w-4 h-4" />
                {new Date(todayRegister.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Badge>
            </div>
          </div>
        )}

    <Separator />

        {/* Employee Filters and Search */}
        {todayRegister && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedFilter('all')}
                size="sm"
              >
                All ({employees?.length || 0})
              </Button>
              <Button
                variant={selectedFilter === 'present' ? 'default' : 'outline'}
                onClick={() => setSelectedFilter('present')}
                size="sm"
              >
                <Home className="w-4 h-4 mr-1" />
                Present ({employees?.filter(e => e.status === 'present').length || 0})
              </Button>
              <Button
                variant={selectedFilter === 'checkout' ? 'default' : 'outline'}
                onClick={() => setSelectedFilter('checkout')}
                size="sm"
              >
                <Coffee className="w-4 h-4 mr-1" />
                On Break ({employees?.filter(e => e.status === 'checkout').length || 0})
              </Button>
              <Button
                variant={selectedFilter === 'absent' ? 'default' : 'outline'}
                onClick={() => setSelectedFilter('absent')}
                size="sm"
              >
                Absent ({employees?.filter(e => e.status === 'absent' || e.status === 'not_marked').length || 0})
              </Button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}
      </div>

      {/* Employees Grid */}
      {!todayRegister ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Register not started</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Start the register to begin managing employee attendance.
          </p>
          <Button onClick={handleStartRegister} disabled={loading} className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            {loading ? 'Starting...' : 'Start Register'}
          </Button>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No employees yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Add your first employee to start managing attendance for this store.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Your First Employee
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              todayRegisterLog={todayRegister}
              userRole={userRole}
              onMarkPresent={handleMarkPresent}
              onMarkAbsent={handleMarkAbsent}
              onStartBreak={handleStartBreak}
              onEndBreak={handleEndBreak}
              onReturnFromAbsence={handleReturnFromAbsence}
              onViewLogs={handleViewLogs}
              onEditEmployee={handleEditEmployee}
              onMarkHalfDay={handleMarkHalfDay}
              formatTimeWithAMPM={formatTimeWithAMPM}
            />
          ))}
        </div>
      )}

        {/* Log Drawer */}
        <LogDrawer
          isOpen={isLogDrawerOpen}
          onClose={() => setIsLogDrawerOpen(false)}
          employeeName={viewingEmployee?.name || ''}
          logs={employeeLogs || null}
          formatTime={formatTime}
          formatTimeWithAMPM={formatTimeWithAMPM}
          formatDate={formatDate}
          formatBreakDuration={formatBreakDuration}
          formatTotalDuration={formatTotalDuration}
          calculateLateness={calculateLateness}
        />
    </div>
  );
}

export default RegisterDetail;