import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Database, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AdminPanelProps {
  userRole: 'super_admin' | 'admin' | 'employee';
}

const AdminPanel = ({ userRole }: AdminPanelProps) => {
  const [counts, setCounts] = useState<{ super_admin: number; admin: number; employee: number }>({
    super_admin: 0,
    admin: 0,
    employee: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:5050/api/employees/roles-count');
        const data = await res.json();
        setCounts(data);
      } catch {
        setCounts({ super_admin: 0, admin: 0, employee: 0 });
      }
      setLoading(false);
    };
    fetchCounts();
    // Optionally, poll every 30 seconds for live updates:
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  if (userRole !== 'super_admin') {
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
      actions: ['View Users', 'Edit Roles', 'Deactivate Users']
    },
    {
      title: 'System Settings',
      description: 'Configure system-wide settings',
      icon: Settings,
      actions: ['Email Settings', 'Security Policies', 'Backup Configuration']
    },
    {
      title: 'Database Management',
      description: 'Manage database operations',
      icon: Database,
      actions: ['View Logs', 'Run Backups', 'Data Export']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Shield className="h-8 w-8 text-red-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Super Admin Panel</h2>
          <p className="text-gray-600">Manage system-wide settings and user permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Icon className="h-5 w-5 text-blue-600" />
                  <span>{feature.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <div className="space-y-2">
                  {feature.actions.map((action, actionIndex) => (
                    <Button
                      key={actionIndex}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {loading ? '...' : counts.super_admin}
              </div>
              <div className="text-sm text-gray-600">Super Admins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {loading ? '...' : counts.admin}
              </div>
              <div className="text-sm text-gray-600">Admins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {loading ? '...' : counts.employee}
              </div>
              <div className="text-sm text-gray-600">Employees</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
