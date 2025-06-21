import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface SetPasswordFormProps {
  onPasswordSet: (password: string) => void;
  loading?: boolean;
}

const passwordRules = [
  { regex: /.{8,}/, message: 'At least 8 characters' },
  { regex: /[A-Z]/, message: 'At least one uppercase letter' },
  { regex: /[a-z]/, message: 'At least one lowercase letter' },
  { regex: /[0-9]/, message: 'At least one number' },
  { regex: /[^A-Za-z0-9]/, message: 'At least one special character' },
];

const SetPasswordForm = ({ onPasswordSet, loading }: SetPasswordFormProps) => {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);

  const failedRules = passwordRules.filter(rule => !rule.regex.test(password));
  const isValid = failedRules.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (isValid) {
      onPasswordSet(password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-2 font-semibold text-foreground">Set New Password</label>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-400"
            placeholder="Enter new password"
            minLength={8}
            autoComplete="new-password"
            onBlur={() => setTouched(true)}
            disabled={loading}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            onClick={() => setShow(s => !s)}
            tabIndex={-1}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <div>
        <ul className="text-sm space-y-1">
          {passwordRules.map(rule => (
            <li
              key={rule.message}
              className={
                rule.regex.test(password)
                  ? 'text-green-600 flex items-center'
                  : touched && password
                  ? 'text-red-600 flex items-center'
                  : 'text-gray-500 flex items-center'
              }
            >
              <span className="mr-2">
                {rule.regex.test(password) ? '✓' : '✗'}
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
      <button
        type="submit"
        className={`w-full py-2 rounded bg-blue-600 text-white font-semibold transition ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        disabled={!isValid || loading}
      >
        {loading ? 'Setting...' : 'Set Password'}
      </button>
    </form>
  );
};

export default SetPasswordForm;
