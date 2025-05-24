
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, Trash2, Eye } from 'lucide-react';

interface EmployeeListProps {
  userRole: 'super_admin' | 'admin' | 'employee';
}

const EmployeeList = ({ userRole }: EmployeeListProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock employee data
  const employees = [
    {
      id: 1,
      name: 'John Smith',
      email: 'john@company.com',
      role: 'super_admin',
      department: 'IT',
      position: 'System Administrator',
      status: 'active',
      joinDate: '2023-01-15'
    },
    {
      id: 2,
      name: 'Jane Doe',
      email: 'jane@company.com',
      role: 'admin',
      department: 'HR',
      position: 'HR Manager',
      status: 'active',
      joinDate: '2023-02-20'
    },
    {
      id: 3,
      name: 'Mike Johnson',
      email: 'mike@company.com',
      role: 'employee',
      department: 'Sales',
      position: 'Sales Executive',
      status: 'active',
      joinDate: '2023-03-10'
    },
    {
      id: 4,
      name: 'Sarah Wilson',
      email: 'sarah@company.com',
      role: 'employee',
      department: 'Marketing',
      position: 'Marketing Specialist',
      status: 'inactive',
      joinDate: '2023-04-05'
    }
  ];

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canEdit = userRole === 'super_admin' || userRole === 'admin';
  const canDelete = userRole === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {employee.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{employee.name}</h3>
                    <p className="text-gray-600">{employee.position} • {employee.department}</p>
                    <p className="text-sm text-gray-500">{employee.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                      {employee.status}
                    </Badge>
                    <p className="text-sm text-gray-500 mt-1">
                      Joined: {new Date(employee.joinDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No employees found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
