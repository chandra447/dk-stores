import { useAuthActions as useConvexAuthActions, useAuthToken } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface User {
  name: string;
  email: string;
  role: 'admin' | 'manager';
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  isAdmin: boolean;
  isManager: boolean;
}

interface AuthActions {
  signIn: (provider: string, params?: any) => Promise<{ signingIn: boolean; redirect?: URL }>;
  signOut: () => Promise<void>;
}

// Custom hook for authentication utilities
export function useAuth(): AuthState {
  const token = useAuthToken();

  // Get user profile from database
  const userProfile = useQuery(api.auth.users.getCurrentUser);

  // Simple authentication state based on token presence
  const isAuthenticated = !!token;

  let currentUser: User | null = null;

  // Use database user profile instead of JWT parsing
  if (isAuthenticated && userProfile) {
    currentUser = {
      name: userProfile.email?.split("@")[0] || 'Unknown User',
      email: userProfile.email || 'unknown@example.com',
      role: userProfile.role as 'admin' | 'manager' || 'admin'
    };

  } else if (isAuthenticated && !userProfile) {
    // Loading state - authenticated but profile not loaded yet
    return {
      isAuthenticated,
      isLoading: true,
      user: null,
      isAdmin: false,
      isManager: false,
    };
  }

  return {
    isAuthenticated,
    isLoading: false, // userProfile will be undefined while loading
    user: currentUser,
    isAdmin: currentUser?.role === 'admin',
    isManager: currentUser?.role === 'manager',
  };
}

// Hook for authentication actions
export function useAuthActions(): AuthActions {
  const { signIn, signOut } = useConvexAuthActions();

  return {
    signIn,
    signOut,
  };
}

export default useAuth;