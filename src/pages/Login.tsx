import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthActions } from '../hooks/useAuth';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Eye, EyeOff } from 'lucide-react';
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background';
import { toast } from 'sonner';

interface FormData {
  identifier: string;
  password: string;
  role: 'manager' | 'admin';
  pin: string;
}

// --- HELPER FOR ERROR HANDLING ---
const getFriendlyErrorMessage = (error: any, isAdmin: boolean = false) => {
  const message = error?.message || error?.data || error?.toString() || '';
  
  // Handle ConvexError messages directly (they come from our custom provider)
  if (message.includes('Account not found') || message.includes('sign up first')) {
    return isAdmin
      ? "Account not found. Please sign up first or check your email address."
      : "Account not found. Please check your credentials.";
  }
  
  // Map technical errors to user-friendly strings
  if (message.includes('InvalidAccountId') || message.includes('User not found') || message.includes('Could not verify')) {
    return isAdmin
      ? "Account not found. Please sign up first or check your email address."
      : "We couldn't find an account with those details.";
  }
  if (message.includes('InvalidPassword') || message.includes('InvalidSecret') || message.includes('password')) {
    return "Incorrect password. Please try again.";
  }
  if (message.includes('Network') || message.includes('fetch')) {
    return "Network error. Please check your internet connection.";
  }
  // Generic fallback
  return "Login failed. Please check your credentials.";
};

function Login() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    identifier: '',
    password: '',
    role: 'admin',
    pin: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Query to find manager account by name
  //@ts-ignore
  const findManagerAccount = useQuery(api.auth.users.findManagerAccountByName,
    formData.role === 'manager' && formData.identifier.trim() ? { name: formData.identifier.trim() } : 'skip'
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (formData.role === 'admin') {
      if (!formData.identifier.trim() || !formData.password.trim()) {
        toast.error('Email and password are required', { dismissible: true });
        setLoading(false);
        return;
      }
    } else if (formData.role === 'manager') {
      if (!formData.identifier.trim() || !formData.pin.trim()) {
        toast.error('Username and PIN are required', { dismissible: true });
        setLoading(false);
        return;
      }
      if (formData.pin.length !== 4) {
        toast.error('PIN must be exactly 4 digits', { dismissible: true });
        setLoading(false);
        return;
      }
    }

    let email = formData.identifier;
    let password = formData.password;

    if (formData.role === 'manager') {
      if (findManagerAccount) {
        email = findManagerAccount.email || '';
        password = formData.pin;
      } else {
        console.error('🚨 [LOGIN ERROR] Manager account not found:', {
          searchedName: formData.identifier.trim(),
          normalizedForSearch: formData.identifier.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, ''),
          availableManagers: findManagerAccount ? 'Account found but query failed' : 'No account found'
        });

        toast.error(
          `Manager account "${formData.identifier.trim()}" not found. Please check your name or contact Admin.`,
          { dismissible: true }
        );
        setLoading(false);
        return;
      }
    }

    try {
      await signIn('password', {
        email,
        password,
        flow: 'signIn',
      });

      // Successful login navigation
      setTimeout(() => {
        if (formData.role === 'admin') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/registers', { replace: true });
        }
      }, 100);

    } catch (err: any) {
      console.error('Sign in error:', err);
      // Show appropriate error message as toast - no auto-signup, user must explicitly sign up
      toast.error(getFriendlyErrorMessage(err, formData.role === 'admin'), { dismissible: true });
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    setFormData(prev => ({ ...prev, pin: value }));
  };

  return (
    // CHANGED: min-h-svh (better for mobile browsers) and overflow-y-auto for safety
    <div className="min-h-[100svh] w-full bg-slate-100 dark:bg-slate-900 relative overflow-y-auto flex flex-col">
      <AnimatedGradientBackground
        startingGap={125}
        Breathing={true}
        gradientColors={["#0A0A0A", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"]}
        gradientStops={[35, 50, 60, 70, 80, 90, 100]}
        animationSpeed={0.02}
        breathingRange={5}
        topOffset={0}
      />
      
      {/* CHANGED: 
          1. py-4: Small padding top/bottom
          2. my-auto: Centers content vertically if screen is big, allows scroll if screen is small
          3. z-10: Kept z-index
      */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-6 my-auto flex flex-col items-center">
        
        {/* CHANGED: Compact Header */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="flex justify-center mb-2 sm:mb-3">
            <img
              src="/logo_transparent.png"
              alt="DK Store Logo"
              // Smaller logo on mobile (w-12) vs desktop (w-16)
              className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
            />
          </div>
          {/* Smaller text on mobile */}
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-1">Welcome to DK Stores</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Sign in to your account to continue</p>
        </div>

        <div className="w-full">
          <Tabs value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as 'manager' | 'admin' }))}>
            {/* Reduced mb-3 to mb-2 */}
            <TabsList className="grid w-full grid-cols-2 h-10 sm:h-12 bg-muted/50 p-1 mb-2">
              <TabsTrigger value="admin" className="text-sm">Admin</TabsTrigger>
              <TabsTrigger value="manager" className="text-sm">Manager</TabsTrigger>
            </TabsList>

            <Card className="w-full rounded-2xl shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <TabsContent value="admin" className="mt-0">
                {/* CHANGED: Reduced padding from p-6 to p-4 on mobile */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <FieldGroup className="space-y-3">
                    <Field>
                      <FieldLabel htmlFor="email" className="text-xs sm:text-sm">Email Address</FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={formData.identifier}
                        onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                        required
                        className="h-10 sm:h-11 border-border/60 focus:border-primary"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="password" className="text-xs sm:text-sm">Password</FieldLabel>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          value={formData.password}
                          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                          required
                          className="h-10 sm:h-11 pr-10 border-border/60 focus:border-primary"
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

                  {/* Cleaned up "Forgot Password" to be less dominant */}
                  <div className="flex justify-end">
                    <Button type="button" variant="link" size="sm" className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs">
                      Forgot Password?
                    </Button>
                  </div>

                  <Button type="submit" className="w-full h-10 sm:h-11 font-medium" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  <div className="text-center pt-1 sm:pt-2">
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      Don't have an account?{' '}
                    </span>
                    <Link to="/signup" className="text-primary hover:text-primary/80 font-medium text-xs sm:text-sm">
                      Sign up
                    </Link>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="manager" className="mt-0">
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <FieldGroup className="space-y-3">
                    <Field>
                      <FieldLabel htmlFor="username" className="text-xs sm:text-sm">Username (Full Name)</FieldLabel>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter full name"
                        value={formData.identifier}
                        onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                        required
                        className="h-10 sm:h-11 border-border/60 focus:border-primary"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="pin" className="text-xs sm:text-sm">4-digit PIN</FieldLabel>
                      <div className="mt-1.5 flex justify-center">
                        <InputOTP
                          id="pin"
                          maxLength={4}
                          value={formData.pin}
                          onChange={(value) => handlePinChange(value)}
                          pattern={REGEXP_ONLY_DIGITS}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} className="h-10 w-10 sm:h-12 sm:w-12" />
                            <InputOTPSlot index={1} className="h-10 w-10 sm:h-12 sm:w-12" />
                            <InputOTPSlot index={2} className="h-10 w-10 sm:h-12 sm:w-12" />
                            <InputOTPSlot index={3} className="h-10 w-10 sm:h-12 sm:w-12" />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </Field>
                  </FieldGroup>

                  <Button type="submit" className="w-full h-10 sm:h-11 font-medium" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default Login;