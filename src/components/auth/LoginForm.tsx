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

interface LoginFormProps {
  onLogin: (userData: DemoUser) => void;
}

type DemoUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'super_admin' | 'admin' | 'employee';
};

const demoUsers: Record<'super_admin' | 'admin' | 'employee', DemoUser> = {
  super_admin: {
    id: '1',
    name: 'Divy Shah',
    email: 'super@tapitt.com',
    password: 'super123',
    role: 'super_admin'
  },
  admin: {
    id: '2',
    name: 'Nilay Shah',
    email: 'admin@tapitt.com',
    password: 'admin123',
    role: 'admin'
  },
  employee: {
    id: '3',
    name: 'Mike Johnson',
    email: 'employee@tapitt.com',
    password: 'employee123',
    role: 'employee'
  }
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

    // Static login for super_admin and admin
    if (selectedRole === 'super_admin' || selectedRole === 'admin') {
      const user = Object.values(demoUsers).find((u) => u.email === email);
      // Debug log for troubleshooting
      console.log({ email, password, selectedRole, user });
      if (!user) {
        setError('Invalid email address.');
        return;
      }
      if (user.role !== selectedRole) {
        setError('Selected role does not match the email entered.');
        return;
      }
      if (user.password !== password) {
        setError('Incorrect password.');
        return;
      }
      onLogin(user);
      return;
    }

    // Employee login via backend
    if (selectedRole === 'employee') {
      try {
        const response = await fetch('http://localhost:5050/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Login failed');
          return;
        }
        // Check mustChangePassword
        if (data.employee && data.employee.mustChangePassword) {
          // Redirect to set password page, pass employeeId
          navigate('/employee-set-password', { state: { employeeId: data.employee._id } });
          return;
        }
        // Successful login
        onLogin({
          id: data.employee._id,
          name: `${data.employee.firstname} ${data.employee.lastname}`,
          email: data.employee.email,
          password: password,
          role: data.employee.role
        });
      } catch (err) {
        setError('Network error.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Employee Management System
          </CardTitle>
          <CardDescription>Sign in to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="role">Select your role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={!selectedRole}>
              Sign In
            </Button>
            {error && (
              <p className="text-red-600 text-sm text-center mt-2">{error}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
