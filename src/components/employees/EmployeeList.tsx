import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Employee {
  _id: string;
  firstname: string;
  lastname: string;
  email?: string;
  department?: string;
  position?: string;
  role?: string;
  status?: string;
  picture?: string;
  phone?: string;
  salary?: number | string;
  startDate?: string;
  address?: string;
  reportingManager?: any;
}

interface EmployeeListProps {
  userRole: 'superadmin' | 'admin' | 'employee' | 'manager';
}

const EmployeeList = ({ userRole }: EmployeeListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [viewedEmployee, setViewedEmployee] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [deleteEmployee, setDeleteEmployee] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5050/api/employees')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEmployees(data);
          setFetchError(null);
        } else if (Array.isArray(data.employees)) {
          setEmployees(data.employees);
          setFetchError(null);
        } else {
          setEmployees([]);
          setFetchError('Invalid data format from server.');
        }
      })
      .catch(err => {
        setEmployees([]);
        setFetchError('Failed to fetch employees.');
      })
      .finally(() => setLoading(false));
  }, []);

  const canEdit = userRole === 'superadmin' || userRole === 'admin';
  const canDelete = userRole === 'superadmin';

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
    setDeleteEmployee(employee);
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
    setDeleteEmployee(null);
  };

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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

  const getInitials = (emp: any) =>
    emp?.firstname && emp?.lastname
      ? `${emp.firstname[0]}${emp.lastname[0]}`
      : emp?.firstname?.slice(0, 2) || 'EM';

  const groupedEmployees = {
    superadmin: Array.isArray(employees) ? employees.filter(e => e.role === 'superadmin') : [],
    admin: Array.isArray(employees) ? employees.filter(e => e.role === 'admin') : [],
    employee: Array.isArray(employees) ? employees.filter(e => e.role === 'employee') : [],
    intern: Array.isArray(employees) ? employees.filter(e => e.role === 'intern') : [],
  };

  const roleSections = [
    { key: 'superadmin', label: 'Super Admins', border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-card', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    { key: 'admin', label: 'Admins', border: 'border-green-500', bg: 'bg-green-50 dark:bg-card', badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    { key: 'employee', label: 'Employees', border: 'border-yellow-500', bg: 'bg-yellow-50 dark:bg-card', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    { key: 'intern', label: 'Interns', border: 'border-purple-500', bg: 'bg-purple-50 dark:bg-card', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  ];

  return (
    <div className="space-y-6 h-full overflow-y-auto scroll-smooth" style={{ maxHeight: 'calc(100vh - 64px)', padding: 0 }}>
      {loading && (
        <div className="text-center py-12 text-muted-foreground">Loading employees...</div>
      )}
      {fetchError && (
        <div className="text-center py-12 text-red-600">{fetchError}</div>
      )}
      {!loading && !fetchError && (
        <>
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
                  className="pl-10 w-64 bg-background text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>
          <div className="scroll-smooth" style={{ maxHeight: '70vh', padding: 0 }}>
            {roleSections.map(section => {
              const group = groupedEmployees[section.key].filter(employee => {
                return (
                  `${employee.firstname} ${employee.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (employee.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (employee.department || '').toLowerCase().includes(searchTerm.toLowerCase())
                );
              });
              if (group.length === 0) return null;
              return (
                <div key={section.key} className="mb-8">
                  <h3 className={`text-xl font-bold mb-4 ${section.border} text-foreground`}>
                    {section.label}
                  </h3>
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-4"
                    style={{
                      gap: '12px',
                      overflow: 'visible'
                    }}
                  >
                    {group.map((employee) => {
                      const profilePic = getProfilePicUrl(employee);
                      const initials = getInitials(employee);
                      return (
                        <Card
                          key={employee._id}
                          className={`flex flex-col h-full border-2 ${section.border} ${section.bg} text-foreground transition-shadow hover:shadow-xl hover:scale-[1.03] duration-200`}
                        >
                          <CardHeader className="flex flex-col items-center pb-0">
                            {profilePic ? (
                              <img
                                src={profilePic}
                                alt="Profile"
                                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow -mt-8 mb-2"
                              />
                            ) : (
                              <div className={`w-16 h-16 ${section.badge} rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white shadow -mt-8 mb-2`}>
                                {initials}
                              </div>
                            )}
                            <CardTitle className="text-lg font-semibold text-center">{employee.firstname} {employee.lastname}</CardTitle>
                            <div className="text-sm text-muted-foreground text-center">{employee.position} • {employee.department}</div>
                            <div className="text-xs text-muted-foreground text-center">{employee.email}</div>
                          </CardHeader>
                          <CardContent className="flex flex-col flex-1 justify-between pt-2">
                            <div className="flex flex-col items-center mb-2">
                              <Badge className={`mb-1 ${section.badge}`}>{employee.status || 'active'}</Badge>
                            </div>
                            <div className="flex items-center justify-center gap-2 mt-2">
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
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="w-full max-w-none h-screen p-0 bg-background text-foreground flex flex-col">
              <div className="flex-1 flex flex-col md:flex-row">
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
                    {(userRole === 'superadmin' || userRole === 'admin') && (
                      <div>
                        <p className="text-muted-foreground font-medium">Salary</p>
                        <p className="text-lg font-semibold text-foreground">{formatSalary(viewedEmployee?.salary)}</p>
                      </div>
                    )}
                    {viewedEmployee?.startDate && viewedEmployee.startDate.trim() !== '' && (
                      <div>
                        <p className="text-muted-foreground font-medium">Start Date</p>
                        <p className="text-lg font-semibold text-foreground">{new Date(viewedEmployee.startDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {viewedEmployee?.address && viewedEmployee.address.trim() !== '' && (
                      <div>
                        <p className="text-muted-foreground font-medium">Address</p>
                        <p className="text-lg font-semibold text-foreground">{viewedEmployee?.address}</p>
                      </div>
                    )}
                    {viewedEmployee && viewedEmployee.role !== 'superadmin' && (
                      <div>
                        <p className="text-muted-foreground font-medium">Reporting Manager</p>
                        <p className="text-lg font-semibold text-foreground">
                          {viewedEmployee.reportingManager && typeof viewedEmployee.reportingManager === 'string' ? (
                            <ReportingManagerDetails managerId={viewedEmployee.reportingManager} />
                          ) : viewedEmployee.reportingManager && typeof viewedEmployee.reportingManager === 'object' ? (
                            <>
                              {viewedEmployee.reportingManager.firstname} {viewedEmployee.reportingManager.lastname}
                              {viewedEmployee.reportingManager.email && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({viewedEmployee.reportingManager.email})
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Not assigned</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                      {userRole === 'superadmin' ? (
                        <div className="flex gap-4 my-2">
                          {['superadmin', 'admin', 'employee', 'intern'].map((role) => (
                            <label key={role} className="flex flex-col items-center cursor-pointer">
                              <input
                                type="radio"
                                name="role"
                                value={role}
                                checked={editEmployee.role === role}
                                onChange={handleEditChange}
                                className="hidden"
                              />
                              <span
                                className={`w-5 h-5 rounded-full border-2 mb-1 ${
                                  editEmployee.role === role
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'bg-gray-200 border-gray-400'
                                }`}
                              />
                              <span className="text-xs capitalize">{role.replace('_', ' ')}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
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
                          <option value="superadmin">Super Admin</option>
                          <option value="intern">Intern</option>
                        </select>
                      )}
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
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
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
        </>
      )}
    </div>
  );
};

const ReportingManagerDetails = ({ managerId }: { managerId: string }) => {
  const [manager, setManager] = useState<any>(null);

  useEffect(() => {
    fetch(`http://localhost:5050/api/employees/${managerId}`)
      .then(res => res.json())
      .then(data => setManager(data))
      .catch(() => setManager(null));
  }, [managerId]);

  if (!manager) {
    return <span className="text-muted-foreground">Not assigned</span>;
  }

  return (
    <>
      {manager.firstname} {manager.lastname}
      {manager.email && (
        <span className="text-xs text-muted-foreground ml-2">
          ({manager.email})
        </span>
      )}
    </>
  );
};

export default EmployeeList;
