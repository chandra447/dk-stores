import { useState, FormEvent } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldGroup, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Store, Eye, EyeOff, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

function Signup() {
  const navigate = useNavigate();
  const { signIn } = useAuthActions();

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Use Convex Auth to create a new account
      await signIn('password', {
        email: formData.email,
        password: formData.password,
        flow: 'signUp', // This creates a new user
        name: formData.email.split('@')[0], // Extract name from email
      });

      setSuccess(true);
      // Redirect to login after successful signup
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user types
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

            {error && (
              <Alert className="mt-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <AlertDescription className="text-red-600 dark:text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

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