import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v6';
import { ConvexReactClient, Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { Spinner } from '@/components/ui/spinner';
import { Toaster, toast } from 'sonner';
import { PullToRefresh } from '@/components/PullToRefresh';
import { forceReload } from './main';

// Layout Components
import PublicLayout from './components/Layout/PublicLayout';
import DashboardLayout from './components/Layout/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';

// Page Components
import About from './pages/About';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Registers from './pages/Registers';
import RegisterDetail from './pages/RegisterDetail';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Global refresh handler for pull-to-refresh
const handleRefresh = async () => {
  // Clear any Convex caches and force refetch
  const localStorage = window.localStorage;
  const keysToRemove: string[] = [];

  // Remove Convex query cache
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('convex-')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Force a page reload after a brief delay to ensure cache clearing
  setTimeout(() => {
    window.location.reload();
  }, 100);
};

// App wrapper to handle authentication-based redirects
function AppContent() {
  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <AuthLoading>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <Spinner className="size-8" />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Login />} />
            <Route path="about" element={<About />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
          </Route>
          {/* Default redirect for unauthenticated users */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Unauthenticated>

      <Authenticated>
        <Routes>
          {/* Admin-Only Dashboard Route */}
          <Route path="/" element={
            <AdminProtectedRoute>
              <DashboardLayout />
            </AdminProtectedRoute>
          }>
            <Route path="dashboard" element={<Dashboard />} />
          </Route>

          {/* General Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="registers" element={<Registers />} />
            <Route path="registers/:id" element={<RegisterDetail />} />
          </Route>

          {/* Default redirect for authenticated users */}
          <Route path="*" element={<Navigate to="/registers" replace />} />
        </Routes>
      </Authenticated>
    </PullToRefresh>
  );
}

function App() {
  // Listen for service worker updates and show toast
  useEffect(() => {
    const handleUpdate = () => {
      toast.info('A new version is available!', {
        description: 'Click to update and get the latest features.',
        duration: Infinity,
        dismissible: true,
        action: {
          label: 'Update Now',
          onClick: () => {
            forceReload();
          },
        },
      });
    };

    // Check if update was pending from before
    if (sessionStorage.getItem('sw_update_available') === 'true') {
      sessionStorage.removeItem('sw_update_available');
      handleUpdate();
    }

    // Listen for future updates
    window.addEventListener('sw-update-available', handleUpdate);
    
    return () => {
      window.removeEventListener('sw-update-available', handleUpdate);
    };
  }, []);

  return (
    <ConvexAuthProvider client={convex}>
      <NuqsAdapter>
        <Router>
          <AppContent />
          <Toaster position="bottom-left" theme="dark" />
        </Router>
      </NuqsAdapter>
    </ConvexAuthProvider>
  );
}

export default App;