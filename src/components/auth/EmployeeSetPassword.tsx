import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

const passwordRules = [
  { regex: /.{8,}/, message: 'At least 8 characters' },
  { regex: /[A-Z]/, message: 'One uppercase letter' },
  { regex: /[a-z]/, message: 'One lowercase letter' },
  { regex: /[0-9]/, message: 'One number' },
  { regex: /[^A-Za-z0-9]/, message: 'One special character' },
];

const EmployeeSetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { employeeId, email } = (location.state || {}) as {
    employeeId: string;
    email?: string;
  };

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

    if (!isValid) return setError('Please fulfill all password requirements.');
    if (!passwordsMatch) return setError('Passwords do not match.');

    try {
      const res = await fetch(`http://localhost:5050/api/employees/${employeeId}/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to set password');
        return;
      }

      setSuccess('Password set successfully! Redirecting...');
      setTimeout(() => navigate('/login'), 1500);
    } catch {
      setError('Network error.');
    }
  };

  if (!employeeId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 text-center shadow-xl dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg dark:text-white">Invalid Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-zinc-600 dark:text-zinc-400">Employee ID not found. Please login again.</p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-blue-50 to-white dark:from-zinc-950 dark:to-zinc-900 p-6">
      <Card className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-900 transition-all duration-300">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-zinc-900 dark:text-white">
            Set Your New Password
          </CardTitle>
          {email && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">for <strong>{email}</strong></p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 mt-2">
            <div>
              <Label htmlFor="new-password" className="text-sm text-zinc-700 dark:text-zinc-300">
                New Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter strong password"
                  required
                  className="pr-10 dark:bg-zinc-800 dark:text-white"
                  onBlur={() => setTouched(true)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-password" className="text-sm text-zinc-700 dark:text-zinc-300">
                Confirm Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="pr-10 dark:bg-zinc-800 dark:text-white"
                  onBlur={() => setTouched(true)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <ul className="text-sm space-y-1">
              {passwordRules.map(rule => (
                <li
                  key={rule.message}
                  className={`flex items-center ${
                    rule.regex.test(newPassword)
                      ? 'text-green-600'
                      : touched && newPassword
                      ? 'text-red-600'
                      : 'text-zinc-500'
                  }`}
                >
                  <span className="mr-2">{rule.regex.test(newPassword) ? '✓' : '✗'}</span>
                  {rule.message}
                </li>
              ))}
            </ul>

            {touched && !isValid && (
              <div className="text-red-600 text-sm font-medium">Please fulfill all password requirements.</div>
            )}
            {touched && newPassword && confirmPassword && !passwordsMatch && (
              <div className="text-red-600 text-sm font-medium">Passwords do not match.</div>
            )}
            {error && <div className="text-red-600 text-sm font-medium">{error}</div>}
            {success && <div className="text-green-600 text-sm font-medium">{success}</div>}

            <Button
              type="submit"
              className={`w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 transition ${
                !isValid || !passwordsMatch ? 'opacity-60 cursor-not-allowed' : ''
              }`}
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
