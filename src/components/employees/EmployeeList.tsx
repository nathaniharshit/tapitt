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
  

  const filteredEmployees = employees.filter(employee =>
    `${employee.firstname} ${employee.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.department || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'salary') {
      // Remove non-digit characters except dot, then format
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

  return (
    <div className="space-y-6">
      {/* Show message */}
      {message.text && (
        <div
          className={`rounded px-4 py-2 mb-2 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {filteredEmployees.map((employee) => {
          const profilePic = getProfilePicUrl(employee);
          const initials =
            employee.firstname && employee.lastname
              ? `${employee.firstname[0]}${employee.lastname[0]}`.toUpperCase()
              : '?';
          return (
            <Card key={employee._id} className="flex flex-col h-full">
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex items-center space-x-4 mb-4">
                  {profilePic ? (
                    <img
                      src={profilePic}
                      alt="Profile"
                      className="w-12 h-12 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {initials}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{employee.firstname} {employee.lastname}</h3>
                    <p className="text-gray-600">{employee.position} • {employee.department}</p>
                    <p className="text-sm text-gray-500">{employee.email}</p>
                  </div>
                </div>
                <div className="flex-1" />
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <Badge variant="default">
                      {employee.status || 'active'}
                    </Badge>
                    <p className="text-sm text-gray-500 mt-1">
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
                        className="text-red-600 hover:text-red-700"
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

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No employees found matching your search.</p>
        </div>
      )}

      {/* Employee Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full max-w-none h-screen p-0 bg-white flex flex-col">
          <div className="flex-1 flex flex-col md:flex-row">
            {/* Left: Avatar and Basic Info */}
            <div className="flex flex-col items-center justify-center bg-blue-50 w-full md:w-1/3 p-8 border-b md:border-b-0 md:border-r">
              {viewedEmployee && getProfilePicUrl(viewedEmployee) ? (
                <img
                  src={getProfilePicUrl(viewedEmployee)}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover mb-4 border"
                />
              ) : (
                <div className="w-32 h-32 bg-blue-200 rounded-full flex items-center justify-center mb-4">
                  <span className="text-blue-700 font-bold text-5xl">
                    {viewedEmployee?.firstname && viewedEmployee?.lastname
                      ? `${viewedEmployee.firstname[0]}${viewedEmployee.lastname[0]}`.toUpperCase()
                      : '?'}
                  </span>
                </div>
              )}
              <h3 className="text-3xl font-semibold text-gray-900 mb-2">{viewedEmployee?.firstname} {viewedEmployee?.lastname}</h3>
              <p className="text-lg text-gray-600 mb-1">{viewedEmployee?.position} • {viewedEmployee?.department}</p>
              <Badge variant="default" className="text-base px-3 py-1">{viewedEmployee?.status || 'active'}</Badge>
            </div>
            {/* Right: Details */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 overflow-y-auto">
              <DialogHeader className="w-full max-w-2xl mx-auto mb-6">
                <DialogTitle className="text-2xl text-center">Employee Details</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
                <div>
                  <p className="text-gray-500 font-medium">Email</p>
                  <p className="text-lg font-semibold">{viewedEmployee?.email}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Phone</p>
                  <p className="text-lg font-semibold">{viewedEmployee?.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Department</p>
                  <p className="text-lg font-semibold">{viewedEmployee?.department}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Position</p>
                  <p className="text-lg font-semibold">{viewedEmployee?.position}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Role</p>
                  <p className="text-lg font-semibold">{viewedEmployee?.role}</p>
                </div>
                {/* Only show salary if userRole is super_admin or admin */}
                {(userRole === 'super_admin' || userRole === 'admin') && (
                  <div>
                    <p className="text-gray-500 font-medium">Salary</p>
                    <p className="text-lg font-semibold">{formatSalary(viewedEmployee?.salary)}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 font-medium">Start Date</p>
                  <p className="text-lg font-semibold">{viewedEmployee?.startDate ? new Date(viewedEmployee.startDate).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Address</p>
                  <p className="text-lg font-semibold">{viewedEmployee?.address || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Employee Dialog (Super Admin only) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          {editEmployee && (
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">First Name</label>
                  <Input name="firstname" value={editEmployee.firstname || ''} onChange={handleEditChange} required />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Last Name</label>
                  <Input name="lastname" value={editEmployee.lastname || ''} onChange={handleEditChange} required />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <Input name="email" value={editEmployee.email || ''} onChange={handleEditChange} required />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <Input name="phone" value={editEmployee.phone || ''} onChange={handleEditChange} />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Department</label>
                  <Input name="department" value={editEmployee.department || ''} onChange={handleEditChange} />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Position</label>
                  <Input name="position" value={editEmployee.position || ''} onChange={handleEditChange} />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Role</label>
                  <Input name="role" value={editEmployee.role || ''} onChange={handleEditChange} />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Salary</label>
                  <Input
                    name="salary"
                    value={
                      editEmployee.salary
                        ? Number(editEmployee.salary).toLocaleString('en-IN')
                        : ''
                    }
                    onChange={handleEditChange}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Start Date</label>
                  <Input name="startDate" type="date" value={editEmployee.startDate ? editEmployee.startDate.substring(0, 10) : ''} onChange={handleEditChange} />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Address</label>
                  <Input name="address" value={editEmployee.address || ''} onChange={handleEditChange} />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Aadhar Number</label>
                  <Input name="aadhar" value={editEmployee?.aadhar || ''} onChange={handleEditChange} />
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
