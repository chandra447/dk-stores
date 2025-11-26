import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v6';
import { ConvexReactClient, Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { Spinner } from '@/components/ui/spinner';
import { Toaster } from 'sonner';

// Layout Components
import PublicLayout from './components/Layout/PublicLayout';
import DashboardLayout from './components/Layout/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Page Components
import About from './pages/About';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Registers from './pages/Registers';
import RegisterDetail from './pages/RegisterDetail';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// App wrapper to handle authentication-based redirects
function AppContent() {
  return (
    <>
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
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="registers" element={<Registers />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="registers/:id" element={<RegisterDetail />} />
          </Route>
          {/* Default redirect for authenticated users */}
          <Route path="*" element={<Navigate to="/registers" replace />} />
        </Routes>
      </Authenticated>
    </>
  );
}

function App() {
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