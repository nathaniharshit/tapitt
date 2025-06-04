import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import EmployeeList from '../employees/EmployeeList';
import EmployeeForm from '../employees/EmployeeForm';
import AdminPanel from '../admin/AdminPanel';
import Reports from '../reports/Reports';
import Settings from '../settings/Settings';
import { Navigate } from 'react-router-dom';
import EmployeePersonalDetails from '../employees/EmployeePersonalDetails';
import EmployeeDashboard from './EmployeeDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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
  const [activeTab, setActiveTab] = useState(user.role === 'employee' ? 'personal-details' : 'employees');

  const renderContent = () => {
    if (user.role === 'employee') {
      switch (activeTab) {
        case 'dashboard':
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
                    <div className="text-4xl font-bold text-blue-600 mb-2">8h 15m</div>
                    <div className="text-gray-600">Today's logged hours</div>
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
                      <li>Attendance</li>
                      <li>Leaves</li>
                      <li>Payroll</li>
                      <li>Projects</li>
                      <li>Teams</li>
                      <li>Awards</li>
                      <li>Performance</li>
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
        case 'attendance':
        case 'leaves':
        case 'payroll':
        case 'projects':
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
    }
    switch (activeTab) {
      case 'employees':
        return <EmployeeList userRole={user.role} />;
      case 'add-employee':
        return user.role === 'super_admin' ? <EmployeeForm /> : <EmployeeList userRole={user.role} />;
      case 'admin-panel':
        return <AdminPanel userRole={user.role} />;
      case 'reports':
        return <Reports userRole={user.role} />;
      case 'settings':
        return <Settings userRole={user.role} />;
      default:
        return <EmployeeList userRole={user.role} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={onLogout} />
      <div className="flex">
        {user.role === 'employee' ? (
          <EmployeeDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
        ) : (
          <Sidebar 
            userRole={user.role} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
          />
        )}
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
