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
        <Label htmlFor="password">New Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
            onBlur={() => setTouched(true)}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
            onClick={() => setShow(s => !s)}
            tabIndex={-1}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        {touched && failedRules.length > 0 && (
          <ul className="mt-2 text-xs text-red-600 space-y-1">
            {failedRules.map(rule => (
              <li key={rule.message}>• {rule.message}</li>
            ))}
          </ul>
        )}
      </div>
      <Button type="submit" disabled={loading || !isValid}>
        {loading ? 'Saving...' : 'Set Password'}
      </Button>
    </form>
  );
};

export default SetPasswordForm;
