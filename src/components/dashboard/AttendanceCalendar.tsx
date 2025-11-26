import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, eachMonthOfInterval, isSameMonth, isAfter, isBefore, addMonths, subMonths } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AttendanceCalendarProps {
    data: {
        date: string;
        status: 'present' | 'absent' | 'half-day' | 'holiday' | 'weekend';
        intensity?: number;
        registerLogId?: string;
        employeeId?: string;
        checkIn?: string;
        checkOut?: string;
    }[];
    dateRange?: DateRange;
    currentDate?: Date; // Keep for backward compatibility
    onDayClick?: (dayData: any) => void;
}

export function AttendanceCalendar({ data, dateRange, currentDate, onDayClick }: AttendanceCalendarProps) {
    // Determine the target date - prefer dateRange.from over currentDate for backward compatibility
    const targetDate = dateRange?.from || currentDate || new Date();
    
    // Get all months in the range for navigation bounds
    const monthsInRange = useMemo(() => {
        if (dateRange?.from && dateRange?.to) {
            return eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
        }
        return [startOfMonth(targetDate)];
    }, [dateRange, targetDate]);

    // Current visible month state
    const [currentMonth, setCurrentMonth] = useState(() => {
        if (dateRange?.from) {
            return startOfMonth(dateRange.from);
        }
        return startOfMonth(targetDate);
    });

    // Update current month when dateRange changes
    useMemo(() => {
        if (dateRange?.from) {
            const newMonth = startOfMonth(dateRange.from);
            setCurrentMonth(newMonth);
        }
    }, [dateRange?.from]);

    const getDayStatus = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayData = data.find(d => d.date === dateStr);

        if (dayData) return dayData;

        const dayOfWeek = getDay(date);
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return { status: 'weekend' as const, date: dateStr };
        }

        return { status: 'absent' as const, date: dateStr };
    };

    const getStatusStyle = (dayData: any) => {
        const { status, intensity } = dayData;

        if (status === 'present') {
            // Use intensity to calculate opacity/shade
            // Base color is green-500 (#22c55e)
            // We can use opacity or different shades. Opacity is easier to implement dynamically.
            // Ensure minimum opacity so it's visible.
            const opacity = Math.max(0.3, intensity || 1);
            return {
                backgroundColor: `rgba(34, 197, 94, ${opacity})`, // green-500 with opacity
                color: intensity && intensity < 0.5 ? 'black' : 'white'
            };
        }

        switch (status) {
            case 'half-day': return { backgroundColor: '#eab308', color: 'white' }; // yellow-500
            case 'absent': return { backgroundColor: '#fee2e2', color: '#ef4444' }; // red-100, red-500
            case 'weekend': return { backgroundColor: '#f3f4f6', color: '#9ca3af' }; // gray-100, gray-400
            case 'holiday': return { backgroundColor: '#dbeafe', color: '#3b82f6' }; // blue-100, blue-500
            default: return { backgroundColor: '#f9fafb' }; // gray-50
        }
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Navigation functions
    const goToPreviousMonth = () => {
        const prevMonth = subMonths(currentMonth, 1);
        if (dateRange?.from && !isBefore(prevMonth, startOfMonth(dateRange.from))) {
            setCurrentMonth(prevMonth);
        }
    };

    const goToNextMonth = () => {
        const nextMonth = addMonths(currentMonth, 1);
        if (dateRange?.to && !isAfter(nextMonth, startOfMonth(dateRange.to))) {
            setCurrentMonth(nextMonth);
        }
    };

    // Check if navigation is possible
    const canGoPrevious = dateRange?.from ? !isBefore(subMonths(currentMonth, 1), startOfMonth(dateRange.from)) : true;
    const canGoNext = dateRange?.to ? !isAfter(addMonths(currentMonth, 1), startOfMonth(dateRange.to)) : true;

    const formatDateRange = () => {
        if (dateRange?.from && dateRange?.to) {
            if (isSameMonth(dateRange.from, dateRange.to)) {
                return format(dateRange.from, 'MMMM yyyy');
            }
            return `${format(dateRange.from, 'MMM yyyy')} - ${format(dateRange.to, 'MMM yyyy')}`;
        }
        return format(targetDate, 'MMMM yyyy');
    };

    // Generate calendar days for current month
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startDay = getDay(start);
    const emptyDays = Array(startDay).fill(null);

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Attendance Calendar</CardTitle>
                        <CardDescription>{formatDateRange()}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToPreviousMonth}
                            disabled={!canGoPrevious}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm font-medium min-w-[120px] text-center">
                            {format(currentMonth, 'MMM yyyy')}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={goToNextMonth}
                            disabled={!canGoNext}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-7 gap-2 mb-4">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-sm font-medium text-muted-foreground">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {emptyDays.map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {days.map(day => {
                        const dayData = getDayStatus(day);
                        const isToday = isSameDay(day, new Date());
                        const style = getStatusStyle(dayData);
                        
                        // Skip days outside the date range
                        if (dateRange?.from && day < dateRange.from) return null;
                        if (dateRange?.to && day > dateRange.to) return null;

                        return (
                            <TooltipProvider key={day.toISOString()}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                "aspect-square rounded-md flex items-center justify-center text-sm font-medium transition-all cursor-pointer relative hover:brightness-90",
                                                isToday && "ring-2 ring-primary ring-offset-2"
                                            )}
                                            style={style}
                                            onClick={() => onDayClick?.(dayData)}
                                        >
                                            {format(day, 'd')}
                                            {dayData.status === 'present' && (
                                                <div className="absolute bottom-1 w-1 h-1 bg-white rounded-full opacity-50" />
                                            )}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div className="text-xs">
                                            <p className="font-semibold">{format(day, 'EEEE, MMM d')}</p>
                                            <p className="capitalize text-muted-foreground">{dayData.status}</p>
                                            {dayData.intensity !== undefined && (
                                                <p>Intensity: {Math.round(dayData.intensity * 100)}%</p>
                                            )}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    })}
                </div>

                <div className="flex gap-4 mt-6 text-xs text-muted-foreground justify-center">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-500" /> Present
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-yellow-500" /> Half Day
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Absent
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Weekend
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
