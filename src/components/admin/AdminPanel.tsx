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
  const [editPayroll, setEditPayroll] = useState(false);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollMsg, setPayrollMsg] = useState('');
  const [standardAllowances, setStandardAllowances] = useState([
    { name: 'HRA', amount: 40, calculationType: 'percentage' },
    { name: 'Transport', amount: 2000, calculationType: 'fixed' },
  ]);
  const [standardDeductions, setStandardDeductions] = useState([
    { name: 'PF', amount: 12, calculationType: 'percentage' },
    { name: 'Professional Tax', amount: 200, calculationType: 'fixed' },
  ]);
  const [showEmployeePayroll, setShowEmployeePayroll] = useState(false);

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

  // Fetch standard payroll items
  useEffect(() => {
    const fetchStandardPayroll = async () => {
      try {
        const res = await fetch('http://localhost:5050/api/payroll/standards');
        if (res.ok) {
          const data = await res.json();
          setStandardAllowances(data.allowances || []);
          setStandardDeductions(data.deductions || []);
        }
      } catch (error) {
        console.error('Error fetching standard payroll:', error);
      }
    };
    fetchStandardPayroll();
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
    {
      title: 'Payroll Management',
      description: 'Manage standard allowances and deductions',
      icon: Database,
      actions: [
        { label: 'Edit Standards', onClick: () => setEditPayroll(true) },
        { label: 'Apply to All', onClick: () => handleApplyStandards() },
        { label: 'View Employee Payroll', onClick: () => setShowEmployeePayroll(true) }
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

  const handleSaveStandards = async () => {
    setPayrollLoading(true);
    setPayrollMsg('');
    try {
      // Send complete allowances and deductions arrays with calculationType
      const response = await fetch('http://localhost:5050/api/payroll/standards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowances: standardAllowances,
          deductions: standardDeductions
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Standards saved:', result);
        setPayrollMsg('✅ Standards saved successfully! Note: Users may need to refresh their payroll section to see updated calculations.');
        
        // Optional: Trigger a custom event that the Dashboard can listen to
        window.dispatchEvent(new CustomEvent('payrollStandardsUpdated', {
          detail: { allowances: standardAllowances, deductions: standardDeductions }
        }));
      } else {
        setPayrollMsg('❌ Failed to save standards.');
      }
    } catch (error) {
      console.error('Error saving standards:', error);
      setPayrollMsg('Error saving standards: ' + error.message);
    }
    setPayrollLoading(false);
  };

  const handleAllowanceChange = (index: number, field: 'name' | 'amount' | 'calculationType', value: string | number) => {
    setStandardAllowances(prev => 
      prev.map((item, idx) => 
        idx === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleDeductionChange = (index: number, field: 'name' | 'amount' | 'calculationType', value: string | number) => {
    setStandardDeductions(prev => 
      prev.map((item, idx) => 
        idx === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleAddAllowance = () => {
    setStandardAllowances(prev => [...prev, { name: '', amount: 0, calculationType: 'fixed' }]);
  };

  const handleRemoveAllowance = (index: number) => {
    setStandardAllowances(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddDeduction = () => {
    setStandardDeductions(prev => [...prev, { name: '', amount: 0, calculationType: 'fixed' }]);
  };

  const handleRemoveDeduction = (index: number) => {
    setStandardDeductions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleApplyStandards = async () => {
    setPayrollLoading(true);
    setPayrollMsg('');
    try {
      const res = await fetch('http://localhost:5050/api/payroll/apply-standards-to-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false })
      });
      if (res.ok) {
        const data = await res.json();
        setPayrollMsg(`Standards applied to ${data.updated} employee(s)! Navigate to the Dashboard > Payroll tab to see the updated values.`);
        // Refresh employee data to show updated payroll information
        await fetchCounts();
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

  // --- Org Structure Expand/Collapse State ---
  const [expandedDepts, setExpandedDepts] = useState<{ [dept: string]: boolean }>({});
  // Group employees by department
  const employeesByDept: { [dept: string]: any[] } = {};
  allEmployees.forEach(emp => {
    const dept = emp.department || 'No Department';
    if (!employeesByDept[dept]) employeesByDept[dept] = [];
    employeesByDept[dept].push(emp);
  });
  const toggleDept = (dept: string) => {
    setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 transition-colors duration-300">
      {/* Decorative background shapes */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-200 dark:bg-blue-900 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-pink-200 dark:bg-pink-900 rounded-full opacity-20 blur-3xl" />
      </div>

      {/* Admin Panel Header */}
      <div className="relative z-10 px-6 pt-10 pb-6 flex flex-col items-start gap-2">
        <div className="flex items-center gap-4">
          <Shield className="h-10 w-10 text-blue-600 dark:text-blue-400 drop-shadow" />
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-blue-900 dark:text-blue-200 drop-shadow">Admin Panel</h1>
            <div className="text-lg text-blue-700 dark:text-blue-300 font-medium">Manage users, payroll, attendance, and more</div>
          </div>
        </div>
      </div>
      <hr className="border-blue-200 dark:border-gray-700 mb-8 mx-6" />

      {/* Admin Features Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-6">
        {adminFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card
              key={index}
              className="bg-white/80 dark:bg-gray-800/80 border-2 border-transparent dark:border-gray-700 rounded-2xl shadow-xl hover:scale-[1.03] hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 group"
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-foreground dark:text-gray-100 flex items-center gap-2">
                    <Icon className="h-6 w-6 text-blue-500 dark:text-blue-300" />
                    {feature.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">{feature.description}</p>
                </div>
                <Icon className="h-8 w-8 text-muted-foreground dark:text-gray-400 opacity-30 group-hover:opacity-60 transition-opacity" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {feature.actions.map((action, actionIndex) => (
                    <Button
                      key={actionIndex}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start bg-background dark:bg-gray-900 text-foreground dark:text-gray-100 border dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition"
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

      {/* Section: System Statistics */}
      <div className="relative z-10 px-6 mt-12">
        <Card className="bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground dark:text-gray-100 flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-500 dark:text-purple-300" />
              System Statistics
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchCounts} title="Refresh" className="text-foreground dark:text-gray-100">
              <RefreshCw className={loading ? "animate-spin" : ""} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex flex-col items-center">
                <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 drop-shadow">{loading ? '...' : counts.superadmin}</div>
                <div className="mt-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-xs font-semibold">Super Admins</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-extrabold text-green-600 dark:text-green-400 drop-shadow">{loading ? '...' : counts.admin}</div>
                <div className="mt-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-xs font-semibold">Admins</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-extrabold text-yellow-600 dark:text-yellow-400 drop-shadow">{loading ? '...' : counts.employee}</div>
                <div className="mt-1 px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 text-xs font-semibold">Employees</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 drop-shadow">{loading ? '...' : counts.intern}</div>
                <div className="mt-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 text-xs font-semibold">Interns</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section: Attendance */}
      <div className="relative z-10 px-6 mt-12">
        <Card className="bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-gray-100 flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-500 dark:text-green-300" />
              Mark Employee Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-4">
              <label className="font-semibold text-foreground dark:text-gray-100" htmlFor="attendance-date">Select Date:</label>
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
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow">
              <table className="min-w-full text-sm bg-background dark:bg-gray-900 rounded-xl overflow-hidden">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-2 py-2 text-left text-foreground dark:text-gray-100">Name</th>
                    <th className="px-2 py-2 text-left text-foreground dark:text-gray-100">Email</th>
                    <th className="px-2 py-2 text-left text-foreground dark:text-gray-100">Role</th>
                    <th className="px-2 py-2 text-left text-foreground dark:text-gray-100">Status</th>
                    <th className="px-2 py-2 text-left text-foreground dark:text-gray-100">Present</th>
                    <th className="px-2 py-2 text-left text-foreground dark:text-gray-100">Absent</th>
                  </tr>
                </thead>
                <tbody>
                  {allEmployees.map((emp, idx) => {
                    const status = getAttendanceStatus(emp);
                    return (
                      <tr
                        key={emp._id}
                        className={`border-b border-gray-200 dark:border-gray-700 transition
                          ${idx % 2 === 0 ? 'bg-blue-50/40 dark:bg-gray-800/40' : 'bg-white/60 dark:bg-gray-900/60'}
                          hover:bg-blue-100 dark:hover:bg-gray-800`}
                      >
                        <td className="px-2 py-2 text-foreground dark:text-gray-100 flex items-center gap-2">
                          {emp.firstname} {emp.lastname}
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold
                            ${emp.role === 'superadmin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                              : emp.role === 'admin' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                              : emp.role === 'employee' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                            }`}>
                            {emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-foreground dark:text-gray-100">{emp.email}</td>
                        <td className="px-2 py-2 text-foreground dark:text-gray-100">{emp.role}</td>
                        <td className="px-2 py-2">
                          {status === 'present' && <span className="text-green-600 dark:text-green-400 font-semibold">Present</span>}
                          {status === 'absent' && <span className="text-red-600 dark:text-red-400 font-semibold">Absent</span>}
                          {!status && <span className="text-muted-foreground dark:text-gray-400">Not Marked</span>}
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            size="sm"
                            className="bg-green-600 text-white dark:bg-green-700 rounded-lg shadow hover:scale-105 transition"
                            disabled={attendanceMarking[emp._id] || !!status}
                            onClick={() => markAttendance(emp._id, 'present')}
                          >
                            Present
                          </Button>
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            size="sm"
                            className="bg-red-600 text-white dark:bg-red-700 rounded-lg shadow hover:scale-105 transition"
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
      </div>

      {/* Section Divider */}
      <div className="relative z-10 flex items-center gap-2 my-12 px-6">
        <Settings className="h-5 w-5 text-indigo-500 dark:text-indigo-300" />
        <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-200">Payroll & Roles</h2>
        <div className="flex-1 border-t border-indigo-200 dark:border-indigo-700" />
      </div>

      {/* Standard Payroll Values Section */}
      <div className="relative z-10 px-6">
        <Card className="w-full mb-12 bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-gray-100 flex items-center gap-2">
              <Database className="h-5 w-5 text-pink-500 dark:text-pink-300" />
              Standard Payroll Allowances & Deductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-green-700 dark:text-green-400">Allowances (Monthly)</span>
                <Button size="sm" variant="outline" className="dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700" onClick={handleAddAllowance}>Add Allowance</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full text-sm mb-2 bg-background dark:bg-gray-900 border dark:border-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="px-3 py-2 text-left border-b dark:border-gray-700">Name</th>
                      <th className="px-3 py-2 text-left border-b dark:border-gray-700">Amount/Percentage</th>
                      <th className="px-3 py-2 text-left border-b dark:border-gray-700">Type</th>
                      <th className="px-3 py-2 text-center border-b dark:border-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standardAllowances.map((a, idx) => (
                      <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="px-3 py-2">
                          <input
                            className="border rounded px-2 py-1 w-32 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                            value={a.name}
                            onChange={e => handleAllowanceChange(idx, 'name', e.target.value)}
                            placeholder="Name"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              className="border rounded px-2 py-1 w-24 text-right bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                              type="number"
                              value={a.amount}
                              onChange={e => handleAllowanceChange(idx, 'amount', Number(e.target.value))}
                              placeholder="Amount"
                            />
                            <span className="text-sm text-gray-500">
                              {a.calculationType === 'percentage' ? '%' : '₹'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="border rounded px-2 py-1 w-28 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                            value={a.calculationType || 'fixed'}
                            onChange={e => handleAllowanceChange(idx, 'calculationType', e.target.value)}
                          >
                            <option value="fixed">Fixed (₹)</option>
                            <option value="percentage">Percentage (%)</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button size="icon" variant="ghost" className="dark:text-gray-400" onClick={() => handleRemoveAllowance(idx)}><X className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-red-700 dark:text-red-400">Deductions (Monthly)</span>
                <Button size="sm" variant="outline" className="dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700" onClick={handleAddDeduction}>Add Deduction</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full text-sm mb-2 bg-background dark:bg-gray-900 border dark:border-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="px-3 py-2 text-left border-b dark:border-gray-700">Name</th>
                      <th className="px-3 py-2 text-left border-b dark:border-gray-700">Amount/Percentage</th>
                      <th className="px-3 py-2 text-left border-b dark:border-gray-700">Type</th>
                      <th className="px-3 py-2 text-center border-b dark:border-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standardDeductions.map((d, idx) => (
                      <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="px-3 py-2">
                          <input
                            className="border rounded px-2 py-1 w-32 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                            value={d.name}
                            onChange={e => handleDeductionChange(idx, 'name', e.target.value)}
                            placeholder="Name"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              className="border rounded px-2 py-1 w-24 text-right bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                              type="number"
                              value={d.amount}
                              onChange={e => handleDeductionChange(idx, 'amount', Number(e.target.value))}
                              placeholder="Amount"
                            />
                            <span className="text-sm text-gray-500">
                              {d.calculationType === 'percentage' ? '%' : '₹'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="border rounded px-2 py-1 w-28 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                            value={d.calculationType || 'fixed'}
                            onChange={e => handleDeductionChange(idx, 'calculationType', e.target.value)}
                          >
                            <option value="fixed">Fixed (₹)</option>
                            <option value="percentage">Percentage (%)</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button size="icon" variant="ghost" className="dark:text-gray-400" onClick={() => handleRemoveDeduction(idx)}><X className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex gap-2 mb-2">
              <Button size="sm" className="dark:bg-gray-700 dark:text-gray-100" onClick={handleSaveStandards} disabled={payrollLoading}>Save Standards</Button>
              <Button size="sm" variant="secondary" className="dark:bg-gray-700 dark:text-gray-100" onClick={handleApplyStandards} disabled={payrollLoading}>Apply Standards to All Employees</Button>
              {payrollLoading && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">Processing...</span>}
            </div>
            {payrollMsg && <div className={`text-xs mb-2 ${payrollMsg.startsWith('Failed') || payrollMsg.startsWith('Network') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{payrollMsg}</div>}
            <div className="text-xs text-gray-500 dark:text-gray-400">These values will be used as defaults for new employees. You can override them per employee.</div>
          </CardContent>
        </Card>
      </div>

      {/* Org Structure Section: Expand/Collapse by Department */}
      <div className="relative z-10 px-6 mt-12">
        <Card className="bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-gray-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500 dark:text-blue-300" />
              Organization Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.keys(employeesByDept).length === 0 && (
                <div className="text-muted-foreground dark:text-gray-400 py-4">No employees found.</div>
              )}
              {Object.entries(employeesByDept).map(([dept, emps]) => (
                <div key={dept}>
                  <button
                    className="w-full flex items-center justify-between py-3 px-2 text-lg font-semibold text-left text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-gray-800 rounded transition"
                    onClick={() => toggleDept(dept)}
                  >
                    <span>{dept}</span>
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">({emps.length} member{emps.length !== 1 ? 's' : ''})</span>
                    <span className="ml-auto">
                      {expandedDepts[dept] ? (
                        <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                      ) : (
                        <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      )}
                    </span>
                  </button>
                  {expandedDepts[dept] && (
                    <div className="pl-6 pb-4">
                      <ul className="space-y-2">
                        {emps.map(emp => (
                          <li key={emp._id} className="flex items-center gap-3 bg-blue-50/40 dark:bg-gray-900/40 rounded-lg px-3 py-2">
                            {/* Avatar or initials */}
                            {emp.picture ? (
                              <img src={emp.picture} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-700" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-700 flex items-center justify-center text-blue-900 dark:text-blue-100 font-bold text-sm">
                                {emp.firstname?.[0]}{emp.lastname?.[0]}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-foreground dark:text-gray-100">{emp.firstname} {emp.lastname}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{emp.email}</div>
                            </div>
                            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold
                              ${emp.role === 'superadmin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                                : emp.role === 'admin' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                                : emp.role === 'employee' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                              }`}>
                              {emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Roles Dialog */}
      {showEditRolesDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 dark:bg-black dark:bg-opacity-70">
          <div className="bg-background dark:bg-gray-900 text-foreground dark:text-gray-100 rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative overflow-y-auto max-h-[90vh] border border-gray-200 dark:border-gray-700">
            <button
              className="absolute top-2 right-2 text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-gray-100"
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
                <div className="text-muted-foreground dark:text-gray-400 text-center">No users found.</div>
              ) : (
                allEmployees.map(emp => (
                  <div key={emp._id} className="flex items-center justify-between border-b border-muted dark:border-gray-700 py-2">
                    <div>
                      <div className="font-semibold">{emp.firstname} {emp.lastname}</div>
                      <div className="text-xs text-muted-foreground dark:text-gray-400 break-all">{emp.email}</div>
                    </div>
                    <select
                      value={editRoles[emp._id] || emp.role}
                      onChange={e => handleRoleSelect(emp._id, e.target.value)}
                      className="border rounded px-2 py-1 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
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
              <Button variant="outline" className="dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700" onClick={() => setShowEditRolesDialog(false)} disabled={savingRoles}>Cancel</Button>
              <Button className="dark:bg-gray-700 dark:text-gray-100" onClick={handleSaveRoles} disabled={savingRoles}>
                {savingRoles ? 'Saving...' : 'Save All'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Deactivate Users Dialog */}
      {showDeactivateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 dark:bg-black dark:bg-opacity-70">
          <div className="bg-background dark:bg-gray-900 text-foreground dark:text-gray-100 rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative overflow-y-auto max-h-[90vh] border border-gray-200 dark:border-gray-700">
            <button
              className="absolute top-2 right-2 text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-gray-100"
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
                <div className="text-muted-foreground dark:text-gray-400 text-center">No active users found.</div>
              ) : (
                activeUsers.map(emp => (
                  <div key={emp._id} className="flex items-center justify-between border-b border-muted dark:border-gray-700 py-2">
                    <div>
                      <div className="font-semibold">{emp.firstname} {emp.lastname}</div>
                      <div className="text-xs text-muted-foreground dark:text-gray-400 break-all">{emp.email}</div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="dark:bg-red-700 dark:text-gray-100"
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
              <Button variant="outline" className="dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700" onClick={() => setShowDeactivateDialog(false)} disabled={deactivateLoading}>Close</Button>
            </div>
          </div>
        </div>
      )}
      {/* Deactivate Confirmation Dialog */}
      {confirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 dark:bg-black dark:bg-opacity-70">
          <div className="bg-background dark:bg-gray-900 text-foreground dark:text-gray-100 rounded-2xl shadow-2xl w-full max-w-xs p-6 relative border border-gray-200 dark:border-gray-700">
            <button
              className="absolute top-2 right-2 text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-gray-100"
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
              <Button variant="outline" className="dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700" onClick={() => setConfirmUser(null)} disabled={deactivateLoading}>Cancel</Button>
              <Button
                variant="destructive"
                className="dark:bg-red-700 dark:text-gray-100"
                onClick={() => handleDeactivate(confirmUser._id)}
                disabled={deactivateLoading}
              >
                {deactivateLoading ? 'Deactivating...' : 'Deactivate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Standards Edit Dialog */}
      {editPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setEditPayroll(false)}
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Manage Standard Payroll</h2>
            
            {payrollMsg && (
              <div className={`mb-4 p-3 rounded text-sm ${
                payrollMsg.startsWith('Error') || payrollMsg.includes('failed')
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}>
                {payrollMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Allowances Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-green-700 dark:text-green-300">Standard Allowances</h3>
                <div className="space-y-3">
                  {standardAllowances.map((allowance, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <input
                        type="text"
                        value={allowance.name}
                        onChange={(e) => handleAllowanceChange(idx, 'name', e.target.value)}
                        placeholder="Allowance name"
                        className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <span className="text-gray-600 dark:text-gray-400">₹</span>
                      <input
                        type="number"
                        value={allowance.amount}
                        onChange={(e) => handleAllowanceChange(idx, 'amount', Number(e.target.value))}
                        placeholder="Amount"
                        className="w-24 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <button
                        onClick={() => handleRemoveAllowance(idx)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddAllowance}
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                >
                  Add Allowance
                </button>
              </div>

              {/* Deductions Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-red-700 dark:text-red-300">Standard Deductions</h3>
                <div className="space-y-3">
                  {standardDeductions.map((deduction, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <input
                        type="text"
                        value={deduction.name}
                        onChange={(e) => handleDeductionChange(idx, 'name', e.target.value)}
                        placeholder="Deduction name"
                        className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <span className="text-gray-600 dark:text-gray-400">₹</span>
                      <input
                        type="number"
                        value={deduction.amount}
                        onChange={(e) => handleDeductionChange(idx, 'amount', Number(e.target.value))}
                        placeholder="Amount"
                        className="w-24 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <button
                        onClick={() => handleRemoveDeduction(idx)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddDeduction}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                >
                  Add Deduction
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div>
                <button
                  onClick={handleApplyStandards}
                  disabled={payrollLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {payrollLoading ? 'Applying...' : 'Apply to Employees'}
                </button>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Apply current standards to employees who don't have payroll data
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditPayroll(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveStandards}
                  disabled={payrollLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
                >
                  {payrollLoading ? 'Saving...' : 'Save Standards'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Payroll Details Dialog */}
      {showEmployeePayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-6xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setShowEmployeePayroll(false)}
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Employee Payroll Details</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100">Employee</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100">Base Salary</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100">Allowances</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100">Deductions</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100">Total Allowances</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100">Total Deductions</th>
                  </tr>
                </thead>
                <tbody>
                  {allEmployees.map((emp, idx) => {
                    const totalAllowances = Array.isArray(emp.allowances) 
                      ? emp.allowances.reduce((sum: number, a: any) => sum + (a.amount || 0), 0)
                      : 0;
                    const totalDeductions = Array.isArray(emp.deductions) 
                      ? emp.deductions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
                      : 0;
                    
                    return (
                      <tr
                        key={emp._id}
                        className={`border-b border-gray-200 dark:border-gray-700 ${
                          idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-900'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {emp.firstname} {emp.lastname}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{emp.email}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{emp.role} • {emp.department}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-semibold">
                          ₹{(emp.salary || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          {Array.isArray(emp.allowances) && emp.allowances.length > 0 ? (
                            <div className="space-y-1">
                              {emp.allowances.map((allowance: any, idx: number) => (
                                <div key={idx} className="text-xs">
                                  <span className="font-medium text-green-700 dark:text-green-300">
                                    {allowance.name}:
                                  </span>
                                  <span className="ml-1 text-gray-700 dark:text-gray-300">
                                    ₹{allowance.amount}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 text-xs">No allowances</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {Array.isArray(emp.deductions) && emp.deductions.length > 0 ? (
                            <div className="space-y-1">
                              {emp.deductions.map((deduction: any, idx: number) => (
                                <div key={idx} className="text-xs">
                                  <span className="font-medium text-red-700 dark:text-red-300">
                                    {deduction.name}:
                                  </span>
                                  <span className="ml-1 text-gray-700 dark:text-gray-300">
                                    ₹{deduction.amount}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 text-xs">No deductions</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-green-700 dark:text-green-300 font-semibold">
                          ₹{totalAllowances.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-red-700 dark:text-red-300 font-semibold">
                          ₹{totalDeductions.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowEmployeePayroll(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
