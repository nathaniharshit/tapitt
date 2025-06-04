import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Users, 
  UserPlus, 
  Shield, 
  BarChart3, 
  Settings,
  Building,
  LayoutDashboard,
  Calendar,
  FileText,
  CreditCard,
  Briefcase,
  Award,
  Activity
} from 'lucide-react';

interface SidebarProps {
  userRole: 'super_admin' | 'admin' | 'employee';
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar = ({ userRole, activeTab, setActiveTab }: SidebarProps) => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['super_admin', 'admin', 'employee'],
      children: [
        { id: 'attendance', label: 'Attendance', icon: Calendar },
        { id: 'leaves', label: 'Leaves', icon: FileText },
        { id: 'payroll', label: 'Payroll', icon: CreditCard },
        { id: 'projects', label: 'Projects', icon: Briefcase },
        { id: 'teams', label: 'Teams', icon: Users },
        { id: 'awards', label: 'Awards', icon: Award },
        { id: 'performance', label: 'Performance', icon: Activity },
      ]
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: Users,
      roles: ['super_admin', 'admin', 'employee']
    },
    {
      id: 'personal-details',
      label: 'Personal Details',
      icon: UserPlus, // You may want to use a different icon, e.g., User or IdCard
      roles: ['employee']
    },
    {
      id: 'add-employee',
      label: 'Add Employee',
      icon: UserPlus,
      roles: ['super_admin'] // Only super_admin can see this
    },
    {
      id: 'admin-panel',
      label: 'Admin Panel',
      icon: Shield,
      roles: ['super_admin']
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      roles: ['super_admin', 'admin']
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      roles: ['super_admin', 'admin', 'employee']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  const renderMenu = (items) => (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        if (item.children) {
          return (
            <div key={item.id}>
              <Button
                variant={activeTab === item.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  activeTab === item.id && "bg-blue-600 text-white"
                )}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
              <div className="ml-6 space-y-1">
                {renderMenu(item.children)}
              </div>
            </div>
          );
        }
        return (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            className={cn(
              "w-full justify-start",
              activeTab === item.id && "bg-blue-600 text-white"
            )}
            onClick={() => setActiveTab(item.id)}
          >
            <Icon className="h-4 w-4 mr-2" />
            {item.label}
          </Button>
        );
      })}
    </>
  );

  return (
    <aside className="w-64 bg-white shadow-sm border-r min-h-screen">
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-6">
          <Building className="h-8 w-8 text-blue-600" />
          <span className="text-lg font-semibold text-gray-900">EMS</span>
        </div>
        
        <nav className="space-y-2">
          {renderMenu(filteredMenuItems)}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
