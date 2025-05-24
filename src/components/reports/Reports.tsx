
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Download, Calendar, TrendingUp } from 'lucide-react';

interface ReportsProps {
  userRole: 'super_admin' | 'admin' | 'employee';
}

const Reports = ({ userRole }: ReportsProps) => {
  const canViewAllReports = userRole === 'super_admin' || userRole === 'admin';

  if (!canViewAllReports) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Limited Access</h3>
        <p className="text-gray-600">You have limited access to reports.</p>
      </div>
    );
  }

  const reports = [
    {
      title: 'Employee Summary',
      description: 'Overview of all employees and their status',
      type: 'summary',
      lastGenerated: '2024-01-15',
      available: true
    },
    {
      title: 'Department Analysis',
      description: 'Performance metrics by department',
      type: 'analytics',
      lastGenerated: '2024-01-14',
      available: true
    },
    {
      title: 'Payroll Report',
      description: 'Monthly payroll summary',
      type: 'financial',
      lastGenerated: '2024-01-01',
      available: userRole === 'super_admin'
    },
    {
      title: 'Attendance Report',
      description: 'Employee attendance tracking',
      type: 'attendance',
      lastGenerated: '2024-01-15',
      available: true
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600">Generate and download various reports</p>
        </div>
        <Button className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <span>Schedule Report</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, index) => (
          <Card key={index} className={!report.available ? 'opacity-50' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{report.title}</span>
                <Badge variant={report.available ? 'default' : 'secondary'}>
                  {report.available ? 'Available' : 'Restricted'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{report.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Last generated: {report.lastGenerated}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={!report.available}
                  className="flex items-center space-x-1"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>Quick Stats</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">24</div>
              <div className="text-sm text-gray-600">Total Employees</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">96%</div>
              <div className="text-sm text-gray-600">Attendance Rate</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">5</div>
              <div className="text-sm text-gray-600">Departments</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">$2.4M</div>
              <div className="text-sm text-gray-600">Total Payroll</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
