import { useEffect, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import EmployeeList from '../employees/EmployeeList';
import EmployeeForm from '../employees/EmployeeForm';
import AdminPanel from '../admin/AdminPanel';
import Reports from '../reports/Reports';
import Settings from '../settings/Settings';
import { Navigate, useLocation } from 'react-router-dom';
import EmployeePersonalDetails from '../employees/EmployeePersonalDetails';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import AttendanceCalendar from '../attendance/AttendanceCalendar';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'employee';
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}
// src/components/auth/protectedroute.tsx


const ProtectedRoute = ({ user, allowedRoles, children }) => {
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" />;
  }
  return children;
};

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loginTime, setLoginTime] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [employees, setEmployees] = useState<any[]>([]);
  const [welcomeName, setWelcomeName] = useState<string>('');

  useEffect(() => {
    // Fetch login time for the current user
    const fetchLoginTime = async () => {
      try {
        const res = await fetch(`http://localhost:5050/api/employees`);
        const employees = await res.json();
        const emp = employees.find((e: any) => e.email === user.email);
        if (emp && emp.lastLogin) {
          setLoginTime(emp.lastLogin);
        } else {
          setLoginTime(null);
        }
        // Always update user.id to the real MongoDB ObjectId if found
        if (emp && emp._id && user.id !== emp._id) {
          // Instead of mutating the prop, store the id in state
          setUserId(emp._id);
        }
      } catch {
        setLoginTime(null);
      }
    };
    fetchLoginTime();
  }, [user.email]);

  // Fetch clock-in/out times for the current user
  useEffect(() => {
    const fetchClockTimes = async () => {
      try {
        const res = await fetch(`http://localhost:5050/api/employees`);
        const employees = await res.json();
        const emp = employees.find((e: any) => e.email === user.email);
        if (emp) {
          setClockInTime(emp.clockInTime || null);
          setClockOutTime(emp.clockOutTime || null);
          setIsClockedIn(!!emp.clockInTime && !emp.clockOutTime);
        }
      } catch {
        setClockInTime(null);
        setClockOutTime(null);
        setIsClockedIn(false);
      }
    };
    fetchClockTimes();
  }, [user.email]);

  // Add a state for userId and use it everywhere instead of user.id
  const [userId, setUserId] = useState(user.id);

  // Ensure userId is always up to date with the latest employee data
  useEffect(() => {
    const fetchAndSetUserId = async () => {
      try {
        const res = await fetch(`http://localhost:5050/api/employees`);
        const employees = await res.json();
        const emp = employees.find((e: any) => e.email === user.email);
        if (emp && emp._id) {
          setUserId(emp._id);
        }
      } catch {}
    };
    fetchAndSetUserId();
  }, [user.email]);

  // Only allow clock in/out if userId is a valid MongoDB ObjectId
  const isValidObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id);

  const handleClockIn = async () => {
    if (!isValidObjectId(userId)) {
      alert('Invalid user ID. Please contact admin.');
      return;
    }
    try {
      const resp = await fetch(`http://localhost:5050/api/employees/${userId}/clockin`, { method: 'POST' });
      const data = await resp.json();
      if (data.error) {
        alert('Clock In failed: ' + data.error);
        return;
      }
      // Fetch latest clock-in/out times from backend
      const res = await fetch(`http://localhost:5050/api/employees`);
      const employees = await res.json();
      const emp = employees.find((e: any) => e.email === user.email);
      if (emp) {
        setIsClockedIn(!!emp.clockInTime && !emp.clockOutTime);
        setClockInTime(emp.clockInTime || null);
        setClockOutTime(emp.clockOutTime || null);
      }
    } catch (err) {
      alert('Clock In failed. Please try again.');
    }
  };
  const handleClockOut = async () => {
    if (!isValidObjectId(userId)) {
      alert('Invalid user ID. Please contact admin.');
      return;
    }
    try {
      const resp = await fetch(`http://localhost:5050/api/employees/${userId}/clockout`, { method: 'POST' });
      const data = await resp.json();
      if (data.error) {
        alert('Clock Out failed: ' + data.error);
        return;
      }
      // Fetch latest clock-in/out times from backend
      const res = await fetch(`http://localhost:5050/api/employees`);
      const employees = await res.json();
      const emp = employees.find((e: any) => e.email === user.email);
      if (emp) {
        setIsClockedIn(!!emp.clockInTime && !emp.clockOutTime);
        setClockInTime(emp.clockInTime || null);
        setClockOutTime(emp.clockOutTime || null);
      }
    } catch (err) {
      alert('Clock Out failed. Please try again.');
    }
  };

  // Update timesheet every minute if clocked in
  useEffect(() => {
    if (!isClockedIn || !clockInTime) return;
    const interval = setInterval(() => {
      // Force re-render to update the timesheet
      setClockInTime((prev) => prev ? prev : clockInTime);
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [isClockedIn, clockInTime]);

  // Update timesheet every second if clocked in
  useEffect(() => {
    if (!isClockedIn || !clockInTime) return;
    const interval = setInterval(() => {
      setClockInTime((prev) => prev ? prev : clockInTime);
    }, 1000); // 1 second
    return () => clearInterval(interval);
  }, [isClockedIn, clockInTime]);

  useEffect(() => {
    if (isClockedIn && clockInTime && !clockOutTime) {
      // Calculate initial elapsed time
      const clockInDate = new Date(clockInTime);
      setElapsedMs(Date.now() - clockInDate.getTime());
      // Start interval
      const interval = setInterval(() => {
        setElapsedMs(Date.now() - clockInDate.getTime());
      }, 1000);
      return () => clearInterval(interval);
    } else if (clockInTime && clockOutTime) {
      // If clocked out, show total duration
      const clockInDate = new Date(clockInTime);
      const clockOutDate = new Date(clockOutTime);
      setElapsedMs(Math.max(0, clockOutDate.getTime() - clockInDate.getTime()));
    } else {
      setElapsedMs(0);
    }
  }, [isClockedIn, clockInTime, clockOutTime]);

  // Defensive: If clockInTime is in the future, reset to 0
  useEffect(() => {
    if (isClockedIn && clockInTime && !clockOutTime) {
      const clockInDate = new Date(clockInTime);
      if (Date.now() < clockInDate.getTime()) {
        setElapsedMs(0);
      }
    }
  }, [isClockedIn, clockInTime, clockOutTime]);

  // Fetch employees
  const fetchEmployees = async () => {
    const res = await fetch('http://localhost:5050/api/employees');
    const data = await res.json();
    setEmployees(data);
    if (data.length > 0) {
      // Find the latest added employee (assuming last in array is latest)
      const latest = data[data.length - 1];
      setWelcomeName(`${latest.firstname} ${latest.lastname}`);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Set admin panel tab if navigated from View Users
  useEffect(() => {
    if (location.state && (location.state as any).adminPanel) {
      setActiveTab('admin-panel');
    }
    // eslint-disable-next-line
  }, [location.state]);

  // Unified dashboard for all roles
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        // Calculate time since clock-in
        let timesheetDisplay = '0h 0m 0s';
        if (clockInTime) {
          const totalMs = elapsedMs;
          const hours = Math.floor(totalMs / (1000 * 60 * 60));
          const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
          const seconds = Math.floor((totalMs / 1000) % 60);
          timesheetDisplay = `${hours}h ${minutes}m ${seconds}s`;
        }
        return (
          <div className="p-4 md:p-8">
            <h2 className="text-2xl font-bold mb-6">Welcome to your Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Timesheet Widget */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Timesheet</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600 mb-2">{timesheetDisplay}</div>
                  <div className="text-muted-foreground mb-2">{isClockedIn ? 'Clocked in' : clockInTime && clockOutTime ? 'Clocked out' : 'Not clocked in yet'}</div>
                  <div className="flex space-x-2">
                    <button
                      className="px-4 py-2 rounded bg-green-600 text-white font-semibold disabled:opacity-50"
                      onClick={handleClockIn}
                      disabled={isClockedIn}
                    >
                      Clock In
                    </button>
                    <button
                      className="px-4 py-2 rounded bg-red-600 text-white font-semibold disabled:opacity-50"
                      onClick={handleClockOut}
                      disabled={!isClockedIn}
                    >
                      Clock Out
                    </button>
                  </div>
                </CardContent>
              </Card>
              {/* On Leave Today Widget */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>On Leave Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600 mb-2">2</div>
                  <div className="text-muted-foreground">Employees on leave</div>
                </CardContent>
              </Card>
              {/* Holidays Widget */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Upcoming Holidays</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-muted-foreground space-y-1">
                    <li>Independence Day - 15 Aug</li>
                    <li>Raksha Bandhan - 19 Aug</li>
                    <li>Janmashtami - 26 Aug</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Welcome New Employees Widget */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Welcome New Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-muted-foreground space-y-1">
                    {employees.length === 0 ? (
                      <li>No employees found.</li>
                    ) : (
                      employees.map(emp => (
                        <li key={emp._id}>
                          {emp.firstname} {emp.lastname} ({emp.department || 'N/A'})
                        </li>
                      ))
                    )}
                  </ul>
                </CardContent>
              </Card>
              {/* Working Remotely Widget */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Working Remotely</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-2">4</div>
                  <div className="text-muted-foreground">Employees remote today</div>
                </CardContent>
              </Card>
              {/* Attendance Widget */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="text-2xl font-bold text-green-600">96%</div>
                      <div className="text-muted-foreground text-sm">Present</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-500">4%</div>
                      <div className="text-muted-foreground text-sm">Absent</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Announcements Widget */}
              <Card>
                <CardHeader>
                  <CardTitle>Announcements</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No new announcements.</p>
                </CardContent>
              </Card>
              {/* Quick Links Widget */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc ml-6 text-blue-700 dark:text-blue-400 space-y-1">
                    <li className="cursor-pointer hover:underline" onClick={() => setActiveTab('attendance')}>Attendance</li>
                    <li className="cursor-pointer hover:underline" onClick={() => setActiveTab('leaves')}>Leaves</li>
                    <li className="cursor-pointer hover:underline" onClick={() => setActiveTab('payroll')}>Payroll</li>
                    <li className="cursor-pointer hover:underline" onClick={() => setActiveTab('projects')}>Projects</li>
                    <li className="cursor-pointer hover:underline" onClick={() => setActiveTab('teams')}>Teams</li>
                    <li className="cursor-pointer hover:underline" onClick={() => setActiveTab('awards')}>Awards</li>
                    <li className="cursor-pointer hover:underline" onClick={() => setActiveTab('performance')}>Performance</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 'personal-details':
        return <EmployeePersonalDetails user={user} />;
      case 'employees':
        return <EmployeeList userRole={user.role} />;
      case 'add-employee':
        return (user.role === 'super_admin' || user.role === 'admin') ? <EmployeeForm onEmployeeAdded={fetchEmployees} /> : <EmployeeList userRole={user.role} />;
      case 'admin-panel':
        return <AdminPanel userRole={user.role} />;
      case 'reports':
        return <Reports userRole={user.role} />;
      case 'settings':
        return <Settings userRole={user.role} userId={userId} />;
      case 'attendance':
        // If employee, show calendar attendance view
        if (user.role === 'employee') {
          return (
            <div className="p-8">
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>My Attendance Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Simple calendar grid for current month, mark today as present, rest as absent for demo */}
                  <AttendanceCalendar user={user} />
                </CardContent>
              </Card>
            </div>
          );
        }
        // Admins and super admins see the same attendance summary as before
        return (
          <div className="p-8">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Attendance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 text-lg font-semibold">Today's Attendance</div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-green-100 dark:bg-green-900 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-200">Present</div>
                    <div className="text-3xl font-bold text-foreground">12</div>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-200">Absent</div>
                    <div className="text-3xl font-bold text-foreground">3</div>
                  </div>
                </div>
                <div className="mb-2 font-semibold">Recent Clock-ins</div>
                <ul className="divide-y divide-border">
                  <li className="py-2 flex justify-between">
                    <span>John Doe</span>
                    <span className="text-muted-foreground">09:05 AM</span>
                  </li>
                  <li className="py-2 flex justify-between">
                    <span>Priya Sharma</span>
                    <span className="text-muted-foreground">09:10 AM</span>
                  </li>
                  <li className="py-2 flex justify-between">
                    <span>Rohit Mehra</span>
                    <span className="text-muted-foreground">09:12 AM</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );
      case 'leaves':
        // Leaves feature: show leave balance, request leave, and leave history
        return (
          <div className="p-8">
            <Card className="max-w-2xl mx-auto mb-8">
              <CardHeader>
                <CardTitle>My Leave Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-200">12</div>
                    <div className="text-muted-foreground text-sm">Annual Leaves</div>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-200">5</div>
                    <div className="text-muted-foreground text-sm">Sick Leaves</div>
                  </div>
                </div>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Leave Type</label>
                    <select className="w-full border rounded px-3 py-2 bg-background text-foreground">
                      <option>Annual</option>
                      <option>Sick</option>
                      <option>Unpaid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">From</label>
                    <input type="date" className="w-full border rounded px-3 py-2 bg-background text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">To</label>
                    <input type="date" className="w-full border rounded px-3 py-2 bg-background text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Reason</label>
                    <textarea className="w-full border rounded px-3 py-2 bg-background text-foreground" rows={2} placeholder="Reason for leave" />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-semibold">Request Leave</button>
                </form>
              </CardContent>
            </Card>
            <Card className="max-w-2xl mx-auto bg-card text-foreground">
              <CardHeader>
                <CardTitle>Leave History</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  <li className="py-2 flex justify-between">
                    <span>2025-05-10 to 2025-05-12</span>
                    <span className="text-green-600 dark:text-green-400">Approved</span>
                  </li>
                  <li className="py-2 flex justify-between">
                    <span>2025-04-01 to 2025-04-01</span>
                    <span className="text-yellow-600 dark:text-yellow-400">Pending</span>
                  </li>
                  <li className="py-2 flex justify-between">
                    <span>2025-03-15 to 2025-03-16</span>
                    <span className="text-red-600 dark:text-red-400">Rejected</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );
      case 'payroll':
        // Payroll feature: show salary details and payslip download
        return (
          <div className="p-8">
            <Card className="max-w-2xl mx-auto mb-8">
              <CardHeader>
                <CardTitle>My Salary Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Base Salary:</span>
                    <span>₹50,000</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Allowances:</span>
                    <span>₹5,000</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Deductions:</span>
                    <span>-₹2,000</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Net Pay:</span>
                    <span>₹53,000</span>
                  </div>
                </div>
                <button className="px-4 py-2 bg-green-600 text-white rounded font-semibold">Download Payslip (PDF)</button>
              </CardContent>
            </Card>
            <Card className="max-w-2xl mx-auto bg-card text-foreground">
              <CardHeader>
                <CardTitle>Payslip History</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  <li className="py-2 flex justify-between">
                    <span>May 2025</span>
                    <button className="text-blue-600 dark:text-blue-400 underline">Download</button>
                  </li>
                  <li className="py-2 flex justify-between">
                    <span>April 2025</span>
                    <button className="text-blue-600 dark:text-blue-400 underline">Download</button>
                  </li>
                  <li className="py-2 flex justify-between">
                    <span>March 2025</span>
                    <button className="text-blue-600 dark:text-blue-400 underline">Download</button>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );
      case 'projects':
        return (
          <div className="p-8">
            <Card className="max-w-3xl mx-auto mb-8 bg-card text-foreground">
              <CardHeader>
                <CardTitle>Add New Project</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Project Name</label>
                    <input className="w-full border rounded px-3 py-2 bg-background text-foreground" placeholder="Enter project name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Description</label>
                    <textarea className="w-full border rounded px-3 py-2 bg-background text-foreground" placeholder="Describe the project" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Team</label>
                    <input className="w-full border rounded px-3 py-2 bg-background text-foreground" placeholder="Team name or members" />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-semibold">Add Project</button>
                </form>
              </CardContent>
            </Card>
            <Card className="max-w-3xl mx-auto bg-card text-foreground">
              <CardHeader>
                <CardTitle>Ongoing Company Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  <li className="py-3">
                    <div className="font-semibold text-foreground">HR Management System</div>
                    <div className="text-sm text-muted-foreground">Team: HR, Dev</div>
                    <div className="text-xs text-muted-foreground">A platform for employee management, attendance, and payroll.</div>
                  </li>
                  <li className="py-3">
                    <div className="font-semibold text-foreground">Client Portal</div>
                    <div className="text-sm text-muted-foreground">Team: Client Success, Dev</div>
                    <div className="text-xs text-muted-foreground">A portal for clients to track project progress and invoices.</div>
                  </li>
                  <li className="py-3">
                    <div className="font-semibold text-foreground">Mobile App Redesign</div>
                    <div className="text-sm text-muted-foreground">Team: Mobile, UI/UX</div>
                    <div className="text-xs text-muted-foreground">Revamping the company mobile app for better user experience.</div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );
      case 'teams':
        // Teams feature: show team members and allow team creation
        return (
          <div className="p-8">
            <Card className="max-w-2xl mx-auto mb-8 bg-card text-foreground">
              <CardHeader>
                <CardTitle>My Team</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border mb-4">
                  <li className="py-2 flex justify-between">
                    <span>Priya Sharma</span>
                    <span className="text-muted-foreground">HR</span>
                  </li>
                  <li className="py-2 flex justify-between">
                    <span>Rohit Mehra</span>
                    <span className="text-muted-foreground">Developer</span>
                  </li>
                  <li className="py-2 flex justify-between">
                    <span>John Doe</span>
                    <span className="text-muted-foreground">Designer</span>
                  </li>
                </ul>
                {(user.role === 'super_admin' || user.role === 'admin') && (
                  <form className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Add Team Member</label>
                      <input className="w-full border rounded px-3 py-2 bg-background text-foreground" placeholder="Enter name or email" />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-semibold">Add Member</button>
                  </form>
                )}
              </CardContent>
            </Card>
            {(user.role === 'super_admin' || user.role === 'admin') && (
              <Card className="max-w-2xl mx-auto bg-card text-foreground">
                <CardHeader>
                  <CardTitle>Create New Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Team Name</label>
                      <input className="w-full border rounded px-3 py-2 bg-background text-foreground" placeholder="Team name" />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-semibold">Create Team</button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        );
      case 'awards':
        // Awards feature: show awards and allow nomination
        return (
          <div className="p-8">
            <Card className="max-w-2xl mx-auto mb-8 bg-card text-foreground">
              <CardHeader>
                <CardTitle>My Awards</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border mb-4">
                  <li className="py-2 flex justify-between">
                    <span>Employee of the Month</span>
                    <span className="text-green-600">May 2025</span>
                  </li>
                  <li className="py-2 flex justify-between">
                    <span>Best Team Player</span>
                    <span className="text-blue-600">March 2025</span>
                  </li>
                </ul>
                {(user.role === 'super_admin' || user.role === 'admin') && (
                  <form className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Nominate a Colleague</label>
                      <input className="w-full border rounded px-3 py-2 bg-background text-foreground" placeholder="Enter name or email" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Award</label>
                      <input className="w-full border rounded px-3 py-2 bg-background text-foreground" placeholder="Award name" />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-yellow-500 text-white rounded font-semibold">Nominate</button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case 'performance':
        // Performance feature: show performance summary and feedback
        return (
          <div className="p-8">
            <Card className="max-w-2xl mx-auto mb-8 bg-card text-foreground">
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Attendance:</span>
                    <span>96%</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Projects Completed:</span>
                    <span>8</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Peer Rating:</span>
                    <span>4.7/5</span>
                  </div>
                </div>
                <div className="mb-2 font-semibold">Manager Feedback</div>
                <div className="bg-muted rounded p-3 mb-4 text-muted-foreground">
                  Great work this quarter! Keep up the excellent performance and teamwork.
                </div>
                <form className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Self-Review</label>
                    <textarea className="w-full border rounded px-3 py-2 bg-background text-foreground" rows={2} placeholder="Write your self-review..." />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-semibold">Submit Review</button>
                </form>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return <div className="p-8">Coming soon...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header user={user} onLogout={onLogout} />
      <div className="flex">
        <Sidebar 
          userRole={user.role} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
