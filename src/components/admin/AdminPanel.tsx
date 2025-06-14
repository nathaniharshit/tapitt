import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Users, Database, Settings, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import
import { Edit2, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import AttendanceCalendar from '../attendance/AttendanceCalendar';

interface AdminPanelProps {
  userRole: 'super_admin' | 'admin' | 'employee';
}

const AdminPanel = ({ userRole }: AdminPanelProps) => {
  const [counts, setCounts] = useState<{ super_admin: number; admin: number; employee: number; intern: number }>({
    super_admin: 0,
    admin: 0,
    employee: 0,
    intern: 0,
  });
  const [loading, setLoading] = useState(true);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [showEditRolesDialog, setShowEditRolesDialog] = useState(false);
  const [editRoles, setEditRoles] = useState<{ [id: string]: string }>({});
  const [savingRoles, setSavingRoles] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [confirmUser, setConfirmUser] = useState<any | null>(null); // For confirmation dialog
  const [attendanceMarking, setAttendanceMarking] = useState<{ [id: string]: boolean }>({});
  const [attendanceMsg, setAttendanceMsg] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const navigate = useNavigate();
  const [calendarEmployeeId, setCalendarEmployeeId] = useState<string>('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchCounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5050/api/employees');
      const employees = await res.json();
      setAllEmployees(employees);
      const roleCounts = { super_admin: 0, admin: 0, employee: 0, intern: 0 };
      employees.forEach((emp: any) => {
        if (emp.role === 'super_admin' || emp.role === 'superadmin') roleCounts.super_admin += 1;
        else if (emp.role === 'admin') roleCounts.admin += 1;
        else if (emp.role === 'employee') roleCounts.employee += 1;
        else if (emp.role === 'intern') roleCounts.intern += 1;
      });
      setCounts(roleCounts);
      // Set initial editRoles state
      const rolesObj: { [id: string]: string } = {};
      employees.forEach((emp: any) => { rolesObj[emp._id] = emp.role; });
      setEditRoles(rolesObj);
    } catch {
      setCounts({ super_admin: 0, admin: 0, employee: 0, intern: 0 });
      setAllEmployees([]);
      setEditRoles({});
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return (
      <div className="text-center py-12">
        <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to access this panel.</p>
      </div>
    );
  }

  const adminFeatures = [
    {
      title: 'User Management',
      description: 'Manage user roles and permissions',
      icon: Users,
      actions: [
        { label: 'View Users', onClick: () => navigate('/admin/users') },
        { label: 'Edit Roles', onClick: () => setShowEditRolesDialog(true) },
        { label: 'Deactivate Users', onClick: () => setShowDeactivateDialog(true) }
      ]
    },
    {
      title: 'System Settings',
      description: 'Configure system-wide settings',
      icon: Settings,
      actions: [
        { label: 'Email Settings', onClick: () => {} },
        { label: 'Security Policies', onClick: () => {} },
        { label: 'Backup Configuration', onClick: () => {} }
      ]
    },
    {
      title: 'Database Management',
      description: 'Manage database operations',
      icon: Database,
      actions: [
        { label: 'View Logs', onClick: () => {} },
        { label: 'Run Backups', onClick: () => {} },
        { label: 'Data Export', onClick: () => {} }
      ]
    }
  ];

  // Group employees by role
  const grouped = {
    super_admin: allEmployees.filter(e => e.role === 'super_admin' || e.role === 'superadmin'),
    admin: allEmployees.filter(e => e.role === 'admin'),
    employee: allEmployees.filter(e => e.role === 'employee'),
    intern: allEmployees.filter(e => e.role === 'intern'),
  };

  const handleRoleSelect = (id: string, value: string) => {
    setEditRoles(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveRoles = async () => {
    setSavingRoles(true);
    try {
      await Promise.all(
        allEmployees.map(emp => {
          if (editRoles[emp._id] !== emp.role) {
            return fetch(`http://localhost:5050/api/employees/${emp._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...emp, role: editRoles[emp._id] }),
            });
          }
          return null;
        })
      );
      setShowEditRolesDialog(false);
      fetchCounts();
    } catch {
      // Optionally show error
    }
    setSavingRoles(false);
  };

  const handleDeactivate = async (userId: string) => {
    setDeactivatingId(userId);
    setDeactivateLoading(true);
    try {
      await fetch(`http://localhost:5050/api/employees/${userId}`, {
        method: 'DELETE',
      });
      setDeactivatingId(null);
      setDeactivateLoading(false);
      setConfirmUser(null);
      fetchCounts();
    } catch {
      setDeactivatingId(null);
      setDeactivateLoading(false);
      setConfirmUser(null);
    }
  };

  // Mark attendance for an employee (present/absent)
  const markAttendance = async (empId: string, status: 'present' | 'absent') => {
    setAttendanceMarking(prev => ({ ...prev, [empId]: true }));
    setAttendanceMsg('');
    try {
      const resp = await fetch(`http://localhost:5050/api/employees/${empId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: attendanceDate, status })
      });
      const data = await resp.json();
      if (resp.ok) {
        setAttendanceMsg('Attendance updated!');
        fetchCounts();
      } else {
        setAttendanceMsg('Error: ' + (data.error || 'Failed to mark attendance'));
      }
    } catch {
      setAttendanceMsg('Network error.');
    }
    setAttendanceMarking(prev => ({ ...prev, [empId]: false }));
  };

  // Helper: get attendance status for a given employee and date
  const getAttendanceStatus = (emp: any) => {
    if (!Array.isArray(emp.attendance)) return null;
    const att = emp.attendance.find((a: any) => a.date === attendanceDate);
    return att ? att.status : null;
  };

  // Only show users with status not "resigned" (or status is empty/active)
  const activeUsers = allEmployees.filter(
    (emp: any) => !emp.status || emp.status === 'active'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Shield className="h-8 w-8 text-red-600" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Super Admin Panel</h2>
          <p className="text-muted-foreground">Manage system-wide settings and user permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icon className="h-5 w-5 text-blue-600" />
                  <span>{feature.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <div className="space-y-2">
                  {feature.actions.map((action, actionIndex) => (
                    <Button
                      key={actionIndex}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={action.onClick}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>System Statistics</CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchCounts} title="Refresh">
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {loading ? '...' : counts.super_admin}
              </div>
              <div className="text-sm text-gray-600">Super Admins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {loading ? '...' : counts.admin}
              </div>
              <div className="text-sm text-gray-600">Admins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {loading ? '...' : counts.employee}
              </div>
              <div className="text-sm text-gray-600">Employees</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {loading ? '...' : counts.intern}
              </div>
              <div className="text-sm text-gray-600">Interns</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mark Employee Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <label className="font-semibold text-foreground" htmlFor="attendance-date">Select Date:</label>
            <input
              id="attendance-date"
              type="date"
              value={attendanceDate}
              onChange={e => setAttendanceDate(e.target.value)}
              className="border rounded px-2 py-1 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          {attendanceMsg && (
            <div className={`mb-2 text-sm ${attendanceMsg.startsWith('Error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {attendanceMsg}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left">Name</th>
                  <th className="px-2 py-1 text-left">Email</th>
                  <th className="px-2 py-1 text-left">Role</th>
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-2 py-1 text-left">Present</th>
                  <th className="px-2 py-1 text-left">Absent</th>
                </tr>
              </thead>
              <tbody>
                {allEmployees.map(emp => {
                  const status = getAttendanceStatus(emp);
                  return (
                    <tr key={emp._id}>
                      <td className="px-2 py-1">{emp.firstname} {emp.lastname}</td>
                      <td className="px-2 py-1">{emp.email}</td>
                      <td className="px-2 py-1">{emp.role}</td>
                      <td className="px-2 py-1">
                        {status === 'present' && <span className="text-green-600 dark:text-green-400 font-semibold">Present</span>}
                        {status === 'absent' && <span className="text-red-600 dark:text-red-400 font-semibold">Absent</span>}
                        {!status && <span className="text-muted-foreground">Not Marked</span>}
                      </td>
                      <td className="px-2 py-1">
                        <Button
                          size="sm"
                          className="bg-green-600 text-white"
                          disabled={attendanceMarking[emp._id] || !!status}
                          onClick={() => markAttendance(emp._id, 'present')}
                        >
                          Present
                        </Button>
                      </td>
                      <td className="px-2 py-1">
                        <Button
                          size="sm"
                          className="bg-red-600 text-white"
                          disabled={attendanceMarking[emp._id] || !!status}
                          onClick={() => markAttendance(emp._id, 'absent')}
                        >
                          Absent
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Roles Dialog */}
      {showEditRolesDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-background text-foreground rounded-lg shadow-lg max-w-2xl w-full p-6 relative overflow-y-auto max-h-[90vh]">
            <button
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowEditRolesDialog(false)}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2">
              <Edit2 className="h-5 w-5" /> Edit Roles
            </h3>
            <div className="space-y-4">
              {allEmployees.length === 0 ? (
                <div className="text-muted-foreground text-center">No users found.</div>
              ) : (
                allEmployees.map(emp => (
                  <div key={emp._id} className="flex items-center justify-between border-b border-muted py-2">
                    <div>
                      <div className="font-semibold">{emp.firstname} {emp.lastname}</div>
                      <div className="text-xs text-muted-foreground break-all">{emp.email}</div>
                    </div>
                    <select
                      value={editRoles[emp._id] || emp.role}
                      onChange={e => handleRoleSelect(emp._id, e.target.value)}
                      className="border rounded px-2 py-1 bg-background text-foreground"
                      disabled={savingRoles}
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="employee">Employee</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowEditRolesDialog(false)} disabled={savingRoles}>Cancel</Button>
              <Button onClick={handleSaveRoles} disabled={savingRoles}>
                {savingRoles ? 'Saving...' : 'Save All'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Users Dialog */}
      {showDeactivateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-background text-foreground rounded-lg shadow-lg max-w-2xl w-full p-6 relative overflow-y-auto max-h-[90vh]">
            <button
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowDeactivateDialog(false)}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2">
              <Trash2 className="h-5 w-5" /> Deactivate Users
            </h3>
            <div className="space-y-4">
              {activeUsers.length === 0 ? (
                <div className="text-muted-foreground text-center">No active users found.</div>
              ) : (
                activeUsers.map(emp => (
                  <div key={emp._id} className="flex items-center justify-between border-b border-muted py-2">
                    <div>
                      <div className="font-semibold">{emp.firstname} {emp.lastname}</div>
                      <div className="text-xs text-muted-foreground break-all">{emp.email}</div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmUser(emp)}
                      disabled={deactivateLoading && deactivatingId === emp._id}
                    >
                      {deactivateLoading && deactivatingId === emp._id ? 'Deactivating...' : 'Deactivate'}
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowDeactivateDialog(false)} disabled={deactivateLoading}>Close</Button>
            </div>
          </div>
        </div>
      )}
      {/* Deactivate Confirmation Dialog */}
      {confirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-background text-foreground rounded-lg shadow-lg w-full max-w-xs p-6 relative">
            <button
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              onClick={() => setConfirmUser(null)}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-lg font-bold mb-4 text-center">Confirm Deactivation</h3>
            <div className="mb-4 text-center">
              Are you sure you want to deactivate<br />
              <span className="font-semibold">{confirmUser.firstname} {confirmUser.lastname}</span>?
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setConfirmUser(null)} disabled={deactivateLoading}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => handleDeactivate(confirmUser._id)}
                disabled={deactivateLoading}
              >
                {deactivateLoading ? 'Deactivating...' : 'Deactivate'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
