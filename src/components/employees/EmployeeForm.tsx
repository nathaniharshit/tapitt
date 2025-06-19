import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, UserPlus, Eye, EyeOff } from 'lucide-react';

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
    <Card className="max-w-2xl mx-auto mt-10 bg-gradient-to-br from-blue-50/60 to-indigo-100/60 dark:from-gray-900 dark:to-gray-800 border border-blue-200 dark:border-gray-700 shadow-2xl rounded-2xl">
      <CardHeader className="flex flex-col items-center justify-center bg-blue-600 dark:bg-blue-900 rounded-t-2xl pb-6">
        <div className="flex items-center gap-2 mb-2">
          <UserPlus className="h-7 w-7 text-white" />
          <CardTitle className="text-white text-2xl">Add New Employee</CardTitle>
        </div>
        <p className="text-blue-100 text-sm">Fill in the details to onboard a new team member</p>
      </CardHeader>
      <CardContent className="pt-8 pb-6 px-6">
        {message && (
          <div className={`text-sm font-medium mb-4 ${
            message.startsWith('Error') || message === 'Network error.'
              ? 'text-red-600 dark:text-red-400'
              : 'text-green-600 dark:text-green-400'
          }`}>
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Info Section */}
          <div>
            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="dark:text-gray-200">First Name</Label>
                <Input name="firstName" value={formData.firstName} onChange={handleChange} required className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
              </div>
              <div>
                <Label htmlFor="lastName" className="dark:text-gray-200">Last Name</Label>
                <Input name="lastName" value={formData.lastName} onChange={handleChange} required className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
              </div>
              <div>
                <Label htmlFor="email" className="dark:text-gray-200">Email</Label>
                <Input type="email" name="email" value={formData.email} onChange={handleChange} required className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
              </div>
              <div>
                <Label htmlFor="phone" className="dark:text-gray-200">Phone</Label>
                <div className="flex">
                  <select
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={handleChange}
                    className="border rounded-l-lg px-2 py-2 bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 font-bold text-lg focus:ring-2 focus:ring-blue-400 flex-shrink-0"
                    style={{ minWidth: 90 }}
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
                    className="rounded-l-none rounded-r-lg bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 focus:ring-2 focus:ring-blue-400 flex-1 dark:placeholder-gray-400"
                    required
                    placeholder="10 digit number"
                    type="tel"
                  />
                </div>
                {phoneError && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{phoneError}</div>}
              </div>
            </div>
          </div>
          <hr className="my-4 border-blue-200 dark:border-blue-900" />
          {/* Job Info Section */}
          <div>
            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">Job Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department" className="dark:text-gray-200">Department</Label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full mt-1 mb-2 border rounded-lg px-3 py-2 bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400"
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
                <Label htmlFor="position" className="dark:text-gray-200">Position</Label>
                <Input name="position" value={formData.position} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
              </div>
              <div>
                <Label htmlFor="role" className="dark:text-gray-200">Role</Label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="w-full mt-1 mb-2 border rounded-lg px-3 py-2 bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400"
                >
                  <option value="">Select role</option>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                  <option value="intern">Intern</option>
                  <option value="manager">Manager</option> {/* Added manager role */}
                </select>
              </div>
              <div>
                <Label htmlFor="salary" className="dark:text-gray-200">Salary</Label>
                <Input
                  type="text"
                  name="salary"
                  value={formatSalaryInput(formData.salary)}
                  onChange={handleChange}
                  inputMode="numeric"
                  pattern="[0-9,]*"
                  autoComplete="off"
                  className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="startDate" className="dark:text-gray-200">Start Date</Label>
                <Input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
              </div>
              <div>
                <Label htmlFor="address" className="dark:text-gray-200">Address</Label>
                <Input name="address" value={formData.address} onChange={handleChange} className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
              </div>
            </div>
          </div>
          <hr className="my-4 border-blue-200 dark:border-blue-900" />
          {/* Security Section */}
          <div>
            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">Security</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password" className="dark:text-gray-200">Temporary Password</Label>
                <div className="relative flex items-center">
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="pr-10 bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Employee
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmployeeForm;
