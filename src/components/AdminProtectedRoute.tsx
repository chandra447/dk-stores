import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ReactNode } from 'react';
import { Spinner } from '@/components/ui/spinner';

interface AdminProtectedRouteProps {
  children: ReactNode;
}

function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    // Redirect managers to registers page (their appropriate workspace)
    return <Navigate to="/registers" replace />;
  }

  return <>{children}</>;
}

export default AdminProtectedRoute;