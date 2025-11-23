import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: number;
  name: string;
  status: 'present' | 'working' | 'checked_out' | 'absent';
  checkInTime: string | null;
  breakStart?: string;
  breakDuration?: string;
}

function RollcallBoard() {
  const { id } = useParams<{ id: string }>();

  const [employees] = useState<Employee[]>([
    { id: 1, name: 'John Doe', status: 'present', checkInTime: '8:45 AM' },
    { id: 2, name: 'Jane Smith', status: 'working', checkInTime: '9:00 AM', breakStart: '10:15 AM' },
    { id: 3, name: 'Mike Johnson', status: 'present', checkInTime: '8:30 AM' },
    { id: 4, name: 'Sarah Williams', status: 'checked_out', checkInTime: '8:00 AM', breakDuration: '15 min' },
    { id: 5, name: 'Tom Brown', status: 'absent', checkInTime: null }
  ]);

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'present': return 'default';
      case 'working': return 'default';
      case 'checked_out': return 'secondary';
      case 'absent': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Present';
      case 'working': return 'Working';
      case 'checked_out': return 'On Break';
      case 'absent': return 'Absent';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-blue-600 dark:text-blue-400';
      case 'working': return 'text-green-600 dark:text-green-400';
      case 'checked_out': return 'text-yellow-600 dark:text-yellow-400';
      case 'absent': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getActionButton = (employee: Employee) => {
    switch (employee.status) {
      case 'present':
        return (
          <Button size="sm" className="bg-green-600 hover:bg-green-700">
            Start Working
          </Button>
        );
      case 'working':
        return (
          <Button size="sm" variant="secondary">
            Take Break
          </Button>
        );
      case 'checked_out':
        return (
          <Button size="sm" className="bg-green-600 hover:bg-green-700">
            Check In
          </Button>
        );
      case 'absent':
        return (
          <Button size="sm">
            Mark Present
          </Button>
        );
      default:
        return null;
    }
  };

  const presentCount = employees.filter(e => e.status === 'present').length;
  const workingCount = employees.filter(e => e.status === 'working').length;
  const onBreakCount = employees.filter(e => e.status === 'checked_out').length;
  const absentCount = employees.filter(e => e.status === 'absent').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Rollcall Board
          </h1>
          <p className="text-muted-foreground">
            Register #{id} - Real-time attendance tracking
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/registers">← Back to Registers</Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{employees.length}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getStatusColor('present')}`}>{presentCount}</div>
            <div className="text-sm text-muted-foreground">Present</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getStatusColor('working')}`}>{workingCount}</div>
            <div className="text-sm text-muted-foreground">Working</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getStatusColor('checked_out')}`}>{onBreakCount}</div>
            <div className="text-sm text-muted-foreground">On Break</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getStatusColor('absent')}`}>{absentCount}</div>
            <div className="text-sm text-muted-foreground">Absent</div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {employees.map((employee) => (
          <Card key={employee.id}>
            <CardContent className="p-4 space-y-3">
              {/* Employee Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{employee.name}</h3>
                <Badge variant={getStatusVariant(employee.status)}>
                  {getStatusText(employee.status)}
                </Badge>
              </div>

              {/* Employee Details */}
              <div className="text-sm space-y-1">
                {employee.checkInTime && (
                  <div className="text-muted-foreground">
                    Check-in: {employee.checkInTime}
                  </div>
                )}
                {employee.breakStart && (
                  <div className="text-muted-foreground">
                    Break started: {employee.breakStart}
                  </div>
                )}
                {employee.breakDuration && (
                  <div className="text-muted-foreground">
                    Break duration: {employee.breakDuration}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                {getActionButton(employee)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Employee Button */}
      <div className="fixed bottom-8 right-8">
        <Button size="lg" className="rounded-full h-14 w-14 shadow-lg">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

export default RollcallBoard;