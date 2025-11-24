import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useAuthActions } from '../../hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Menu, User } from 'lucide-react';

function DashboardLayout() {
  const { user, isAdmin, isManager } = useAuth();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isUserMenuOpen]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Navigation */}
      <nav className="flex-none bg-white dark:bg-slate-800 shadow-md border-b z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Mobile menu button and brand */}
            <div className="flex items-center">
              {/* Mobile menu button */}
              <div className="md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
              <Link to="/registers" className="ml-2 md:ml-0 text-xl font-semibold text-foreground hover:text-primary transition-colors">
                DK Store
              </Link>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                to="/registers"
                className={`${isActiveRoute('/registers') ? 'text-primary font-medium' : 'text-foreground hover:text-primary'} transition-colors`}
              >
                Registers
              </Link>
              <Link
                to="/dashboard"
                className={`${isActiveRoute('/dashboard') ? 'text-primary font-medium' : 'text-foreground hover:text-primary'} transition-colors`}
              >
                Dashboard
              </Link>
            </div>

            {/* User menu */}
            <div className="relative mt-2" ref={userMenuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="h-10 w-10 rounded-b-sm bg-primary hover:bg-primary/90 flex items-center justify-center p-0"
              >
                <User className="h-5 w-5 text-primary-foreground" />
              </Button>

              {isUserMenuOpen && user && (
                <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 z-50">
                  <div className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-medium text-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" title={user.name}>
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {isAdmin ? 'Administrator' : isManager ? 'Manager' : 'User'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="py-1">
                    <div className="px-4 py-2">
                      <p className="text-xs text-muted-foreground" title={user.email}>
                        {user.email}
                      </p>
                    </div>
                    <Separator />
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsUserMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-slate-200 dark:border-slate-700">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <Link
                  to="/registers"
                  onClick={() => setIsMenuOpen(false)}
                  className={`${isActiveRoute('/registers') ? 'text-primary font-medium' : 'text-foreground hover:text-primary'} block px-3 py-2 text-base transition-colors`}
                >
                  Registers
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setIsMenuOpen(false)}
                  className={`${isActiveRoute('/dashboard') ? 'text-primary font-medium' : 'text-foreground hover:text-primary'} block px-3 py-2 text-base transition-colors`}
                >
                  Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 no-scrollbar">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;