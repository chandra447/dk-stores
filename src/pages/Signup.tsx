import { useState, FormEvent } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvex } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Field, FieldGroup, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Store, Eye, EyeOff, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background';
import { toast } from 'sonner';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

// --- HELPER FOR ERROR HANDLING ---
const getFriendlyErrorMessage = (error: any) => {
  const message = error?.message || error?.data || error?.toString() || '';
  
  // Handle account already exists errors
  if (message.includes('already exists') || message.includes('duplicate') || message.includes('AccountAlreadyExists')) {
    return "An account with this email already exists. Please sign in instead.";
  }
  
  // Handle invalid email format
  if (message.includes('invalid email') || message.includes('email format')) {
    return "Please enter a valid email address.";
  }
  
  // Handle weak password errors
  if (message.includes('weak password') || message.includes('password requirements')) {
    return "Password is too weak. Please use at least 6 characters with a mix of letters and numbers.";
  }
  
  // Handle network errors
  if (message.includes('Network') || message.includes('fetch') || message.includes('connection')) {
    return "Network error. Please check your internet connection.";
  }
  
  // Handle rate limiting
  if (message.includes('rate limit') || message.includes('too many')) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  
  // Generic fallback
  return "Registration failed. Please try again.";
};

function Signup() {
  const navigate = useNavigate();
  const { signIn } = useAuthActions();
  const convex = useConvex();

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password) {
      toast.error('Email and password are required', { dismissible: true });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match', { dismissible: true });
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long', { dismissible: true });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address', { dismissible: true });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // First, check if email already exists in the database
      // @ts-expect-error - Convex type instantiation is too deep, but this works correctly
      const emailCheck = await convex.query(api.auth.users.checkEmailExists, {
        email: formData.email.toLowerCase(),
      }) as { exists: boolean } | null;

      if (emailCheck?.exists) {
        toast.error('An account with this email already exists. Please sign in instead.', { dismissible: true });
        setLoading(false);
        return;
      }

      // Email doesn't exist, proceed with signup
      await signIn('password', {
        email: formData.email,
        password: formData.password,
        flow: 'signUp', // This creates a new user
        name: formData.email.split('@')[0], // Extract name from email
      });

      setSuccess(true);
      toast.success('Account created successfully!', { dismissible: true });
      // Redirect to registers after successful signup (user is already authenticated)
      setTimeout(() => {
        navigate('/registers');
      }, 3000);
    } catch (err: any) {
      console.error('Sign up error:', err);
      toast.error(getFriendlyErrorMessage(err), { dismissible: true });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (success) {
    return (
      <div className="relative min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <AnimatedGradientBackground
          startingGap={125}
          Breathing={true}
          gradientColors={["#0A0A0A", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"]}
          gradientStops={[35, 50, 60, 70, 80, 90, 100]}
          animationSpeed={0.02}
          breathingRange={5}
          topOffset={0}
        />
        <Card className="relative z-10 w-full max-w-md p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Registration Successful!
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Your shop owner account has been created successfully. You will be redirected to the login page.
            </p>
            <Link to="/login">
              <Button className="mt-4">
                Go to Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <AnimatedGradientBackground
        startingGap={125}
        Breathing={true}
        gradientColors={["#0A0A0A", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"]}
        gradientStops={[35, 50, 60, 70, 80, 90, 100]}
        animationSpeed={0.02}
        breathingRange={5}
        topOffset={0}
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="flex items-center gap-3">
            <Store className="text-primary dark:text-white text-4xl" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">DK Stores</h1>
          </div>
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">
            Shop Owner Registration
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-center">
            Create your shop owner account to manage stores and employees
          </p>
        </div>

        <Card className="w-full rounded-xl shadow-lg border-slate-200/50 dark:border-slate-700/50">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email Address</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="h-12"
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
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    className="h-12 pr-10"
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
                <FieldDescription>Minimum 6 characters</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                  className="h-12"
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <FieldDescription className="text-red-600">Passwords do not match</FieldDescription>
                )}
              </Field>
            </FieldGroup>

            <div className="mt-8 flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full h-12 font-bold"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <div className="text-center">
                <span className="text-slate-600 dark:text-slate-400">
                  Already have an account?{' '}
                </span>
                <Link
                  to="/login"
                  className="text-primary hover:underline font-medium"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </form>
        </Card>

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>
            After signing up, you can create your stores and manage employees from the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;