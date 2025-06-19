import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LoginFormProps {
  onLogin: (userData: DemoUser) => void;
}

type DemoUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'superadmin' | 'admin' | 'employee' | 'intern'; // Added 'intern'
};

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Unified backend login for all roles
    if (selectedRole === 'superadmin' || selectedRole === 'admin' || selectedRole === 'employee' || selectedRole === 'intern') {
      try {
        const response = await fetch('http://localhost:5050/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        console.log('LOGIN DEBUG:', data.employee); // Debug log to inspect backend response
        if (!response.ok) {
          setError(data.error || 'Login failed');
          return;
        }
        // Accept all roles for login, but check if backend role matches selectedRole
        const backendRole = data.employee?.role;
        // Allow both 'superadmin' and 'superadmin' for superadmin login
        const isSuperAdmin = (selectedRole === 'superadmin' && (backendRole === 'superadmin' || backendRole === 'superadmin'));
        if (!isSuperAdmin && backendRole !== selectedRole && !(selectedRole === 'employee' && backendRole === 'manager')) {
          setError('You are not authorized to login as this role.');
          return;
        }
        // If mustChangePassword, redirect to set password page
        if (data.employee && data.employee.mustChangePassword) {
          navigate('/employee-set-password', { state: { employeeId: data.employee._id, email: data.employee.email } });
          return;
        }
        // Determine final role for UI/permissions
        let finalRole = backendRole;
        if (data.employee?.roleRef?.name && data.employee.roleRef.name.toLowerCase() === 'manager') {
          finalRole = 'manager';
        } else if (backendRole === 'intern' || backendRole === 'manager') {
          finalRole = 'employee';
        }
        // Successful login
        onLogin({
          id: data.employee._id,
          name: `${data.employee.firstname} ${data.employee.lastname}`,
          email: data.employee.email,
          password: password,
          role: finalRole
        });
      } catch (err) {
        setError('Network error.');
      }
      return;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Employee Management System
          </CardTitle>
          <CardDescription className="dark:text-gray-400">Sign in to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="dark:text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="password" className="dark:text-gray-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="pr-10 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="role" className="dark:text-gray-300">Select your role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="dark:bg-gray-800 dark:text-gray-100">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:text-gray-100">
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full dark:bg-indigo-700 dark:hover:bg-indigo-800" disabled={!selectedRole}>
              Sign In
            </Button>
            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm text-center mt-2">{error}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
