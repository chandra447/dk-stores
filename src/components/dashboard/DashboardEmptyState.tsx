import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, TrendingUp, Clock, Users } from 'lucide-react';

interface DashboardEmptyStateProps {
  type: 'no-registers' | 'no-data' | 'no-employees';
  hasSelectedRegister?: boolean;
  hasSelectedEmployee?: boolean;
}

export function DashboardEmptyState({ type, hasSelectedRegister, hasSelectedEmployee }: DashboardEmptyStateProps) {
  const getEmptyStateContent = () => {
    switch (type) {
      case 'no-registers':
        return {
          icon: <Users className="h-12 w-12 text-muted-foreground" />,
          title: "No Registers Found",
          description: "You haven't created any registers yet. Create your first register to start tracking attendance."
        };

      case 'no-employees':
        return {
          icon: <Users className="h-12 w-12 text-muted-foreground" />,
          title: "No Employees Found",
          description: "This register doesn't have any employees yet. Add employees to start tracking their attendance."
        };

      case 'no-data':
      default:
        return {
          icon: <CalendarIcon className="h-12 w-12 text-muted-foreground" />,
          title: "No Attendance Data",
          description: hasSelectedRegister
            ? "No attendance records found for the selected period. Try adjusting the date range or check if the register has been opened."
            : hasSelectedEmployee
            ? "No attendance records found for this employee in the selected period."
            : "Select a register and date range to view attendance statistics."
        };
    }
  };

  const { icon, title, description } = getEmptyStateContent();

  if (type === 'no-registers') {
    return (
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome to Dashboard!
          </h1>
          <p className="text-muted-foreground">
            Create your first register to start tracking attendance and managing your workforce.
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {icon}
            <h3 className="text-xl font-semibold mt-4">{title}</h3>
            <p className="text-center mt-2 text-muted-foreground">
              {description}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        {icon}
        <h3 className="text-xl font-semibold mt-4">{title}</h3>
        <p className="text-center mt-2 text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export function StatsEmptyState() {
  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Register Open Days
          </CardTitle>
          <CardDescription>Days register was opened</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-muted-foreground">0</div>
          <p className="text-sm text-muted-foreground">
            select period to view data
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Present Days
          </CardTitle>
          <CardDescription>Full days marked present</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-muted-foreground">0</div>
          <p className="text-sm text-muted-foreground">
            select period to view data
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Half Days
          </CardTitle>
          <CardDescription>Half-day attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-muted-foreground">0</div>
          <p className="text-sm text-muted-foreground">
            select period to view data
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Break Time
          </CardTitle>
          <CardDescription>Time usage compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-muted-foreground">0m</div>
          <p className="text-sm text-muted-foreground">
            select period to view data
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function ChartsEmptyState({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          No data available for the selected period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Select a register and date range to view {title.toLowerCase()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function WageTableEmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wage Calculation</CardTitle>
        <CardDescription>
          Detailed breakdown of wages and break time compliance for the selected period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No attendance data available for wage calculation
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Select a register and date range to view wage details
          </p>
        </div>
      </CardContent>
    </Card>
  );
}