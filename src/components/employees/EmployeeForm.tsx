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
    employeeId: '',
    countryCode: '+91',
    department: '',
    position: '',
    role: '',
    salary: '',
    password: '',
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [reportingManager, setReportingManager] = useState('');
  const [managerOptions, setManagerOptions] = useState<{ value: string; label: string }[]>([]);

  // Helper to get prefix based on role
  const getIdPrefix = (role: string) => {
    if (role === 'intern') return 'TDint';
    return 'TDem';
  };

  // Generate next employeeId based on role and existing employees
  const generateNextEmployeeId = async (role: string) => {
    try {
      const res = await fetch('http://localhost:5050/api/employees');
      const employees = await res.json();
      const prefix = getIdPrefix(role);
      let maxNum = 0;
      employees.forEach((emp: any) => {
        if (
          emp.employeeId &&
          emp.employeeId.startsWith(prefix) &&
          /^TD(em|int)\d{3}$/.test(emp.employeeId)
        ) {
          const num = parseInt(emp.employeeId.replace(prefix, ''), 10);
          if (num > maxNum) maxNum = num;
        }
      });
      const nextId = `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
      setFormData(f => ({ ...f, employeeId: nextId }));
    } catch {
      setFormData(f => ({ ...f, employeeId: getIdPrefix(role) + '001' }));
    }
  };

  // On mount and when role changes, generate employeeId
  useEffect(() => {
    if (formData.role) {
      generateNextEmployeeId(formData.role);
    }
  }, [formData.role]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    fetch('http://localhost:5050/api/employees')
      .then(res => res.json())
      .then(data => {
        const managers = data.filter(
          (emp: any) => emp.role === 'admin' || emp.role === 'superadmin'
        );
        setManagerOptions(
          managers.map((emp: any) => ({
            value: emp._id,
            label: `${emp.firstname} ${emp.lastname} (${emp.role === 'superadmin' ? 'Super Admin' : 'Admin'})`
          }))
        );
      })
      .catch(() => setManagerOptions([]));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'salary') {
      const numericValue = value.replace(/[^0-9.]/g, '');
      setFormData({ ...formData, [name]: numericValue });
    } else if (name === 'role') {
      setFormData({ ...formData, [name]: value });
      // employeeId will be set by useEffect
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const formatSalaryInput = (salary: string) => {
    if (!salary) return '';
    const num = Number(salary.replace(/,/g, ''));
    if (isNaN(num)) return '';
    return num.toLocaleString('en-IN');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5050/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          firstname: formData.firstName,
          lastname: formData.lastName,
          department: formData.department,
          position: formData.position,
          role: formData.role,
          salary: formData.salary ? parseFloat(formData.salary.replace(/,/g, '')) : undefined,
          password: formData.password,
          reportingManager: reportingManager || undefined
        })
      });

      if (response.ok) {
        setMessage('Employee added successfully!');
        setFormData({
          firstName: '',
          lastName: '',
          employeeId: '', // Will be set by useEffect after role is set
          countryCode: '+91',
          department: '',
          position: '',
          role: '',
          salary: '',
          password: '',
        });
        setReportingManager('');
        if (onEmployeeAdded) onEmployeeAdded();
        // Regenerate employeeId for the same role
        if (formData.role) {
          generateNextEmployeeId(formData.role);
        }
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
                <Label htmlFor="employeeId" className="dark:text-gray-200">Employee ID</Label>
                <Input name="employeeId" value={formData.employeeId} readOnly className="bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400" />
              </div>
              <div>
                <Label htmlFor="reportingManager" className="dark:text-gray-200">Reporting Manager (optional)</Label>
                <select
                  name="reportingManager"
                  value={reportingManager}
                  onChange={e => setReportingManager(e.target.value)}
                  className="w-full mt-1 mb-2 border rounded-lg px-3 py-2 bg-background dark:bg-gray-800 text-foreground dark:text-gray-100 focus:ring-2 focus:ring-blue-400 dark:placeholder-gray-400"
                >
                  <option value="">Select reporting manager</option>
                  {managerOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <hr className="my-4 border-blue-200 dark:border-blue-900" />
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
                  <option value="Designer">Designer</option>
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
                  <option value="manager">Manager</option>
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
            </div>
          </div>
          <hr className="my-4 border-blue-200 dark:border-blue-900" />
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
