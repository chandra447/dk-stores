import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function About() {
  const benefits = [
    {
      title: 'Real-Time Visibility',
      description: 'See attendance status instantly across all locations'
    },
    {
      title: 'Mobile Optimized',
      description: 'Perfect for busy retail managers on the go'
    },
    {
      title: 'Simple Authentication',
      description: 'Username + PIN for quick manager access'
    },
    {
      title: 'Automatic Tracking',
      description: 'Break times and attendance tracked automatically'
    }
  ];

  const techStack = [
    { title: 'Technology', value: 'React + Convex', description: 'Modern, scalable stack' },
    { title: 'Design', value: 'Mobile-First', description: 'Works on any device' },
    { title: 'Updates', value: 'Real-Time', description: 'Instant synchronization' },
    { title: 'Maintenance', value: 'Zero', description: 'Serverless architecture' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">About Attendance System</h1>
        </div>

        {/* Problem Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">The Problem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg text-muted-foreground">
              Retail businesses still rely on paper-based rollcall sheets to track employee attendance.
              This manual process is inefficient, error-prone, and doesn't provide real-time visibility
              into staff availability across multiple locations.
            </p>
            <p className="text-lg text-muted-foreground">
              Managers need quick access to attendance data, while business owners require oversight
              across all stores. Paper sheets make this impossible without manual data aggregation.
            </p>
          </CardContent>
        </Card>

        {/* Solution Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Our Solution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg text-muted-foreground">
              Attendance System replaces paper rollcall with a real-time digital dashboard that
              works seamlessly across all devices. Built with modern technology and designed specifically
              for retail environments.
            </p>

            {/* Tech Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {techStack.map((tech, index) => (
                <Card key={index} className="bg-muted/50">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm text-muted-foreground">{tech.title}</h3>
                    <p className="font-bold">{tech.value}</p>
                    <p className="text-sm text-muted-foreground">{tech.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Benefits Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Key Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <span className="text-green-600 dark:text-green-400 text-2xl font-semibold flex-shrink-0">✓</span>
                  <div>
                    <h3 className="font-semibold">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/login">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default About;