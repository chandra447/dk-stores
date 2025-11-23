import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Stat {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
}

interface Activity {
  id: number;
  employee: string;
  action: string;
  time: string;
  type: 'checkin' | 'break' | 'checkout';
}

function Dashboard() {
  const { user, isAdmin, isManager } = useAuth();

  const stats: Stat[] = [
    {
      title: 'Total Employees',
      value: '25',
      change: '+2',
      changeType: 'positive',
      icon: '👥'
    },
    {
      title: 'Present Today',
      value: '22',
      change: '+1',
      changeType: 'positive',
      icon: '✅'
    },
    {
      title: 'On Break',
      value: '3',
      change: '0',
      changeType: 'neutral',
      icon: '☕'
    },
    {
      title: 'Absent',
      value: '3',
      change: '-1',
      changeType: 'negative',
      icon: '❌'
    }
  ];

  const recentActivity: Activity[] = [
    { id: 1, employee: 'John Doe', action: 'Checked in', time: '8:45 AM', type: 'checkin' },
    { id: 2, employee: 'Jane Smith', action: 'Started break', time: '10:15 AM', type: 'break' },
    { id: 3, employee: 'Mike Johnson', action: 'Checked in', time: '9:30 AM', type: 'checkin' },
    { id: 4, employee: 'Sarah Williams', action: 'Checked in', time: '8:00 AM', type: 'checkin' }
  ];

  const getChangeColor = (changeType: 'positive' | 'negative' | 'neutral') => {
    switch (changeType) {
      case 'positive': return 'text-green-600 dark:text-green-400';
      case 'negative': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getActivityBadgeVariant = (type: 'checkin' | 'break' | 'checkout'): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'checkin': return 'default';
      case 'break': return 'secondary';
      case 'checkout': return 'destructive';
      default: return 'outline';
    }
  };

  const getActivityText = (type: 'checkin' | 'break' | 'checkout') => {
    switch (type) {
      case 'checkin': return 'Present';
      case 'break': return 'Break';
      case 'checkout': return 'Absent';
      default: return 'Unknown';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
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

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className={`text-xs ${getChangeColor(stat.changeType)}`}>
                  {stat.change} from yesterday
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Button asChild variant="outline">
              <Link to="/registers">📍 View Registers</Link>
            </Button>
            <Button variant="outline">📊 View Reports</Button>
            <Button variant="outline">👥 Manage Employees</Button>
            {isAdmin && (
              <>
                <Button variant="outline">⚙️ System Settings</Button>
                <Button variant="outline">📈 Analytics</Button>
                <Button variant="outline">📤 Export Data</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Employee</th>
                    <th className="text-left py-3 px-4">Action</th>
                    <th className="text-left py-3 px-4">Time</th>
                    <th className="text-left py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((activity) => (
                    <tr key={activity.id} className="border-b">
                      <td className="py-3 px-4">{activity.employee}</td>
                      <td className="py-3 px-4">{activity.action}</td>
                      <td className="py-3 px-4">{activity.time}</td>
                      <td className="py-3 px-4">
                        <Badge variant={getActivityBadgeVariant(activity.type)}>
                          {getActivityText(activity.type)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button variant="outline">
              View All Activity
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;