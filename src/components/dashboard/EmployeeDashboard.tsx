import { Briefcase, Calendar, CreditCard, FileText, User, Users, Award, Activity, LayoutDashboard } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const employeeDashboardTabs = [
	{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
	{ id: 'personal-details', label: 'Personal Details', icon: User },
	{ id: 'employees', label: 'Employees', icon: Users }, // Add Employees tab for employees
	{ id: 'attendance', label: 'Attendance', icon: Calendar },
	{ id: 'leaves', label: 'Leaves', icon: FileText },
	{ id: 'payroll', label: 'Payroll', icon: CreditCard },
	{ id: 'projects', label: 'Projects', icon: Briefcase },
	{ id: 'teams', label: 'Teams', icon: Users },
	{ id: 'awards', label: 'Awards', icon: Award },
	{ id: 'performance', label: 'Performance', icon: Activity },
];

const EmployeeDashboard = ({ activeTab, setActiveTab }) => (
	<aside className="w-64 bg-white shadow-sm border-r min-h-screen">
		<div className="p-4">
			<div className="flex items-center space-x-2 mb-6">
				<LayoutDashboard className="h-8 w-8 text-blue-600" />
				<span className="text-lg font-semibold text-gray-900">Dashboard</span>
			</div>
			<nav className="space-y-2">
				{employeeDashboardTabs.map((item) => {
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

export default EmployeeDashboard;