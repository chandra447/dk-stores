import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from 'recharts';
import { useQueryStates } from 'nuqs';
import { parseAsString } from 'nuqs';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { AttendanceCalendar } from '@/components/dashboard/AttendanceCalendar';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import {
  DashboardEmptyState,
  StatsEmptyState,
  ChartsEmptyState,
  WageTableEmptyState
} from '@/components/dashboard/DashboardEmptyState';
import { LogDrawer } from '@/components/LogDrawer';
import { format as formatDateFns } from 'date-fns';



interface ChartData {
  date: string;
  workDuration: number;
  breakDuration: number;
  totalHours: number;
}

function Dashboard() {
  const { user, isAdmin, isManager } = useAuth();

  // Default date range (current month)
  const defaultDateRange = useMemo<DateRange>(() => ({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  }), []);

  // URL-based filters state
  const [filters, setFilters] = useQueryStates({
    register: parseAsString.withDefault(''),
    employee: parseAsString.withDefault(''),
    fromDate: parseAsString.withDefault(''),
    toDate: parseAsString.withDefault('')
  });

  const { register: selectedRegister, employee: selectedEmployee, fromDate, toDate } = filters;

  // Combine separate date strings into DateRange
  const dateRange: DateRange | undefined = useMemo(() => {
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
        return { from, to };
      }
    }
    return defaultDateRange;
  }, [fromDate, toDate, defaultDateRange]);

  // Initialize date parameters on mount if not set
  useMemo(() => {
    if (!fromDate && !toDate && defaultDateRange.from && defaultDateRange.to) {
      setFilters({
        fromDate: format(defaultDateRange.from, 'yyyy-MM-dd'),
        toDate: format(defaultDateRange.to, 'yyyy-MM-dd')
      });
    }
  }, [fromDate, toDate, setFilters, defaultDateRange]);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedLogParams, setSelectedLogParams] = useState<{
    employeeId: Id<"employees">;
    from: number;
    to: number;
  } | null>(null);

  // Queries
  const registers = useQuery(api.mutations.getAccessibleRegisters) || [];

  const commonArgs = useMemo(() => {
    if (!selectedRegister || !dateRange?.from || !dateRange?.to) return null;

    return {
      registerId: (selectedRegister as Id<"registers">) || undefined,
      employeeId: (selectedEmployee && selectedEmployee !== 'all' ? selectedEmployee : undefined) as Id<"employees"> | undefined,
      startDate: dateRange.from.getTime(),
      endDate: dateRange.to.getTime(),
    };
  }, [selectedRegister, selectedEmployee, dateRange]);

  const statsQueryArgs = commonArgs ? {
    ...commonArgs,
    timezoneOffset: new Date().getTimezoneOffset(),
  } : "skip";

  const chartsQueryArgs = commonArgs ? {
    ...commonArgs,
    timezoneOffset: new Date().getTimezoneOffset(),
  } : "skip";

  const dashboardStats = useQuery(api.dashboard.getDashboardStats, statsQueryArgs);

  const contributionData = useQuery(api.dashboard.getContributionData, chartsQueryArgs) || [];

  const hourlyData = useQuery(api.dashboard.getHourlyData, chartsQueryArgs) || [];

  const employees = useQuery(api.employees.getEmployeesByRegister, {
    registerId: (selectedRegister as Id<"registers">) || undefined,
  }) || [];

  const selectedLogData = useQuery(api.dashboard.getEmployeeLogByTimeRange, selectedLogParams ? selectedLogParams : "skip");

  const stats = dashboardStats || {
    registerDays: 0,
    presentDays: 0,
    halfDays: 0,
    totalHours: 0,
    wageDetails: {
      fullDayWage: 0,
      halfDayWage: 0,
      totalWage: 0
    }
  };

  // Convert hourly data to minutes for chart display
  const chartData = useMemo(() => {
    return hourlyData
      .filter((d: any) => d.totalHours > 0)
      .map((d: any) => ({
        ...d,
        breakDurationMinutes: (d.breakDuration || 0) * 60, // Convert hours to minutes
      }));
  }, [hourlyData]);

  // Calculate adaptive Y-axis domain to accommodate both data and reference line
  const yAxisDomain = useMemo(() => {
    if (!chartData || chartData.length === 0) return [0, 'auto'];

    const maxBreakDuration = Math.max(...chartData.map((d: any) => d.breakDurationMinutes || 0));
    const allowedBreakTime = stats.allowedBreakTimeMinutes || 0;

    // Find the maximum value between actual data and reference line
    const maxValue = Math.max(maxBreakDuration, allowedBreakTime);

    // Add 20% padding on top for better visibility
    const upperBound = Math.ceil(maxValue * 1.2);

    return [0, upperBound];
  }, [chartData, stats.allowedBreakTimeMinutes]);

  const chartConfig = {
    breakDurationMinutes: {
      label: 'Break Duration',
      color: 'var(--accent)',
    },
  } satisfies ChartConfig;

  // Show empty state if no registers exist
  if (registers.length === 0) {
    return <DashboardEmptyState type="no-registers" />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back, {user?.name || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'Admin Dashboard - Manage all registers and employees' :
            isManager ? 'Manager Dashboard - Manage your register' :
              'Dashboard - View your attendance'}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
            {/* Register Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Register</label>
              <Select value={selectedRegister} onValueChange={(value) => setFilters({ register: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select register" />
                </SelectTrigger>
                <SelectContent>
                  {registers.map((register: any) => (
                    <SelectItem key={register._id} value={register._id}>
                      {register.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee</label>
              <Select value={selectedEmployee} onValueChange={(value) => setFilters({ employee: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((employee: any) => (
                    <SelectItem key={employee._id} value={employee._id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(value) => {
                      if (value?.from && value?.to) {
                        setFilters({
                          fromDate: format(value.from, 'yyyy-MM-dd'),
                          toDate: format(value.to, 'yyyy-MM-dd')
                        });
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {(!selectedRegister || !selectedEmployee) ? (
        <StatsEmptyState />
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Register Open Days</CardTitle>
              <CardDescription>Days register was opened</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.registerDays}</div>
              <p className="text-sm text-muted-foreground">
                in selected period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Present Days</CardTitle>
              <CardDescription>Full days marked present</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.presentDays}</div>
              <p className="text-sm text-muted-foreground">
                in selected period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Half Days</CardTitle>
              <CardDescription>Half-day attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats.halfDays}</div>
              <p className="text-sm text-muted-foreground">
                in selected period
              </p>
            </CardContent>
          </Card>

        </div>
      )}

      {/* Contribution Graph */}
      {(!selectedRegister || !selectedEmployee || !contributionData || contributionData.length === 0) ? (
        <ChartsEmptyState title="Attendance Overview" />
      ) : (
        <Card>

          <CardContent>
            <div className="w-full overflow-x-auto">
              <AttendanceCalendar
                data={contributionData?.map((d: any) => ({
                  date: d.date,
                  status: d.count > 0 ? (d.halfDay ? 'half-day' : 'present') : 'absent',
                  intensity: d.intensity,
                  registerLogId: d.registerLogId,
                  employeeId: d.employeeId
                })) || []}
                dateRange={dateRange}
                currentDate={dateRange?.from || new Date()}
                onDayClick={(dayData) => {
                  if (selectedEmployee) {
                    // Calculate local time range for the clicked day
                    // We want to treat YYYY-MM-DD as Local Date
                    // So we construct it explicitly
                    const [year, month, day] = dayData.date.split('-').map(Number);
                    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
                    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

                    setSelectedLogParams({
                      employeeId: selectedEmployee as Id<"employees">,
                      from: startOfDay.getTime(),
                      to: endOfDay.getTime()
                    });
                    setIsDrawerOpen(true);
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hours Worked Chart */}
      {(!selectedRegister || !selectedEmployee || !hourlyData || hourlyData.length === 0) ? (
        <ChartsEmptyState title="Break Time Usage" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Break Time Usage</CardTitle>
            <CardDescription>Daily break time duration compared to allowed limit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
                <BarChart accessibilityLayer data={chartData} margin={{ top: 20 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => format(new Date(value), "dd/MM")}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(value) => format(new Date(value), "MMM dd, yyyy")}
                    formatter={(value: number) => [`${value} min`, 'Break Duration']}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  {/* Add a horizontal reference line for allowed break time */}
                  {stats.allowedBreakTimeMinutes && (
                    <ReferenceLine
                      y={stats.allowedBreakTimeMinutes}
                      stroke="rgb(250, 204, 21)" // Yellow color
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label="Allowed Break Time"
                      isFront
                    />
                  )}
                  <Bar
                    dataKey="breakDurationMinutes"
                    radius={[4, 4, 4, 4]}
                    name="Break Duration"
                    fill="var(--color-breakDurationMinutes)"
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wage Calculation Table */}
      {(!selectedRegister || !selectedEmployee || (stats.presentDays === 0 && stats.halfDays === 0)) ? (
        <WageTableEmptyState />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Wage Calculation</CardTitle>
            <CardDescription>
              Detailed breakdown of wages and break time compliance for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Calculation</TableHead>
                  <TableHead>Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Full Day Wage</TableCell>
                  <TableCell>{stats.presentDays} days × (employee rate)</TableCell>
                  <TableCell className="text-green-600">₹{stats.wageDetails.fullDayWage.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Half Day Wage</TableCell>
                  <TableCell>{stats.halfDays} half days × (employee rate ÷ 2)</TableCell>
                  <TableCell className="text-yellow-600">₹{stats.wageDetails.halfDayWage.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow className="font-semibold border-t bg-muted/50">
                  <TableCell>Total Wages</TableCell>
                  <TableCell>Full Day + Half Day</TableCell>
                  <TableCell className="text-blue-600">₹{stats.wageDetails.totalWage.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

          </CardContent>
        </Card>
      )}


      {/* Log Drawer */}
      <LogDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        employeeName={selectedLogData?.employee.name || ''}
        logs={selectedLogData ? {
          employee: {
            id: selectedLogData.employee._id,
            name: selectedLogData.employee.name,
            startTime: selectedLogData.employee.startTime,
            allowedBreakTime: selectedLogData.employee.allowedBreakTime
          },
          rollcall: {
            presentTime: selectedLogData.rollcall.presentTime,
            absentTime: selectedLogData.rollcall.absentTime
          },
          registerLog: {
            timestamp: selectedLogData.registerLog.timestamp
          },
          logs: selectedLogData.logs.map((log: any) => ({
            id: log.id,
            checkinTime: log.checkinTime,
            checkOutTime: log.checkOutTime,
            isActive: log.isActive
          }))
        } : null}
        formatTime={(minutes) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`}
        formatTimeWithAMPM={(timestamp) => formatDateFns(timestamp, 'h:mm a')}
        formatDate={(timestamp) => formatDateFns(timestamp, 'PPP')}
        formatBreakDuration={(ms) => {
          const minutes = Math.floor(ms / (1000 * 60));
          return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
        }}
        formatTotalDuration={(ms) => {
          const minutes = Math.floor(ms / (1000 * 60));
          return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
        }}
        calculateLateness={(presentTime, shopOpenTime) => {
          return Math.max(0, presentTime - shopOpenTime);
        }}
      />
    </div>
  );
}

export default Dashboard;