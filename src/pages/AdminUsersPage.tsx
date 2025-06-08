import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminUsersPage = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5050/api/employees')
      .then(res => res.json())
      .then(data => {
        setEmployees(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const grouped = {
    super_admin: employees.filter(e => e.role === 'super_admin' || e.role === 'superadmin'),
    admin: employees.filter(e => e.role === 'admin'),
    employee: employees.filter(e => e.role === 'employee'),
    intern: employees.filter(e => e.role === 'intern'),
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate('/', { state: { adminPanel: true } })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Panel
      </Button>
      <h2 className="text-2xl font-bold mb-6 text-center">All Users</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-700">Super Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {loading ? <li>Loading...</li> : grouped.super_admin.length === 0 ? <li className="text-gray-400">None</li> :
                grouped.super_admin.map(user => (
                  <li key={user._id} className="border-b py-1">
                    <div className="font-semibold">{user.firstname} {user.lastname}</div>
                    <div className="text-xs text-gray-500 break-all">{user.email}</div>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {loading ? <li>Loading...</li> : grouped.admin.length === 0 ? <li className="text-gray-400">None</li> :
                grouped.admin.map(user => (
                  <li key={user._id} className="border-b py-1">
                    <div className="font-semibold">{user.firstname} {user.lastname}</div>
                    <div className="text-xs text-gray-500 break-all">{user.email}</div>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-700">Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {loading ? <li>Loading...</li> : grouped.employee.length === 0 ? <li className="text-gray-400">None</li> :
                grouped.employee.map(user => (
                  <li key={user._id} className="border-b py-1">
                    <div className="font-semibold">{user.firstname} {user.lastname}</div>
                    <div className="text-xs text-gray-500 break-all">{user.email}</div>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-purple-700">Interns</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {loading ? <li>Loading...</li> : grouped.intern.length === 0 ? <li className="text-gray-400">None</li> :
                grouped.intern.map(user => (
                  <li key={user._id} className="border-b py-1">
                    <div className="font-semibold">{user.firstname} {user.lastname}</div>
                    <div className="text-xs text-gray-500 break-all">{user.email}</div>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUsersPage;
