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
  // Set default tab for employees to 'personal-details', others to 'employees'
  const [activeTab, setActiveTab] = useState(user.role === 'employee' ? 'personal-details' : 'employees');

  const renderContent = () => {
    if (user.role === 'employee') {
      switch (activeTab) {
        case 'personal-details':
          return <EmployeePersonalDetails user={user} />;
        case 'employees':
          return <EmployeeList userRole={user.role} />;
        case 'settings':
          return <Settings userRole={user.role} />;
        // Add more employee-only sections here if needed
        default:
          return <EmployeeList userRole={user.role} />;
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
