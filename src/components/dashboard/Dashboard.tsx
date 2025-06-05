import { useEffect, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import EmployeeList from '../employees/EmployeeList';
import EmployeeForm from '../employees/EmployeeForm';
import AdminPanel from '../admin/AdminPanel';
import Reports from '../reports/Reports';
import Settings from '../settings/Settings';
import { Navigate } from 'react-router-dom';
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loginTime, setLoginTime] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(false);

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

  const handleClockIn = async () => {
    console.log('Clock In: user.id =', user.id);
    const resp = await fetch(`http://localhost:5050/api/employees/${user.id}/clockin`, { method: 'POST' });
    const data = await resp.json();
    console.log('Clock In response:', data);
    // Fetch latest clock-in/out times from backend
    const res = await fetch(`http://localhost:5050/api/employees`);
    const employees = await res.json();
    const emp = employees.find((e: any) => e.email === user.email);
    if (emp) {
      setIsClockedIn(!!emp.clockInTime && !emp.clockOutTime);
      setClockInTime(emp.clockInTime || null);
      setClockOutTime(emp.clockOutTime || null);
    }
  };
  const handleClockOut = async () => {
    console.log('Clock Out: user.id =', user.id);
    const resp = await fetch(`http://localhost:5050/api/employees/${user.id}/clockout`, { method: 'POST' });
    const data = await resp.json();
    console.log('Clock Out response:', data);
    // Fetch latest clock-in/out times from backend
    const res = await fetch(`http://localhost:5050/api/employees`);
    const employees = await res.json();
    const emp = employees.find((e: any) => e.email === user.email);
    if (emp) {
      setIsClockedIn(!!emp.clockInTime && !emp.clockOutTime);
      setClockInTime(emp.clockInTime || null);
      setClockOutTime(emp.clockOutTime || null);
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

  // Unified dashboard for all roles
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        // Calculate time since clock-in
        let timesheetDisplay = '0h 0m 0s';
        if (clockInTime && !clockOutTime) {
          const clockInDate = new Date(clockInTime);
          const now = new Date();
          const diffMs = now.getTime() - clockInDate.getTime();
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
          const seconds = Math.floor((diffMs / 1000) % 60);
          timesheetDisplay = `${hours}h ${minutes}m ${seconds}s`;
        } else if (clockInTime && clockOutTime) {
          const clockInDate = new Date(clockInTime);
          const clockOutDate = new Date(clockOutTime);
          const diffMs = clockOutDate.getTime() - clockInDate.getTime();
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
          const seconds = Math.floor((diffMs / 1000) % 60);
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
                  <div className="text-gray-600 mb-2">{isClockedIn ? 'Clocked in' : clockInTime && clockOutTime ? 'Clocked out' : 'Not clocked in yet'}</div>
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
                  <div className="text-gray-600">Employees on leave</div>
                </CardContent>
              </Card>
              {/* Holidays Widget */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Upcoming Holidays</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-gray-700 space-y-1">
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
                  <ul className="text-gray-700 space-y-1">
                    <li>Priya Sharma (HR)</li>
                    <li>Rohit Mehra (Dev)</li>
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
                  <div className="text-gray-600">Employees remote today</div>
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
                      <div className="text-gray-600 text-sm">Present</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-500">4%</div>
                      <div className="text-gray-600 text-sm">Absent</div>
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
                  <p className="text-gray-600">No new announcements.</p>
                </CardContent>
              </Card>
              {/* Quick Links Widget */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc ml-6 text-blue-700 space-y-1">
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
        return (user.role === 'super_admin' || user.role === 'admin') ? <EmployeeForm /> : <EmployeeList userRole={user.role} />;
      case 'admin-panel':
        return <AdminPanel userRole={user.role} />;
      case 'reports':
        return <Reports userRole={user.role} />;
      case 'settings':
        return <Settings userRole={user.role} />;
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
                  <div className="bg-green-100 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">Present</div>
                    <div className="text-3xl font-bold">{/* Example: 12 */}12</div>
                  </div>
                  <div className="bg-red-100 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-700">Absent</div>
                    <div className="text-3xl font-bold">{/* Example: 3 */}3</div>
                  </div>
                </div>
                <div className="mb-2 font-semibold">Recent Clock-ins</div>
                <ul className="divide-y divide-gray-200">
                  {/* Example static list, replace with real data if available */}
                  <li className="py-2 flex justify-between">
                    <span>John Doe</span>
                    <span className="text-gray-500">09:05 AM</span>
                  </li>
                  <li className="py-2 flex justify-between">
                    <span>Priya Sharma</span>
                    <span className="text-gray-500">09:10 AM</span>
                  </li>
                  <li className="py-2 flex justify-between">
                    <span>Rohit Mehra</span>
                    <span className="text-gray-500">09:12 AM</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );
      case 'leaves':
      case 'payroll':
      case 'projects':
        return (
          <div className="p-8">
            <Card className="max-w-3xl mx-auto mb-8">
              <CardHeader>
                <CardTitle>Add New Project</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Project Name</label>
                    <input className="w-full border rounded px-3 py-2" placeholder="Enter project name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea className="w-full border rounded px-3 py-2" placeholder="Describe the project" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Team</label>
                    <input className="w-full border rounded px-3 py-2" placeholder="Team name or members" />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-semibold">Add Project</button>
                </form>
              </CardContent>
            </Card>
            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle>Ongoing Company Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-gray-200">
                  <li className="py-3">
                    <div className="font-semibold">HR Management System</div>
                    <div className="text-sm text-gray-500">Team: HR, Dev</div>
                    <div className="text-xs text-gray-400">A platform for employee management, attendance, and payroll.</div>
                  </li>
                  <li className="py-3">
                    <div className="font-semibold">Client Portal</div>
                    <div className="text-sm text-gray-500">Team: Client Success, Dev</div>
                    <div className="text-xs text-gray-400">A portal for clients to track project progress and invoices.</div>
                  </li>
                  <li className="py-3">
                    <div className="font-semibold">Mobile App Redesign</div>
                    <div className="text-sm text-gray-500">Team: Mobile, UI/UX</div>
                    <div className="text-xs text-gray-400">Revamping the company mobile app for better user experience.</div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );
      case 'teams':
      case 'awards':
      case 'performance':
        return (
          <div className="p-8">
            <Card>
              <CardHeader>
                <CardTitle>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{activeTab} content coming soon...</p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return <div className="p-8">Coming soon...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
