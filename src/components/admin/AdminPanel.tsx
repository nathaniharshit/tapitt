import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Users, Database, Settings, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import
import { Edit2, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import AttendanceCalendar from '../attendance/AttendanceCalendar';

interface AdminPanelProps {
  userRole: 'superadmin' | 'admin' | 'employee' | 'manager';
}

const AdminPanel = ({ userRole }: AdminPanelProps) => {
  const [counts, setCounts] = useState<{ superadmin: number; admin: number; employee: number; intern: number }>({
    superadmin: 0,
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
  const [roles, setRoles] = useState([]);
  const [roleAssignMsg, setRoleAssignMsg] = useState('');

  const fetchCounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5050/api/employees');
      const employees = await res.json();
      setAllEmployees(employees);
      const roleCounts = { superadmin: 0, admin: 0, employee: 0, intern: 0 };
      employees.forEach((emp: any) => {
        if (emp.role === 'superadmin' || emp.role === 'superadmin') roleCounts.superadmin += 1;
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
      setCounts({ superadmin: 0, admin: 0, employee: 0, intern: 0 });
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

  // Fetch all roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch('http://localhost:5050/api/roles');
        const data = await res.json();
        setRoles(data);
      } catch {}
    };
    fetchRoles();
  }, []);

  if (userRole !== 'admin' && userRole !== 'superadmin') {
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
  ];

  // Group employees by role
  const grouped = {
    superadmin: allEmployees.filter(e => e.role === 'superadmin' || e.role === 'superadmin'),
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
        allEmployees.map(async emp => {
          if (editRoles[emp._id] !== emp.role) {
            // Update the simple role field
            await fetch(`http://localhost:5050/api/employees/${emp._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...emp, role: editRoles[emp._id] }),
            });
            // If using custom roles, also update roleRef if available
            const selectedRoleObj = roles.find((r: any) => r.name === editRoles[emp._id]);
            if (selectedRoleObj && selectedRoleObj._id) {
              await fetch(`http://localhost:5050/api/employees/${emp._id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roleId: selectedRoleObj._id }),
              });
            }
          }
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

  // Helper: check if a date is a weekend (Saturday or Sunday)
  const isWeekend = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getDay() === 0 || d.getDay() === 6;
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

  // Helper: calculate attendance stats excluding weekends and only till today
  const getAttendanceStats = () => {
    const today = new Date();
    // Get all unique attendance dates (excluding weekends, only till today)
    const allDatesSet = new Set<string>();
    allEmployees.forEach(emp => {
      if (Array.isArray(emp.attendance)) {
        emp.attendance.forEach((a: any) => {
          if (
            a.date &&
            !isWeekend(a.date) &&
            new Date(a.date) <= today
          ) {
            allDatesSet.add(a.date);
          }
        });
      }
    });
    const allDates = Array.from(allDatesSet);
    // For each employee, count present days (excluding weekends, only till today)
    let totalPresent = 0;
    let totalPossible = 0;
    allEmployees.forEach(emp => {
      if (Array.isArray(emp.attendance)) {
        emp.attendance.forEach((a: any) => {
          if (
            a.date &&
            !isWeekend(a.date) &&
            new Date(a.date) <= today
          ) {
            totalPossible++;
            if (a.status === 'present') totalPresent++;
          }
        });
      }
    });
    return { totalPresent, totalPossible };
  };

  // --- Standard Payroll Values ---
  const [standardAllowances, setStandardAllowances] = useState([
    { name: 'HRA', amount: 5000 },
    { name: 'Transport', amount: 2000 },
  ]);
  const [standardDeductions, setStandardDeductions] = useState([
    { name: 'PF', amount: 1800 },
    { name: 'Professional Tax', amount: 200 },
  ]);
  const [editPayroll, setEditPayroll] = useState(false);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollMsg, setPayrollMsg] = useState('');

  // Handlers for editing standard values
  const handleAllowanceChange = (idx: number, field: 'name' | 'amount', value: string | number) => {
    setStandardAllowances(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };
  const handleDeductionChange = (idx: number, field: 'name' | 'amount', value: string | number) => {
    setStandardDeductions(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };
  const handleAddAllowance = () => setStandardAllowances(prev => [...prev, { name: '', amount: 0 }]);
  const handleAddDeduction = () => setStandardDeductions(prev => [...prev, { name: '', amount: 0 }]);
  const handleRemoveAllowance = (idx: number) => setStandardAllowances(prev => prev.filter((_, i) => i !== idx));
  const handleRemoveDeduction = (idx: number) => setStandardDeductions(prev => prev.filter((_, i) => i !== idx));

  // Fetch standards from backend on mount
  useEffect(() => {
    const fetchStandards = async () => {
      try {
        const res = await fetch('http://localhost:5050/api/payroll/standards');
        if (res.ok) {
          const data = await res.json();
          if (data.allowances) setStandardAllowances(data.allowances);
          if (data.deductions) setStandardDeductions(data.deductions);
        }
      } catch {}
    };
    fetchStandards();
  }, []);

  const handleSaveStandards = async () => {
    setPayrollLoading(true);
    setPayrollMsg('');
    try {
      const res = await fetch('http://localhost:5050/api/payroll/standards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowances: standardAllowances, deductions: standardDeductions })
      });
      if (res.ok) {
        setPayrollMsg('Standards saved!');
      } else {
        setPayrollMsg('Failed to save standards.');
      }
    } catch {
      setPayrollMsg('Network error.');
    }
    setPayrollLoading(false);
  };

  const handleApplyStandards = async () => {
    setPayrollLoading(true);
    setPayrollMsg('');
    try {
      const res = await fetch('http://localhost:5050/api/payroll/apply-standards-to-all', {
        method: 'POST'
      });
      if (res.ok) {
        setPayrollMsg('Standards applied to all employees!');
      } else {
        setPayrollMsg('Failed to apply standards.');
      }
    } catch {
      setPayrollMsg('Network error.');
    }
    setPayrollLoading(false);
  };

  const handleAssignRole = async (empId, roleId) => {
    setRoleAssignMsg('');
    try {
      // If demoting (roleId is empty string), send null instead
      const payload = roleId === '' ? { roleId: null } : { roleId };
      const res = await fetch(`http://localhost:5050/api/employees/${empId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setRoleAssignMsg('Role assigned!');
        fetchCounts();
      } else {
        const err = await res.json();
        setRoleAssignMsg('Error: ' + (err.error || 'Failed to assign role'));
      }
    } catch {
      setRoleAssignMsg('Network error.');
    }
  };

  return (
    <div className="p-6 space-y-8 bg-background text-foreground dark:bg-gray-900 dark:text-gray-100">
      {/* Admin Features Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card key={index} className="bg-card dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-foreground dark:text-gray-100">{feature.title}</CardTitle>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">{feature.description}</p>
                </div>
                <Icon className="h-8 w-8 text-muted-foreground dark:text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {feature.actions.map((action, actionIndex) => (
                    <Button
                      key={actionIndex}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start bg-background dark:bg-gray-900 text-foreground dark:text-gray-100 border dark:border-gray-700"
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

      {/* System Statistics Card */}
      <Card className="bg-card dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground dark:text-gray-100">System Statistics</CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchCounts} title="Refresh" className="text-foreground dark:text-gray-100">
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {loading ? '...' : counts.superadmin}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Super Admins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {loading ? '...' : counts.admin}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Admins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {loading ? '...' : counts.employee}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Employees</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {loading ? '...' : counts.intern}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Interns</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mark Attendance Card */}
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

      {/* Standard Payroll Values Section */}
      <Card className="max-w-2xl mx-auto mb-8">
        <CardHeader>
          <CardTitle>Standard Payroll Allowances & Deductions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-green-700">Allowances (Monthly)</span>
              <Button size="sm" variant="outline" onClick={handleAddAllowance}>Add Allowance</Button>
            </div>
            <table className="w-full text-sm mb-2">
              <tbody>
                {standardAllowances.map((a, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        className="border rounded px-2 py-1 w-32"
                        value={a.name}
                        onChange={e => handleAllowanceChange(idx, 'name', e.target.value)}
                        placeholder="Name"
                      />
                    </td>
                    <td>
                      <input
                        className="border rounded px-2 py-1 w-24 text-right"
                        type="number"
                        value={a.amount}
                        onChange={e => handleAllowanceChange(idx, 'amount', Number(e.target.value))}
                        placeholder="Amount"
                      />
                    </td>
                    <td>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveAllowance(idx)}><X className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-red-700">Deductions (Monthly)</span>
              <Button size="sm" variant="outline" onClick={handleAddDeduction}>Add Deduction</Button>
            </div>
            <table className="w-full text-sm mb-2">
              <tbody>
                {standardDeductions.map((d, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        className="border rounded px-2 py-1 w-32"
                        value={d.name}
                        onChange={e => handleDeductionChange(idx, 'name', e.target.value)}
                        placeholder="Name"
                      />
                    </td>
                    <td>
                      <input
                        className="border rounded px-2 py-1 w-24 text-right"
                        type="number"
                        value={d.amount}
                        onChange={e => handleDeductionChange(idx, 'amount', Number(e.target.value))}
                        placeholder="Amount"
                      />
                    </td>
                    <td>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveDeduction(idx)}><X className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mb-2">
            <Button size="sm" onClick={handleSaveStandards} disabled={payrollLoading}>Save Standards</Button>
            <Button size="sm" variant="secondary" onClick={handleApplyStandards} disabled={payrollLoading}>Apply Standards to All Employees</Button>
            {payrollLoading && <span className="text-xs text-gray-500 ml-2">Processing...</span>}
          </div>
          {payrollMsg && <div className={`text-xs mb-2 ${payrollMsg.startsWith('Failed') || payrollMsg.startsWith('Network') ? 'text-red-600' : 'text-green-600'}`}>{payrollMsg}</div>}
          <div className="text-xs text-gray-500">These values will be used as defaults for new employees. You can override them per employee.</div>
        </CardContent>
      </Card>

      {/* Custom Role Assignment */}
      <Card className="max-w-2xl mx-auto mb-8">
        <CardHeader>
          <CardTitle>Custom Role Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 text-sm text-gray-500">Assign a custom role to each employee:</div>
          {roleAssignMsg && <div className={`mb-2 text-xs ${roleAssignMsg.startsWith('Role') ? 'text-green-600' : 'text-red-600'}`}>{roleAssignMsg}</div>}
          <table className="w-full text-sm mb-2">
            <thead>
              <tr>
                <th className="text-left">Name</th>
                <th className="text-left">Current Role</th>
                <th className="text-left">Custom Role</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {allEmployees.map(emp => (
                <tr key={emp._id}>
                  <td>{emp.firstname} {emp.lastname}</td>
                  <td>{emp.role}</td>
                  <td>
                    <select
                      value={emp.roleRef || ''}
                      onChange={e => handleAssignRole(emp._id, e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      <option value="">-- Select Role --</option>
                      {roles.map(role => (
                        <option key={role._id} value={role._id}>{role.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {emp.roleRef && roles.find(r => r._id === emp.roleRef) && (
                      <span className="text-xs text-gray-500">{roles.find(r => r._id === emp.roleRef).permissions.join(', ')}</span>
                    )}
                  </td>
                  <td>
                    {/* Demote to Employee button if current custom role is manager */}
                    {emp.roleRef && roles.find(r => r._id === emp.roleRef && r.name.toLowerCase() === 'manager') && (
                      <Button size="sm" variant="outline" onClick={() => handleAssignRole(emp._id, '')}>
                        Demote to Employee
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                      <option value="superadmin">Super Admin</option>
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
