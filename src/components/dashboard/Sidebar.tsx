
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Users, 
  UserPlus, 
  Shield, 
  BarChart3, 
  Settings,
  Building
} from 'lucide-react';

interface SidebarProps {
  userRole: 'super_admin' | 'admin' | 'employee';
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar = ({ userRole, activeTab, setActiveTab }: SidebarProps) => {
  const menuItems = [
    {
      id: 'employees',
      label: 'Employees',
      icon: Users,
      roles: ['super_admin', 'admin', 'employee']
    },
    {
      id: 'add-employee',
      label: 'Add Employee',
      icon: UserPlus,
      roles: ['super_admin', 'admin']
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

  return (
    <aside className="w-64 bg-white shadow-sm border-r min-h-screen">
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-6">
          <Building className="h-8 w-8 text-blue-600" />
          <span className="text-lg font-semibold text-gray-900">EMS</span>
        </div>
        
        <nav className="space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
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
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
