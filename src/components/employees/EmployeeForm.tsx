import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface EmployeeFormProps {
  onEmployeeAdded?: () => void;
}

const EmployeeForm = ({ onEmployeeAdded }: EmployeeFormProps) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '+91', // Add country code
    department: '',
    position: '',
    role: '',
    salary: '',
    startDate: '',
    address: '',
    pincode: '', // <-- Add this line
    password: '',
    aadhar: '', // Add this field for the number
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState(''); // Add phone error state
  const [showPassword, setShowPassword] = useState(false); // Add this state

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'salary') {
      // Remove all non-digit except dot, then format with commas for display
      const numericValue = value.replace(/[^0-9.]/g, '');
      setFormData({ ...formData, [name]: numericValue });
    } else if (name === 'phone') {
      // Only allow digits, max 10
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setFormData({ ...formData, phone: digits });
      if (digits.length > 0 && digits.length !== 10) {
        setPhoneError('Phone number must be exactly 10 digits');
      } else {
        setPhoneError('');
      }
    } else if (name === 'pincode') {
      // Only allow digits, max 6
      const digits = value.replace(/\D/g, '').slice(0, 6);
      setFormData({ ...formData, pincode: digits });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Helper to format salary for input display
  const formatSalaryInput = (salary: string) => {
    if (!salary) return '';
    const num = Number(salary.replace(/,/g, ''));
    if (isNaN(num)) return '';
    return num.toLocaleString('en-IN');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Phone validation
    if (formData.phone.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5050/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstname: formData.firstName, // <-- correct field name
          lastname: formData.lastName,   // <-- correct field name
          email: formData.email,
          phone: `${formData.countryCode}${formData.phone}`,
          department: formData.department,
          position: formData.position,
          role: formData.role,
          salary: formData.salary ? parseFloat(formData.salary.replace(/,/g, '')) : undefined, // ensure number
          startDate: formData.startDate, // (optionally convert to ISO string)
          address: formData.address,
          password: formData.password // ensure this is present
        })
      });

      if (response.ok) {
        setMessage('Employee added successfully!');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          countryCode: '+91', // Reset to default value
          department: '',
          position: '',
          role: '',
          salary: '',
          startDate: '',
          address: '',
          pincode: '',
          password: '',
          aadhar: '',
        });

        if (onEmployeeAdded) onEmployeeAdded();
      } else {
        const err = await response.json();
        setMessage('Error: ' + err.error);
      }
    } catch (err) {
      setMessage('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8 bg-card text-foreground shadow-lg">
      <CardHeader>
        <CardTitle>Add New Employee</CardTitle>
      </CardHeader>
      <CardContent>
        {message && (
          <div className={`text-sm font-medium mb-4 ${
            message.startsWith('Error') || message === 'Network error.'
              ? 'text-red-600 dark:text-red-400'
              : 'text-green-600 dark:text-green-400'
          }`}>
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input name="firstName" value={formData.firstName} onChange={handleChange} required className="bg-background text-foreground" />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input name="lastName" value={formData.lastName} onChange={handleChange} required className="bg-background text-foreground" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input type="email" name="email" value={formData.email} onChange={handleChange} required className="bg-background text-foreground" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <div className="flex">
                <select
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleChange}
                  className="border rounded-l px-2 py-2 bg-background text-foreground font-bold text-lg"
                  style={{ minWidth: 80 }}
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+971">🇦🇪 +971</option>
                </select>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength={10}
                  minLength={10}
                  pattern="\d{10}"
                  className="rounded-l-none bg-background text-foreground"
                  required
                  placeholder="10 digit number"
                  type="tel"
                />
              </div>
              {phoneError && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{phoneError}</div>}
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                className="w-full mt-1 mb-2 border rounded-md px-3 py-2 bg-background text-foreground"
              >
                <option value="">Select department</option>
                <option value="HR">HR</option>
                <option value="Engineering">Engineering</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance</option>
                <option value="Support">Support</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Input name="position" value={formData.position} onChange={handleChange} className="bg-background text-foreground" />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="w-full mt-1 mb-2 border rounded-md px-3 py-2 bg-background text-foreground"
              >
                <option value="">Select role</option>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <Label htmlFor="salary">Salary</Label>
              <Input
                type="text"
                name="salary"
                value={formatSalaryInput(formData.salary)}
                onChange={handleChange}
                inputMode="numeric"
                pattern="[0-9,]*"
                autoComplete="off"
                className="bg-background text-foreground"
              />
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="bg-background text-foreground" />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input name="address" value={formData.address} onChange={handleChange} className="bg-background text-foreground" />
            </div>
            <div>
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                maxLength={6}
                minLength={6}
                pattern="\d{6}"
                className="bg-background text-foreground"
                placeholder="6 digit pincode"
                type="text"
              />
            </div>
            <div>
              <Label htmlFor="password">Temporary Password</Label>
              <div className="relative flex items-center">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="pr-20 bg-background text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 px-2 py-1 text-xs bg-muted border rounded hover:bg-muted/80"
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Add Employee'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmployeeForm;
