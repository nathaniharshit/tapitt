import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface EmployeeListProps {
  userRole: 'super_admin' | 'admin' | 'employee';
}

const EmployeeList = ({ userRole }: EmployeeListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [viewedEmployee, setViewedEmployee] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [secondsSinceJoin, setSecondsSinceJoin] = useState<{ [id: string]: number }>({});

  useEffect(() => {
    fetch('http://localhost:5050/api/employees')
      .then(res => res.json())
      .then(data => {
        console.log('Fetched employees:', data);
        setEmployees(data);
      })
      .catch(err => {
        console.error('Failed to fetch employees:', err);
        setEmployees([]);
      });
  }, []);

  const filteredEmployees = employees.filter(employee =>
    `${employee.firstname} ${employee.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.department || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canEdit = userRole === 'super_admin' || userRole === 'admin';
  const canDelete = userRole === 'super_admin';

  const handleView = (employee: any) => {
    setViewedEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleEdit = (employee: any) => {
    setEditEmployee(employee);
    setIsEditDialogOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditEmployee({ ...editEmployee, [e.target.name]: e.target.value });
  };

  const handleEditSave = async () => {
    if (!editEmployee) return;
    try {
      const response = await fetch(`http://localhost:5050/api/employees/${editEmployee._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editEmployee),
      });
      if (response.ok) {
        setEmployees((prev) => prev.map(emp => emp._id === editEmployee._id ? editEmployee : emp));
        setIsEditDialogOpen(false);
        setEditEmployee(null);
        alert('Employee updated successfully!');
      } else {
        alert('Failed to update employee.');
      }
    } catch (err) {
      alert('Network error.');
    }
  };

  const handleDelete = async (employee: any) => {
    if (window.confirm(`Are you sure you want to delete ${employee.firstname} ${employee.lastname}?`)) {
      try {
        const response = await fetch(`http://localhost:5050/api/employees/${employee._id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setEmployees((prev) => prev.filter(emp => emp._id !== employee._id));
          alert('Employee deleted successfully!');
        } else {
          alert('Failed to delete employee.');
        }
      } catch (err) {
        alert('Network error.');
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsSinceJoin((prev) => {
        const updated: { [id: string]: number } = {};
        employees.forEach((employee: any) => {
          if (employee.startDate) {
            updated[employee._id] = Math.floor((Date.now() - new Date(employee.startDate).getTime()) / 1000);
          }
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [employees]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <Card key={employee._id} className="shadow-md hover:shadow-lg transition">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                    {employee.firstname && employee.lastname ? `${employee.firstname[0]}${employee.lastname[0]}`.toUpperCase() : '?'}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{employee.firstname} {employee.lastname}</h3>
                    <p className="text-gray-600">{employee.position} • {employee.department}</p>
                    <p className="text-sm text-gray-500">{employee.email}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <Badge>{employee.status || 'active'}</Badge>
                    <p className="text-sm text-gray-500 mt-1">
                      Joined: {new Date(employee.startDate).toLocaleDateString()}
                    </p>
                    {employee.startDate && (
                      <p className="text-xs text-gray-400">
                        Seconds since joining: {secondsSinceJoin[employee._id]}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleView(employee)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button variant="outline" size="sm" onClick={() => handleEdit(employee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(employee)}>
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
        <div className="text-center py-12 text-gray-500">
          No employees found matching your search.
        </div>
      )}

      {/* Dialog components unchanged (reuse your current version for view/edit) */}
      {/* ... [view and edit dialogs here] ... */}
    </div>
  );
};

export default EmployeeList;
