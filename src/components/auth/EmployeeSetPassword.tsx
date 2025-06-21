import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

const passwordRules = [
  { regex: /.{8,}/, message: 'At least 8 characters' },
  { regex: /[A-Z]/, message: 'At least one uppercase letter' },
  { regex: /[a-z]/, message: 'At least one lowercase letter' },
  { regex: /[0-9]/, message: 'At least one number' },
  { regex: /[^A-Za-z0-9]/, message: 'At least one special character' },
];

const EmployeeSetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { employeeId, email } = (location.state || {}) as { employeeId: string; email?: string };

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [touched, setTouched] = useState(false);

  const failedRules = passwordRules.filter(rule => !rule.regex.test(newPassword));
  const isValid = failedRules.length === 0;
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError('');
    setSuccess('');
    if (!isValid) {
      setError('Please fulfill all password requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5050/api/employees/${employeeId}/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to set password');
        return;
      }
      setSuccess('Password set successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError('Network error.');
    }
  };

  if (!employeeId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Invalid Request</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Employee ID not found. Please login again.</p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Set Your New Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {email && (
              <div className="mb-2 text-center text-gray-600 dark:text-gray-400 text-sm">
                For: <span className="font-semibold">{email}</span>
              </div>
            )}
            <div>
              <Label htmlFor="new-password" className="dark:text-gray-300">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                  placeholder="At least 8 characters"
                  className="pr-10 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
                  onBlur={() => setTouched(true)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirm-password" className="dark:text-gray-300">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                  placeholder="Re-enter new password"
                  className="pr-10 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
                  onBlur={() => setTouched(true)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <ul className="text-sm space-y-1">
                {passwordRules.map(rule => (
                  <li
                    key={rule.message}
                    className={
                      rule.regex.test(newPassword)
                        ? 'text-green-600 flex items-center'
                        : touched && newPassword
                        ? 'text-red-600 flex items-center'
                        : 'text-gray-500 flex items-center'
                    }
                  >
                    <span className="mr-2">
                      {rule.regex.test(newPassword) ? '✓' : '✗'}
                    </span>
                    {rule.message}
                  </li>
                ))}
              </ul>
            </div>
            {touched && !isValid && (
              <div className="text-red-600 text-sm font-medium">
                Please fulfill all password requirements.
              </div>
            )}
            {touched && newPassword && confirmPassword && !passwordsMatch && (
              <div className="text-red-600 text-sm font-medium">
                Passwords do not match.
              </div>
            )}
            {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
            {success && <div className="text-green-600 dark:text-green-400 text-sm">{success}</div>}
            <Button
              type="submit"
              className={`w-full dark:bg-indigo-700 dark:hover:bg-indigo-800 ${!isValid || !passwordsMatch ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={!isValid || !passwordsMatch}
            >
              Set Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeSetPassword;
