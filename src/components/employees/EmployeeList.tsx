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
    setEditEmployee({ ...editEmployee, [e.target.name]: e.target.value });
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
        // Update local state
        setEmployees((prev) => prev.map(emp => emp._id === editEmployee._id ? editEmployee : emp));
        setIsEditDialogOpen(false);
        setEditEmployee(null);
        alert('Employee updated successfully!');
      } else {
        alert('Failed to update employee.');
      }
    } catch (err) {
      alert('Network error.');
    }
  };

  const handleDelete = async (employee: any) => {
    if (window.confirm(`Are you sure you want to delete ${employee.firstname} ${employee.lastname}?`)) {
      try {
        const response = await fetch(`http://localhost:5050/api/employees/${employee._id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setEmployees((prev) => prev.filter(emp => emp._id !== employee._id));
          alert('Employee deleted successfully!');
        } else {
          alert('Failed to delete employee.');
        }
      } catch (err) {
        alert('Network error.');
      }
    }
  };

  return (
    <div className="space-y-6">
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
          {userRole === 'super_admin' && (
            <Button
              variant="default"
              onClick={() => {
                window.location.href = '/register';
              }}
            >
              Add Employee
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredEmployees.map((employee) => (
          <Card key={employee._id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {employee.firstname && employee.lastname ? `${employee.firstname[0]}${employee.lastname[0]}`.toUpperCase() : '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{employee.firstname} {employee.lastname}</h3>
                    <p className="text-gray-600">{employee.position} • {employee.department}</p>
                    <p className="text-sm text-gray-500">{employee.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                  <Badge variant="default">
                    {employee.status || 'active'}
                  </Badge>
                  <p className="text-sm text-gray-500 mt-1">
                    Joined: {new Date(employee.startDate).toLocaleDateString()}
                  </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    {/* View Button */}
                    <Button variant="outline" size="sm" onClick={() => handleView(employee)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {/* Edit Button */}
                    {canEdit && (
                      <Button variant="outline" size="sm" onClick={() => handleEdit(employee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Delete Button */}
                    {canDelete && (
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(employee)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Employee Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {viewedEmployee && (
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-2xl">
                    {viewedEmployee.firstname && viewedEmployee.lastname ? `${viewedEmployee.firstname[0]}${viewedEmployee.lastname[0]}`.toUpperCase() : '?'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{viewedEmployee.firstname} {viewedEmployee.lastname}</h3>
                  <p className="text-gray-600">{viewedEmployee.position} • {viewedEmployee.department}</p>
                  <Badge variant="default">{viewedEmployee.status || 'active'}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-500">Email:</p>
                  <p className="font-medium">{viewedEmployee.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone:</p>
                  <p className="font-medium">{viewedEmployee.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Department:</p>
                  <p className="font-medium">{viewedEmployee.department}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Position:</p>
                  <p className="font-medium">{viewedEmployee.position}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Role:</p>
                  <p className="font-medium">{viewedEmployee.role}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Salary:</p>
                  <p className="font-medium">{viewedEmployee.salary || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Start Date:</p>
                  <p className="font-medium">{viewedEmployee.startDate ? new Date(viewedEmployee.startDate).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address:</p>
                  <p className="font-medium">{viewedEmployee.address || '-'}</p>
                </div>
              </div>
            </div>
          )}
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
                  <Input name="salary" value={editEmployee.salary || ''} onChange={handleEditChange} />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Start Date</label>
                  <Input name="startDate" type="date" value={editEmployee.startDate ? editEmployee.startDate.substring(0, 10) : ''} onChange={handleEditChange} />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Address</label>
                  <Input name="address" value={editEmployee.address || ''} onChange={handleEditChange} />
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

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No employees found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
