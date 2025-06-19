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
  userRole: 'superadmin' | 'admin' | 'employee' | 'manager';
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar = ({ userRole, activeTab, setActiveTab }: SidebarProps) => {
  // Move Org Structure below Employees
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['superadmin', 'admin', 'employee', 'manager'],
      children: [
        { id: 'attendance', label: 'Attendance', icon: Calendar },
        { id: 'leaves', label: 'Leaves', icon: FileText },
        { id: 'payroll', label: 'Payroll', icon: CreditCard },
        { id: 'projects', label: 'Projects', icon: Briefcase },
        { id: 'teams', label: 'Teams', icon: Users },
        { id: 'awards', label: 'Awards', icon: Award }
      ]
    },
    {
      id: 'manager-section',
      label: 'Manager Section',
      icon: Activity,
      roles: ['manager'],
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: Users,
      roles: ['superadmin', 'admin'] // Only visible to superadmin and admin
    },
    {
      id: 'org-structure',
      label: 'Org Structure',
      icon: Building,
      roles: ['superadmin', 'admin', 'employee', 'manager'] // Make visible to everyone including manager
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
      roles: ['superadmin', 'admin'] // Allow both superadmin and admin
    },
    {
      id: 'admin-panel',
      label: 'Admin Panel',
      icon: Shield,
      roles: ['superadmin', 'admin'] // <-- Allow both admin and superadmin
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      roles: ['superadmin', 'admin']
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      roles: ['superadmin', 'admin', 'employee', 'manager']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  const renderMenu = (items) => (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        if (item.children) {
          return (
            <div key={item.id}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
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
            variant="ghost"
            className={cn(
              "w-full justify-start",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
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
    <aside className="w-64 min-h-screen bg-background text-foreground border-r">
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-6">
          <Building className="h-8 w-8 text-primary" />
          <span className="text-lg font-semibold text-foreground">EMS</span>
        </div>
        
        <nav className="space-y-2">
          {renderMenu(filteredMenuItems)}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
