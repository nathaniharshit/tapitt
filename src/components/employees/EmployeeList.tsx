import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface EmployeeListProps {
  userRole: 'super_admin' | 'admin' | 'employee';
}

const EmployeeList = ({ userRole }: EmployeeListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [viewedEmployee, setViewedEmployee] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [deleteEmployee, setDeleteEmployee] = useState<any | null>(null); // For delete confirmation dialog

  useEffect(() => {
    fetch('http://localhost:5050/api/employees')
      .then(res => res.json())
      .then(data => {
        console.log('Fetched employees:', data);
        setEmployees(data);
      })
      .catch(err => {
        console.error('Failed to fetch employees:', err);
        setEmployees([]);
      });
  }, []);
  

  const canEdit = userRole === 'super_admin' || userRole === 'admin';
  const canDelete = userRole === 'super_admin';

  const handleView = (employee: any) => {
    setViewedEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleEdit = (employee: any) => {
    setEditEmployee(employee);
    setIsEditDialogOpen(true);
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'salary') {
      const numericValue = value.replace(/[^0-9.]/g, '');
      setEditEmployee({ ...editEmployee, [name]: numericValue });
    } else {
      setEditEmployee({ ...editEmployee, [name]: value });
    }
  };

  const handleEditSave = async () => {
    if (!editEmployee) return;
    try {
      const response = await fetch(`http://localhost:5050/api/employees/${editEmployee._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editEmployee),
      });
      if (response.ok) {
        setEmployees((prev) => prev.map(emp => emp._id === editEmployee._id ? editEmployee : emp));
        setIsEditDialogOpen(false);
        setEditEmployee(null);
        setMessage({ text: 'Employee updated successfully!', type: 'success' });
      } else {
        setMessage({ text: 'Failed to update employee.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error.', type: 'error' });
    }
  };

  // Expose a function to refresh employees (for dashboard to call after clock in/out)
  const refreshEmployees = async () => {
    try {
      const res = await fetch('http://localhost:5050/api/employees');
      const data = await res.json();
      setEmployees(data);
    } catch {
      setEmployees([]);
    }
  };

  const handleDelete = async (employee: any) => {
    setDeleteEmployee(employee); // Open confirmation dialog
  };

  const confirmDelete = async () => {
    if (!deleteEmployee) return;
    try {
      const response = await fetch(`http://localhost:5050/api/employees/${deleteEmployee._id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setEmployees((prev) => prev.filter(emp => emp._id !== deleteEmployee._id));
        setMessage({ text: 'Employee deleted successfully!', type: 'success' });
      } else {
        setMessage({ text: 'Failed to delete employee.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error.', type: 'error' });
    }
    setDeleteEmployee(null); // Close dialog
  };

  // Clear message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Helper function for formatting salary
  const formatSalary = (salary: number | string) => {
    if (!salary && salary !== 0) return '-';
    const num = typeof salary === 'string' ? Number(salary) : salary;
    if (isNaN(num)) return '-';
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const getProfilePicUrl = (emp: any) => {
    if (emp && emp.picture) {
      if (typeof emp.picture === 'string') {
        if (emp.picture.startsWith('/uploads/')) {
          return `http://localhost:5050${emp.picture}`;
        } else if (emp.picture.startsWith('http')) {
          return emp.picture;
        }
        return emp.picture;
      }
    }
    return null;
  };

  const groupedEmployees = {
    super_admin: employees.filter(e => e.role === 'super_admin' || e.role === 'superadmin'),
    admin: employees.filter(e => e.role === 'admin'),
    employee: employees.filter(e => e.role === 'employee'),
    intern: employees.filter(e => e.role === 'intern'),
  };

  const roleSections = [
    { key: 'super_admin', label: 'Super Admins', border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-card', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    { key: 'admin', label: 'Admins', border: 'border-green-500', bg: 'bg-green-50 dark:bg-card', badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    { key: 'employee', label: 'Employees', border: 'border-yellow-500', bg: 'bg-yellow-50 dark:bg-card', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    { key: 'intern', label: 'Interns', border: 'border-purple-500', bg: 'bg-purple-50 dark:bg-card', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Show message */}
      {message.text && (
        <div
          className={`rounded px-4 py-2 mb-2 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800'
              : 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Employee Management</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Grouped Employee Sections */}
      {roleSections.map(section => {
        const group = groupedEmployees[section.key].filter(employee => {
          // Apply search filter
          return (
            `${employee.firstname} ${employee.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (employee.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (employee.department || '').toLowerCase().includes(searchTerm.toLowerCase())
          );
        });
        if (group.length === 0) return null;
        return (
          <div key={section.key}>
            <h3 className={`text-xl font-bold mb-4 ${section.border} text-foreground`}>
              {section.label}
            </h3>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {group.map((employee) => {
                const profilePic = getProfilePicUrl(employee);
                const initials =
                  employee.firstname && employee.lastname
                    ? `${employee.firstname[0]}${employee.lastname[0]}`.toUpperCase()
                    : '?';
                return (
                  <Card
                    key={employee._id}
                    className={`flex flex-col h-full border-2 ${section.border} ${section.bg} text-foreground transition-shadow hover:shadow-lg`}
                  >
                    <CardContent className="p-6 flex flex-col flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        {profilePic ? (
                          <img
                            src={profilePic}
                            alt="Profile"
                            className="w-12 h-12 rounded-full object-cover border"
                          />
                        ) : (
                          <div className={`w-12 h-12 ${section.badge} rounded-full flex items-center justify-center`}>
                            <span className="font-semibold">
                              {initials}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{employee.firstname} {employee.lastname}</h3>
                          <p className="text-muted-foreground">{employee.position} • {employee.department}</p>
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                      <div className="flex-1" />
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${section.badge}`}>
                            {employee.status || 'active'}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            Joined: {new Date(employee.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleView(employee)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button variant="outline" size="sm" onClick={() => handleEdit(employee)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              onClick={() => handleDelete(employee)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* No employees found */}
      {roleSections.every(section =>
        groupedEmployees[section.key].filter(employee =>
          `${employee.firstname} ${employee.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (employee.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (employee.department || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).length === 0
      ) && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No employees found matching your search.</p>
        </div>
      )}

      {/* Employee Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full max-w-none h-screen p-0 bg-background text-foreground flex flex-col">
          <div className="flex-1 flex flex-col md:flex-row">
            {/* Left: Avatar and Basic Info */}
            <div className="flex flex-col items-center justify-center bg-muted w-full md:w-1/3 p-8 border-b md:border-b-0 md:border-r">
              {viewedEmployee && getProfilePicUrl(viewedEmployee) ? (
                <img
                  src={getProfilePicUrl(viewedEmployee)}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover mb-4 border"
                />
              ) : (
                <div className="w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                  <span className="text-primary font-bold text-5xl">
                    {viewedEmployee?.firstname && viewedEmployee?.lastname
                      ? `${viewedEmployee.firstname[0]}${viewedEmployee.lastname[0]}`.toUpperCase()
                      : '?'}
                  </span>
                </div>
              )}
              <h3 className="text-3xl font-semibold text-foreground mb-2">{viewedEmployee?.firstname} {viewedEmployee?.lastname}</h3>
              <p className="text-lg text-muted-foreground mb-1">{viewedEmployee?.position} • {viewedEmployee?.department}</p>
              <Badge variant="default" className="text-base px-3 py-1">{viewedEmployee?.status || 'active'}</Badge>
            </div>
            {/* Right: Details */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 overflow-y-auto">
              <DialogHeader className="w-full max-w-2xl mx-auto mb-6">
                <DialogTitle className="text-2xl text-center text-foreground">Employee Details</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
                <div>
                  <p className="text-muted-foreground font-medium">Email</p>
                  <p className="text-lg font-semibold text-foreground">{viewedEmployee?.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Phone</p>
                  <p className="text-lg font-semibold text-foreground">{viewedEmployee?.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Department</p>
                  <p className="text-lg font-semibold text-foreground">{viewedEmployee?.department}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Position</p>
                  <p className="text-lg font-semibold text-foreground">{viewedEmployee?.position}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Role</p>
                  <p className="text-lg font-semibold text-foreground">{viewedEmployee?.role}</p>
                </div>
                {/* Only show salary if userRole is super_admin or admin */}
                {(userRole === 'super_admin' || userRole === 'admin') && (
                  <div>
                    <p className="text-muted-foreground font-medium">Salary</p>
                    <p className="text-lg font-semibold text-foreground">{formatSalary(viewedEmployee?.salary)}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground font-medium">Start Date</p>
                  <p className="text-lg font-semibold text-foreground">{viewedEmployee?.startDate ? new Date(viewedEmployee.startDate).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Address</p>
                  <p className="text-lg font-semibold text-foreground">{viewedEmployee?.address || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Employee Dialog (Super Admin only) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          {editEmployee && (
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">First Name</label>
                  <Input name="firstname" value={editEmployee.firstname || ''} onChange={handleEditChange} required className="bg-background text-foreground" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Last Name</label>
                  <Input name="lastname" value={editEmployee.lastname || ''} onChange={handleEditChange} required className="bg-background text-foreground" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <Input name="email" value={editEmployee.email || ''} onChange={handleEditChange} required className="bg-background text-foreground" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Phone</label>
                  <Input name="phone" value={editEmployee.phone || ''} onChange={handleEditChange} className="bg-background text-foreground" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Department</label>
                  <select
                    name="department"
                    value={editEmployee.department || ''}
                    onChange={handleEditChange}
                    className="w-full mt-1 mb-2 border rounded-md px-3 py-2 bg-background text-foreground"
                    required
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
                  <label className="text-sm text-muted-foreground">Position</label>
                  <Input name="position" value={editEmployee.position || ''} onChange={handleEditChange} className="bg-background text-foreground" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Role</label>
                  <select
                    name="role"
                    value={editEmployee.role || ''}
                    onChange={handleEditChange}
                    className="w-full mt-1 mb-2 border rounded-md px-3 py-2 bg-background text-foreground"
                    required
                  >
                    <option value="">Select role</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Salary</label>
                  <Input
                    name="salary"
                    value={
                      editEmployee.salary
                        ? Number(editEmployee.salary).toLocaleString('en-IN')
                        : ''
                    }
                    onChange={handleEditChange}
                    className="bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Start Date</label>
                  <Input name="startDate" type="date" value={editEmployee.startDate ? editEmployee.startDate.substring(0, 10) : ''} onChange={handleEditChange} className="bg-background text-foreground" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Address</label>
                  <Input name="address" value={editEmployee.address || ''} onChange={handleEditChange} className="bg-background text-foreground" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Aadhar Number</label>
                  <Input name="aadhar" value={editEmployee?.aadhar || ''} onChange={handleEditChange} className="bg-background text-foreground" />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteEmployee} onOpenChange={open => { if (!open) setDeleteEmployee(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            Are you sure you want to delete{' '}
            <span className="font-semibold">
              {deleteEmployee?.firstname} {deleteEmployee?.lastname}
            </span>
            ?
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDeleteEmployee(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeList;
