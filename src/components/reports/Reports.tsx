import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Download, Calendar, TrendingUp } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Bar } from 'react-chartjs-2';
import { toast } from '@/components/ui/use-toast';
import 'chart.js/auto';

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

  const REPORT_ENDPOINTS: Record<string, string> = {
    summary: '/api/reports/employee-summary',
    analytics: '/api/reports/department-analysis',
    financial: '/api/reports/payroll',
    attendance: '/api/reports/attendance',
  };

  // --- Report Filters ---
  const [filterDept, setFilterDept] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  // Add state for attendance month filter
  const [attendanceMonth, setAttendanceMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  // --- Chart Data ---
  const [chartData, setChartData] = useState<any>(null);

  // Fetch departments for filter dropdown
  useEffect(() => {
    fetch('http://localhost:5050/api/employees')
      .then(res => res.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        const depts = Array.from(new Set(arr.map((e: any) => String(e.department || '')).filter(Boolean)));
        setDepartmentsList(depts);
      });
  }, []);

  // --- Visualization: Department Size Bar Chart ---
  useEffect(() => {
    fetch('http://localhost:5050/api/employees')
      .then(res => res.json())
      .then(data => {
        const employees = Array.isArray(data) ? data : [];
        const deptCounts: Record<string, number> = {};
        employees.forEach((e: any) => {
          if (e.department) deptCounts[e.department] = (deptCounts[e.department] || 0) + 1;
        });
        setChartData({
          labels: Object.keys(deptCounts),
          datasets: [{
            label: 'Employees per Department',
            data: Object.values(deptCounts),
            backgroundColor: 'rgba(59,130,246,0.5)',
          }]
        });
      });
  }, []);

  // --- Filtered Download Handler ---
  const handleDownload = async (type: string) => {
    try {
      const url = REPORT_ENDPOINTS[type];
      if (!url) return;
      const params: any = {};
      if (filterDept) params.department = filterDept;
      if (filterStart) params.start = filterStart;
      if (filterEnd) params.end = filterEnd;
      params.format = exportFormat;
      // If attendance report, add month param
      if (type === 'attendance') {
        params.month = attendanceMonth;
      }
      const response = await fetch(`${url}?${new URLSearchParams(params)}`, { method: 'GET' });
      const blob = await response.blob();
      const ext = exportFormat === 'csv' ? 'csv' : 'pdf';
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${type}_report_${new Date().toISOString().slice(0,10)}.${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: 'Report Downloaded', description: `Your ${type} report (${exportFormat.toUpperCase()}) is ready.` });
    } catch (err) {
      toast({ title: 'Download Failed', description: 'Failed to download report.', variant: 'destructive' });
    }
  };

  const [open, setOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState('summary');
  const [scheduleDate, setScheduleDate] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    setLoading(true);
    try {
      await fetch('http://localhost:5050/api/reports/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: scheduleType,
          date: scheduleDate,
          email,
        })
      });
      alert('Report scheduled successfully!');
      setOpen(false);
    } catch (err) {
      alert('Failed to schedule report.');
    } finally {
      setLoading(false);
    }
  };

  const REPORT_OPTIONS = [
    { label: 'Employee Summary', value: 'summary' },
    { label: 'Department Analysis', value: 'analytics' },
    { label: 'Payroll Report', value: 'financial' },
    { label: 'Attendance Report', value: 'attendance' },
  ];

  const [stats, setStats] = useState({
    totalEmployees: 0,
    attendanceRate: 0,
    departments: 0,
    totalPayroll: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Use full backend URL for dev
        const empRes = await fetch('http://localhost:5050/api/employees');
        const employees = await empRes.json(); // Only call .json() once!
        const totalEmployees = employees.length;
        const departments = new Set(employees.map((e: any) => e.department).filter(Boolean)).size;
        const totalPayroll = employees.reduce((sum: number, e: any) => sum + (e.salary || 0), 0);
        // Attendance rate: present days / total possible days (simple avg for demo)
        let present = 0, total = 0;
        employees.forEach((e: any) => {
          if (Array.isArray(e.attendance)) {
            present += e.attendance.filter((a: any) => a.status === 'present').length;
            total += e.attendance.length;
          }
        });
        const attendanceRate = total ? Math.round((present / total) * 100) : 0;
        setStats({ totalEmployees, attendanceRate, departments, totalPayroll });
      } catch {
        setStats({ totalEmployees: 0, attendanceRate: 0, departments: 0, totalPayroll: 0 });
      }
    };
    fetchStats();
  }, []);

  // Dark mode detection (safe for SSR)
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setDarkMode(mq.matches);
      const handler = (e: MediaQueryListEvent) => setDarkMode(e.matches);
      if (mq.addEventListener) {
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
      } else if (mq.addListener) {
        // Safari/old browsers
        mq.addListener(handler);
        return () => mq.removeListener(handler);
      }
    }
  }, []);

  // Memoize chart options for Chart.js
  const chartOptions = useMemo(() => ({
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: darkMode ? '#d1d5db' : '#64748b' },
        grid: { color: darkMode ? '#374151' : '#e5e7eb', borderColor: darkMode ? '#374151' : '#e5e7eb' }
      },
      y: {
        ticks: { color: darkMode ? '#d1d5db' : '#64748b' },
        grid: { color: darkMode ? '#374151' : '#e5e7eb', borderColor: darkMode ? '#374151' : '#e5e7eb' }
      }
    }
  }), [darkMode]);

  return (
    <div className="space-y-6">
      <Button onClick={() => setOpen(true)} className="mb-4">
        Schedule Report
      </Button>
      {/* Filters */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-foreground">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>Report Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold mb-1">Department</label>
              <select className="border rounded px-2 py-1 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                <option value="">All</option>
                {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Start Date</label>
              <Input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">End Date</label>
              <Input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Export Format</label>
              <select className="border rounded px-2 py-1 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700" value={exportFormat} onChange={e => setExportFormat(e.target.value as 'pdf' | 'csv')}>
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            {/* Show month picker only for Attendance Report */}
            <div>
              <label className="block text-xs font-semibold mb-1">Attendance Month</label>
              <Input
                type="month"
                value={attendanceMonth}
                onChange={e => setAttendanceMonth(e.target.value)}
                className="bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                max={new Date().toISOString().substring(0, 7)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, index) => (
          <Card key={index} className={`border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground ${!report.available ? 'opacity-50' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{report.title}</span>
                <Badge variant={report.available ? 'default' : 'secondary'}>
                  {report.available ? 'Available' : 'Restricted'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{report.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Last generated: {report.lastGenerated}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={!report.available}
                  className="flex items-center space-x-1"
                  onClick={() => handleDownload(report.type)}
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visualization/Charts */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-foreground">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>Department Size Chart</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <div className="text-muted-foreground">Loading chart...</div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-foreground">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>Quick Stats</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-200">{stats.totalEmployees}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Employees</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-200">{stats.attendanceRate}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Attendance Rate</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-200">{stats.departments}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Departments</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-200">₹{stats.totalPayroll.toLocaleString("en-IN")}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Payroll</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 text-foreground">
          <DialogHeader>
            <DialogTitle>Schedule a Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <select
              value={scheduleType}
              onChange={e => setScheduleType(e.target.value)}
              className="border rounded px-2 py-1 w-full bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
            >
              {REPORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700" />
            <Input type="email" placeholder="Recipient Email" value={email} onChange={e => setEmail(e.target.value)} className="bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700" />
          </div>
          <DialogFooter>
            <Button onClick={handleSchedule} disabled={loading}>{loading ? 'Scheduling...' : 'Schedule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;
