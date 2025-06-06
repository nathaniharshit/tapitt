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
    department: '',
    position: '',
    role: '',
    salary: '',
    startDate: '',
    address: '',
    password: '',
    employmentType: 'employee', // Set default value to 'employee'
    aadhar: '', // Add this field for the number
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
          firstname: formData.firstName,
          lastname: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          position: formData.position,
          role: formData.role,
          salary: parseFloat(formData.salary),
          startDate: formData.startDate,
          address: formData.address,
          password: formData.password,
          employmentType: formData.employmentType, // NEW FIELD
          aadhar: formData.aadhar, // Add this field to the POST body
        })
      });

      if (response.ok) {
        setMessage('Employee added successfully!');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          department: '',
          position: '',
          role: '',
          salary: '',
          startDate: '',
          address: '',
          password: '',
          employmentType: 'employee', // Reset to default value, not empty string
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
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Add New Employee</CardTitle>
      </CardHeader>
      <CardContent>
        {message && (
          <div className={`text-sm font-medium mb-4 ${message.startsWith('Error') || message === 'Network error.' ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input name="firstName" value={formData.firstName} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input name="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input name="phone" value={formData.phone} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                className="w-full mt-1 mb-2 border rounded-md px-3 py-2"
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
              <Input name="position" value={formData.position} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="w-full mt-1 mb-2 border rounded-md px-3 py-2"
              >
                <option value="">Select role</option>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
            <div>
              <Label htmlFor="employmentType">Employment Type</Label>
              <select
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                required
                className="w-full mt-1 mb-2 border rounded-md px-3 py-2"
              >
                <option value="">Select type</option>
                <option value="employee">Employee</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <Label htmlFor="salary">Salary</Label>
              <Input type="number" name="salary" value={formData.salary} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input name="address" value={formData.address} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="password">Temporary Password</Label>
              <Input name="password" type="password" value={formData.password} onChange={handleChange} required minLength={8} placeholder="At least 8 characters" />
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
