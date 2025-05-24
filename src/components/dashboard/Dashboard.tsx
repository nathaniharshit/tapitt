
import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import EmployeeList from '../employees/EmployeeList';
import EmployeeForm from '../employees/EmployeeForm';
import AdminPanel from '../admin/AdminPanel';
import Reports from '../reports/Reports';
import Settings from '../settings/Settings';

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

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState('employees');

  const renderContent = () => {
    switch (activeTab) {
      case 'employees':
        return <EmployeeList userRole={user.role} />;
      case 'add-employee':
        return <EmployeeForm userRole={user.role} />;
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
