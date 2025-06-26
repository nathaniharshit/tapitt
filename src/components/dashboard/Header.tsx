import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User } from 'lucide-react';
import { useState, useEffect } from 'react';

interface HeaderUser {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'employee' | 'manager';
  picture?: string; // Add this line
}

interface HeaderProps {
  user: HeaderUser;
  onLogout: () => void;
}

const Header = ({ user, onLogout }: HeaderProps) => {
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'employee':
        return 'Employee';
      case 'manager':
        return 'Manager';
      default:
        return role;
    }
  };

  // Helper to get initials
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Theme state for light/dark mode
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <header className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-b border-border shadow-lg">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 dark:bg-white/10 shadow mr-3">
            <svg className="w-8 h-8 text-white dark:text-indigo-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
            </svg>
          </span>
          <div>
            <h1 className="text-2xl font-bold text-white dark:text-foreground tracking-tight">EmployeeManage</h1>
            <p className="text-sm text-indigo-100 dark:text-muted-foreground">Welcome back, <span className="font-semibold">{user.name}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/20 dark:bg-gray-800/60 px-4 py-2 rounded-full shadow border border-white/30 dark:border-gray-700">
            <Avatar>
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <AvatarFallback className="bg-blue-600 text-white dark:bg-indigo-700 dark:text-white font-bold">
                  {getInitials(user.name)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="text-right">
              <p className="text-sm font-semibold text-white dark:text-foreground">{user.name}</p>
              <p className="text-xs text-indigo-100 dark:text-indigo-300">{getRoleDisplay(user.role)}</p>
            </div>
          </div>
          <button
            className="p-2 rounded-full border border-white/40 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-gray-700 transition"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2m0 18v2m11-11h-2M3 12H1m16.95 6.95l-1.41-1.41M6.05 6.05L4.64 4.64m12.31 0l-1.41 1.41M6.05 17.95l-1.41 1.41" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
              </svg>
            )}
          </button>
          <Button
            variant="outline"
            onClick={onLogout}
            className="flex items-center space-x-2 border-border hover:bg-muted text-foreground font-semibold transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
