import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuthActions } from '../hooks/useAuth';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Field, FieldGroup, FieldDescription, FieldLabel } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Eye, EyeOff } from 'lucide-react';
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background';

interface FormData {
  identifier: string;
  password: string;
  role: 'manager' | 'admin';
  pin: string;
}

function Login() {
  const { signIn } = useAuthActions();
  const [formData, setFormData] = useState<FormData>({
    identifier: '',
    password: '',
    role: 'admin',
    pin: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Query to find manager account by name
  const findManagerAccount = useQuery(api.auth.users.findManagerAccountByName,
    formData.role === 'manager' && formData.identifier.trim() ? { name: formData.identifier.trim() } : 'skip'
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.role === 'admin') {
      if (!formData.identifier.trim() || !formData.password.trim()) {
        setError('Email and password are required');
        setLoading(false);
        return;
      }
    } else if (formData.role === 'manager') {
      if (!formData.identifier.trim() || !formData.pin.trim()) {
        setError('Username and PIN are required');
        setLoading(false);
        return;
      }
      if (formData.pin.length !== 4) {
        setError('PIN must be exactly 4 digits');
        setLoading(false);
        return;
      }
    }

    let email = formData.identifier;
    let password = formData.password;

    if (formData.role === 'manager') {
      // For managers, find their account using the query
      if (findManagerAccount) {
        email = findManagerAccount.email;
        password = formData.pin;
      } else {
        // If manager account is not found, show appropriate error
        setError('Manager account not found. Please check your name or contact your admin.');
        setLoading(false);
        return;
      }
    }

    try {
      // First try to sign in
      const result = await signIn('password', {
        email,
        password,
        flow: 'signIn',
      });

      console.log('Sign in result:', result);

      // If authentication is successful, the router will handle the redirect
      // based on the updated authentication state in useAuth
    } catch (err: any) {
      console.error('Sign in error:', err);

      // If user doesn't exist, try to create them first (for admin users)
      if (formData.role === 'admin' && err.message?.includes('InvalidAccountId')) {
        console.log('Admin user not found, attempting to create account...');
        try {
          await signIn('password', {
            email,
            password,
            flow: 'signUp',
          });
          console.log('Admin account created successfully');
        } catch (signupErr: any) {
          console.error('Sign up error:', signupErr);
          setError(signupErr.message || 'Failed to create admin account');
        }
      } else if (formData.role === 'manager') {
        setError(`Login failed. Please check your name and PIN. If you continue to have issues, contact your admin. ${findManagerAccount ? `(Found account: ${findManagerAccount.email})` : ''}`);
      } else {
        setError(err.message || 'Login failed. Please contact your admin to create your manager account.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    setFormData(prev => ({ ...prev, pin: value }));
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
      <AnimatedGradientBackground
        startingGap={125}
        Breathing={true}
        gradientColors={["#0A0A0A", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"]}
        gradientStops={[35, 50, 60, 70, 80, 90, 100]}
        animationSpeed={0.02}
        breathingRange={5}
        topOffset={0}
      />
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md px-4 flex flex-col items-center max-h-screen">
        {/* Logo and Brand */}
        <div className="text-center mb-4">
          <div className="flex justify-center mb-3">
            <img
              src="/logo_transparent.png"
              alt="DK Store Logo"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to DK Stores</h1>
          <p className="text-muted-foreground">Sign in to your account to continue</p>
        </div>

        {/* Main container - ensures no overflow */}
        <div className="w-full">
          {/* Tabs - Outside the card */}
          <Tabs value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as 'manager' | 'admin' }))}>
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1 mb-3">
              <TabsTrigger
                value="admin"
                className="data-[state=active]:bg-primary data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-accent transition-all duration-400"
              >
                Admin
              </TabsTrigger>
              <TabsTrigger
                value="manager"
                className="data-[state=active]:bg-primary data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-accent transition-all duration-400"
              >
                Manager
              </TabsTrigger>
            </TabsList>

            {/* Card that changes content based on selected tab */}
            <Card className="w-full rounded-2xl shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm transition-all duration-300">
            <TabsContent value="admin" className="mt-0 data-[state=active]:animate-in data-[state=inactive]:animate-out data-[state=inactive]:fade-out data-[state=active]:fade-in duration-500">
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email Address</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.identifier}
                      onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                      required
                      className="h-11 border-border/60 focus:border-primary"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        className="h-11 pr-10 border-border/60 focus:border-primary"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </Field>
                </FieldGroup>

                <div className="flex items-center justify-between">
                  <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground px-0">
                    Forgot Password?
                  </Button>
                </div>

                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="text-center pt-2">
                  <span className="text-muted-foreground text-sm">
                    Don't have an account?{' '}
                  </span>
                  <Link
                    to="/signup"
                    className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="manager" className="mt-0 data-[state=active]:animate-in data-[state=inactive]:animate-out data-[state=inactive]:fade-out data-[state=active]:fade-in duration-500">
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="username">Username (Full Name)</FieldLabel>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.identifier}
                      onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                      required
                      className="h-11 border-border/60 focus:border-primary"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="pin">Enter your 4-digit PIN</FieldLabel>
                    <div className="mt-2">
                      <InputOTP
                        id="pin"
                        maxLength={4}
                        value={formData.pin}
                        onChange={(value) => handlePinChange(value)}
                        pattern={REGEXP_ONLY_DIGITS}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <FieldDescription className="mt-2">
                      Enter your full name as registered by your admin and your 4-digit PIN
                    </FieldDescription>
                  </Field>
                </FieldGroup>

                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="text-center pt-2">
                  <span className="text-muted-foreground text-sm">
                    Don't have an account?{' '}
                  </span>
                  <Link
                    to="/signup"
                    className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              </form>
            </TabsContent>
          </Card>
        </Tabs>
        </div>
      </div>
      </div>
    </div>
  );
}

export default Login;