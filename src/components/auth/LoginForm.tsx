import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
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
  role: 'superadmin' | 'admin' | 'employee' | 'intern';
};

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('http://localhost:5050/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      const backendRole = data.employee?.role;
      const isSuperAdmin = selectedRole === 'superadmin' && backendRole === 'superadmin';

      if (
        !isSuperAdmin &&
        backendRole !== selectedRole &&
        !(selectedRole === 'employee' && backendRole === 'manager')
      ) {
        setError('Unauthorized role.');
        return;
      }

      if (data.employee?.mustChangePassword) {
        navigate('/employee-set-password', {
          state: {
            employeeId: data.employee._id,
            email: data.employee.email,
          },
        });
        return;
      }

      let finalRole = backendRole;
      if (data.employee?.roleRef?.name?.toLowerCase() === 'manager') {
        finalRole = 'manager';
      } else if (['intern', 'manager'].includes(backendRole)) {
        finalRole = 'employee';
      }

      onLogin({
        id: data.employee._id,
        name: `${data.employee.firstname} ${data.employee.lastname}`,
        email: data.employee.email,
        password,
        role: finalRole,
      });
    } catch {
      setError('Network error.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-blue-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 p-6">
      <Card className="w-full max-w-md rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-300">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Sign in
          </CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400 text-sm">
            Access your employee dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="employeeId" className="text-sm text-zinc-700 dark:text-zinc-300">
                Employee ID
              </Label>
              <Input
                id="employeeId"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                placeholder="Enter your employee ID"
                className="mt-1 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-400"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm text-zinc-700 dark:text-zinc-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="mt-1 pr-10 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-2 flex items-center text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="role" className="text-sm text-zinc-700 dark:text-zinc-300">
                Role
              </Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-full mt-1 dark:bg-zinc-800 dark:text-white">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-800 dark:text-white">
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 transition duration-150"
              disabled={!selectedRole}
            >
              Sign In
            </Button>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 text-center pt-2">
                {error}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
