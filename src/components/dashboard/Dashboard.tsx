import { useEffect, useState, useRef, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import EmployeeList from '../employees/EmployeeList';
import EmployeeForm from '../employees/EmployeeForm';
import AdminPanel from '../admin/AdminPanel';
import Reports from '../reports/Reports';
import Settings from '../settings/Settings';
import { Navigate, useLocation } from 'react-router-dom';
import EmployeePersonalDetails from '../employees/EmployeePersonalDetails';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import AttendanceCalendar from '../attendance/AttendanceCalendar';
import { Dialog } from '@/components/ui/dialog'; // If you use a dialog/modal component
import OrgChart from './OrgChart';
import { socket } from '@/lib/socket';


interface User {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'employee' | 'manager';
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}
// src/components/auth/protectedroute.tsx


const ProtectedRoute = ({ user, allowedRoles, children }) => {
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" />;
  }
  return children;
};


const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loginTime, setLoginTime] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [employees, setEmployees] = useState<any[]>([]);
  const [welcomeName, setWelcomeName] = useState<string>('');

  // --- Projects state and logic ---
  const [projects, setProjects] = useState<any[]>([]);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', team: [] as string[], lead: '' });
  const [projectMsg, setProjectMsg] = useState('');
  const projectFormRef = useRef<HTMLFormElement>(null);
  // --- Holidays state and logic ---
  const [holidays, setHolidays] = useState<{ name: string; date: string }[]>([]);
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '' });
  const [holidayMsg, setHolidayMsg] = useState('');

  // Fetch holidays
  const fetchHolidays = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5050/api/holidays');
      const data = await res.json();
      setHolidays(data.holidays || []);
    } catch {
      setHolidays([]);
    }
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // Add holiday handler
  const handleHolidayFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHolidayForm({ ...holidayForm, [e.target.name]: e.target.value });
  };
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setHolidayMsg('');
    try {
      const res = await fetch('http://localhost:5050/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...holidayForm, createdBy: user.name })
      });
      const data = await res.json();
      if (res.ok) {
        setHolidayMsg('Holiday added!');
        setHolidayForm({ name: '', date: '' });
        fetchHolidays();
      } else {
        setHolidayMsg(data.error || 'Failed to add holiday');
      }
    } catch {
      setHolidayMsg('Network error.');
    }
  };
  // --- End Holidays logic ---

  // Fetch employees and interns for team selection
  const [teamOptions, setTeamOptions] = useState<{ value: string; label: string }[]>([]);
  // Fetch all employees for project lead selection (changed from only admins/superadmins)
  const [leadOptions, setLeadOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    const fetchTeamOptions = async () => {
      try {
        const res = await fetch('http://localhost:5050/api/employees');
        const data = await res.json();
        // Filter for employees and interns
        const filtered = data.filter((emp: any) =>
          emp.role === 'employee' || emp.role === 'intern'
        );
        setTeamOptions(
          filtered.map((emp: any) => ({
            value: emp._id,
            label: `${emp.firstname} ${emp.lastname} (${emp.department || 'N/A'})`
          }))
        );
        // Use all employees for project lead selection
        setLeadOptions(
          data.map((emp: any) => ({
            value: emp._id,
            label: `${emp.firstname} ${emp.lastname} (${emp.department || 'N/A'})`
          }))
        );
      } catch {
        setTeamOptions([]);
        setLeadOptions([]);
      }
    };
    fetchTeamOptions();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('http://localhost:5050/api/projects');
      const data = await res.json();
      setProjects(data);
    } catch {
      setProjects([]);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setProjectForm({ ...projectForm, [e.target.name]: e.target.value });
  };

  // Handle team multi-select
  const handleTeamSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
    setProjectForm({ ...projectForm, team: selected });
  };

  // Handle team checkbox selection
  const handleTeamCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (e.target.checked) {
      setProjectForm((prev) => ({
        ...prev,
        team: [...prev.team, value]
      }));
    } else {
      setProjectForm((prev) => ({
        ...prev,
        team: prev.team.filter((id) => id !== value)
      }));
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjectMsg('');
    try {
      const resp = await fetch('http://localhost:5050/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectForm,
          team: projectForm.team, // array of employee/intern IDs
          lead: projectForm.lead  // admin/superadmin ID
        })
      });
      if (resp.ok) {
        setProjectMsg('Project added!');
        setProjectForm({ name: '', description: '', team: [], lead: '' });
        fetchProjects();
        if (projectFormRef.current) projectFormRef.current.reset();
      } else {
        const err = await resp.json();
        setProjectMsg('Error: ' + (err.error || 'Could not add project'));
      }
    } catch {
      setProjectMsg('Network error.');
    }
  };

  // Delete project handler and confirmation state
  const [deleteMsg, setDeleteMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteProject = async (projectId: string) => {
    setDeleteMsg('');
    setConfirmDeleteId(null);
    try {
      const resp = await fetch(`http://localhost:5050/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      if (resp.ok) {
        setDeleteMsg('Project deleted successfully.');
        fetchProjects();
      } else {
        const err = await resp.json();
        setDeleteMsg('Failed to delete project: ' + (err.error || 'Unknown error'));
      }
    } catch {
      setDeleteMsg('Network error.');
    }
  };

  // Edit project modal state
  const [editProject, setEditProject] = useState<any | null>(null);
  const [editMsg, setEditMsg] = useState('');

  // Edit project handler
  const handleEditProject = (proj: any) => {
    setEditMsg('');
    setEditProject({
      ...proj,
      team: Array.isArray(proj.team) ? proj.team : [],
      lead: proj.lead || ''
    });
  };

  const handleEditProjectChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!editProject) return;
    setEditProject({ ...editProject, [e.target.name]: e.target.value });
  };

  const handleEditTeamCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editProject) return;
    const value = e.target.value;
    if (e.target.checked) {
      setEditProject((prev: any) => ({
        ...prev,
        team: [...prev.team, value]
      }));
    } else {
      setEditProject((prev: any) => ({
        ...prev,
        team: prev.team.filter((id: string) => id !== value)
      }));
    }
  };

  const handleEditProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditMsg('');
    try {
      const resp = await fetch(`http://localhost:5050/api/projects/${editProject._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editProject.name,
          description: editProject.description,
          team: editProject.team,
          lead: editProject.lead
        })
      });
      if (resp.ok) {
        setEditMsg('Project updated!');
        setEditProject(null);
        fetchProjects();
      } else {
        const err = await resp.json();
        setEditMsg('Error: ' + (err.error || 'Could not update project'));
      }
    } catch {
      setEditMsg('Network error.');
    }
  };

  // Add concluded project state
  const [concludeMsg, setConcludeMsg] = useState('');

  // Conclude project handler
  const handleConcludeProject = async (projectId: string) => {
    setConcludeMsg('');
    try {
      // Use the standard update endpoint
      const resp = await fetch(`http://localhost:5050/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'over' })
      });
      if (resp.ok) {
        setConcludeMsg('Project marked as over.');
        fetchProjects();
      } else {
        const err = await resp.json();
        setConcludeMsg('Failed to conclude project: ' + (err.error || 'Unknown error'));
      }
    } catch {
      setConcludeMsg('Network error.');
    }
  };

  // --- End Projects logic ---

  // --- Teams state and logic ---
  const [teams, setTeams] = useState<any[]>([]);
  const [teamForm, setTeamForm] = useState({ name: '', members: [] as string[] });
  const [teamMsg, setTeamMsg] = useState('');
  const [editTeam, setEditTeam] = useState<any | null>(null);
  const [editTeamMsg, setEditTeamMsg] = useState('');
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState<string | null>(null);

  // Fetch teams
  const fetchTeams = async () => {
    try {
      const res = await fetch('http://localhost:5050/api/teams');
      const data = await res.json();
      setTeams(data);
    } catch {
      setTeams([]);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  // Handle team form changes
  const handleTeamFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeamForm({ ...teamForm, [e.target.name]: e.target.value });
  };
  const handleTeamMemberCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (e.target.checked) {
      setTeamForm((prev) => ({
        ...prev,
        members: [...prev.members, value]
      }));
    } else {
      setTeamForm((prev) => ({
        ...prev,
        members: prev.members.filter((id) => id !== value)
      }));
    }
  };

  // Create team
  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamMsg('');
    try {
      const resp = await fetch('http://localhost:5050/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamForm.name,
          members: teamForm.members
        })
      });
      if (resp.ok) {
        setTeamMsg('Team created!');
        setTeamForm({ name: '', members: [] });
        fetchTeams();
      } else {
        const err = await resp.json();
        setTeamMsg('Error: ' + (err.error || 'Could not create team'));
      }
    } catch {
      setTeamMsg('Network error.');
    }
  };

  // Edit team
  const handleEditTeam = (team: any) => {
    setEditTeamMsg('');
    setEditTeam({
      ...team,
      members: Array.isArray(team.members) ? team.members : []
    });
  };
  const handleEditTeamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editTeam) return;
    setEditTeam({ ...editTeam, [e.target.name]: e.target.value });
  };
  const handleEditTeamMemberCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editTeam) return;
    const value = e.target.value;
    if (e.target.checked) {
      setEditTeam((prev: any) => ({
        ...prev,
        members: [...prev.members, value]
      }));
    } else {
      setEditTeam((prev: any) => ({
        ...prev,
        members: prev.members.filter((id: string) => id !== value)
      }));
    }
  };
  const handleEditTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditTeamMsg('');
    try {
      const resp = await fetch(`http://localhost:5050/api/teams/${editTeam._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editTeam.name,
          members: editTeam.members
        })
      });
      if (resp.ok) {
        setEditTeamMsg('Team updated!');
        setEditTeam(null);
        fetchTeams();
      } else {
        const err = await resp.json();
        setEditTeamMsg('Error: ' + (err.error || 'Could not update team'));
      }
    } catch {
      setEditTeamMsg('Network error.');
    }
  };

  // Delete team
  const handleDeleteTeam = async (teamId: string) => {
    setEditTeamMsg('');
    setConfirmDeleteTeamId(null);
    try {
      const resp = await fetch(`http://localhost:5050/api/teams/${teamId}`, {
        method: 'DELETE'
      });
      if (resp.ok) {
        fetchTeams();
      } else {
        const err = await resp.json();
        setEditTeamMsg('Failed to delete team: ' + (err.error || 'Unknown error'));
      }
    } catch {
      setEditTeamMsg('Network error.');
    }
  };

  // --- End Teams logic ---

  // --- Announcements state and logic ---
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementInput, setAnnouncementInput] = useState('');
  const [announcementLoading, setAnnouncementLoading] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('http://localhost:5050/api/announcements');
      const data = await res.json();
      setAnnouncements(data);
    } catch {
      setAnnouncements([]);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnouncementMsg('');
    setAnnouncementLoading(true);
    try {
      // Only send createdBy if it's a valid ObjectId
      const isValidObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id);
      const body: any = { message: announcementInput };
      if (isValidObjectId(user.id)) {
        body.createdBy = user.id;
      }
      const resp = await fetch('http://localhost:5050/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (resp.ok) {
        setAnnouncementMsg('Announcement added!');
        setAnnouncementInput('');
        fetchAnnouncements();
      } else {
        const err = await resp.json();
        setAnnouncementMsg('Error: ' + (err.error || 'Could not add announcement'));
      }
    } catch {
      setAnnouncementMsg('Network error.');
    }
    setAnnouncementLoading(false);
  };

  // Add state for announcement delete confirmation
  const [confirmDeleteAnnouncementId, setConfirmDeleteAnnouncementId] = useState<string | null>(null);

  const handleDeleteAnnouncement = async (id: string) => {
    setAnnouncementMsg('');
    setConfirmDeleteAnnouncementId(null); // Close confirmation dialog after delete
    try {
      const resp = await fetch(`http://localhost:5050/api/announcements/${id}`, {
        method: 'DELETE'
      });
      if (resp.ok) {
        fetchAnnouncements();
      } else {
        const err = await resp.json();
        setAnnouncementMsg('Error: ' + (err.error || 'Could not delete announcement'));
      }
    } catch {
      setAnnouncementMsg('Network error.');
    }
  };

  // --- Work Session Tracker State ---
  const [workSessions, setWorkSessions] = useState<{ start: string; end?: string }[]>([]);
  const [sessionActive, setSessionActive] = useState(false);

  // Fetch all sessions from backend on mount or when userId changes
  useEffect(() => {
    if (!user.id) return;
    const fetchSessions = async () => {
      try {
        const res = await fetch(`http://localhost:5050/api/sessions?employeeId=${user.id}`);
        const data = await res.json();
        if (Array.isArray(data.sessions)) {
          // Show all sessions (full history)
          setWorkSessions(
            data.sessions.map((s: any) => ({ start: s.startTime, end: s.endTime }))
          );
          setSessionActive(
            data.sessions.length > 0 && !data.sessions[0].endTime
          );
        }
      } catch {
        setWorkSessions([]);
        setSessionActive(false);
      }
    };
    fetchSessions();
  }, [user.id]);

  // Start a new work session
  const handleStartSession = async () => {
    const now = new Date().toISOString();
    setWorkSessions((prev) => [{ start: now }, ...prev]); // Optimistically add session
    setSessionActive(true);
    await fetch('http://localhost:5050/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeName: user.name, employeeId: user.id })
    });
    // Re-fetch sessions after starting
    const res = await fetch(`http://localhost:5050/api/sessions?employeeId=${user.id}`);
    const data = await res.json();
    setWorkSessions(data.sessions.map((s: any) => ({ start: s.startTime, end: s.endTime })));
  };

  // End the current work session
  const handleEndSession = async () => {
    const now = new Date().toISOString();
    setWorkSessions((prev) => {
      const updated = [...prev];
      if (updated.length > 0 && !updated[0].end) {
        updated[0].end = now;
      }
      return updated;
    });
    setSessionActive(false);
    await fetch('http://localhost:5050/api/session/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: user.id })
    });
    // Re-fetch sessions after ending
    const res = await fetch(`http://localhost:5050/api/sessions?employeeId=${user.id}`);
    const data = await res.json();
    setWorkSessions(data.sessions.map((s: any) => ({ start: s.startTime, end: s.endTime })));
  };

  // --- End Work Session Tracker ---

  // Fetch login time for the current user
  useEffect(() => {
    const fetchLoginTime = async () => {
      try {
        const res = await fetch(`http://localhost:5050/api/employees`);
        const employees = await res.json();
        const emp = employees.find((e: any) => e.email === user.email);
        if (emp && emp.lastLogin) {
          setLoginTime(emp.lastLogin);
        } else {
          setLoginTime(null);
        }
        // Always update user.id to the real MongoDB ObjectId if found
        if (emp && emp._id && user.id !== emp._id) {
          // Instead of mutating the prop, store the id in state
          setUserId(emp._id);
        }
      } catch {
        setLoginTime(null);
      }
    };
    fetchLoginTime();
  }, [user.email]);

  // Fetch clock-in/out times for the current user
  useEffect(() => {
    const fetchClockTimes = async () => {
      try {
        const res = await fetch(`http://localhost:5050/api/employees`);
        const employees = await res.json();
        const emp = employees.find((e: any) => e.email === user.email);
        if (emp) {
          setClockInTime(emp.clockInTime || null);
          setClockOutTime(emp.clockOutTime || null);
          setIsClockedIn(!!emp.clockInTime && !emp.clockOutTime);
        }
      } catch {
        setClockInTime(null);
        setClockOutTime(null);
        setIsClockedIn(false);
      }
    };
    fetchClockTimes();
  }, [user.email]);

  // Add a state for userId and use it everywhere instead of user.id
  const [userId, setUserId] = useState(user.id);

  // Ensure userId is always up to date with the latest employee data
  useEffect(() => {
    const fetchAndSetUserId = async () => {
      try {
        const res = await fetch(`http://localhost:5050/api/employees`);
        const employees = await res.json();
        const emp = employees.find((e: any) => e.email === user.email);
        if (emp && emp._id) {
          setUserId(emp._id);
        }
      } catch {}
    };
    fetchAndSetUserId();
  }, [user.email]);
  // Fetch employees
  const fetchEmployees = async () => {
    const res = await fetch('http://localhost:5050/api/employees');
    const data = await res.json();
    setEmployees(data);
    if (data.length > 0) {
      // Find the latest added employee (assuming last in array is latest)
      const latest = data[data.length - 1];
      setWelcomeName(`${latest.firstname} ${latest.lastname}`);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Set admin panel tab if navigated from View Users
  useEffect(() => {
    if (location.state && (location.state as any).adminPanel) {
      setActiveTab('admin-panel');
    }
    // eslint-disable-next-line
  }, [location.state]);

  // Attendance state for admin/superadmin attendance tab
  const [presentEmployees, setPresentEmployees] = useState<any[]>([]);
  const [absentEmployees, setAbsentEmployees] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceDate, setAttendanceDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [attendanceMonth, setAttendanceMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  // Add for admin/superadmin to select employee for calendar view
  const [calendarEmployeeId, setCalendarEmployeeId] = useState<string>('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const [employeeCalendarMonth, setEmployeeCalendarMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (activeTab === 'attendance' && (user.role === 'admin' || user.role === 'superadmin')) {
      const fetchAttendance = async () => {
        setAttendanceLoading(true);
        try {
          const res = await fetch('http://localhost:5050/api/employees');
          const employees = await res.json();
          const present: any[] = [];
          const absent: any[] = [];
          employees.forEach((emp: any) => {
            const att = Array.isArray(emp.attendance) ? emp.attendance.find((a: any) => a.date === attendanceDate) : null;
            if (att && att.status === 'present') present.push(emp);
            else if (att && att.status === 'absent') absent.push(emp);
          });
          setPresentEmployees(present);
          setAbsentEmployees(absent);
        } catch {
          setPresentEmployees([]);
          setAbsentEmployees([]);
        }
        setAttendanceLoading(false);
      };
      fetchAttendance();
    }
  }, [activeTab, user.role, attendanceDate]);

  // Add state for today's attendance stats
  const [todayPresent, setTodayPresent] = useState(0);
  const [todayAbsent, setTodayAbsent] = useState(0);
  const [todayTotalMarked, setTodayTotalMarked] = useState(0);

  // Calculate today's attendance stats
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    let present = 0;
    let absent = 0;
    let marked = 0;
    employees.forEach(emp => {
      if (Array.isArray(emp.attendance)) {
        const att = emp.attendance.find(a => a.date === todayStr);
        if (att) {
          marked++;
          if (att.status === 'present') present++;
          else if (att.status === 'absent') absent++;
        }
      }
    });
    setTodayPresent(present);
    setTodayAbsent(absent);
    setTodayTotalMarked(marked);
  }, [employees]);

  // --- Leaves state and logic ---
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveForm, setLeaveForm] = useState({
    type: 'Annual',
    from: '',
    to: '',
    reason: ''
  });
  const [leaveMsg, setLeaveMsg] = useState('');
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [confirmDeleteLeaveId, setConfirmDeleteLeaveId] = useState<string | null>(null);

  // Fetch leaves for current user or all if admin/superadmin
  const fetchLeaves = useCallback(async () => {
    try {
      let url = '';
      if (user.role === 'admin' || user.role === 'superadmin') {
        url = 'http://localhost:5050/api/leaves';
      } else {
        url = `http://localhost:5050/api/leaves/${user.id}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setLeaves(Array.isArray(data) ? data : []);
    } catch {
      setLeaves([]);
    }
  }, [user?.id, user.role]);

  useEffect(() => {
    if (activeTab === 'leaves') fetchLeaves();
  }, [activeTab, fetchLeaves]);

  // Submit leave request
  const handleLeaveFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setLeaveForm({ ...leaveForm, [e.target.name]: e.target.value });
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveMsg('');
    setLeaveLoading(true);
    try {
      const resp = await fetch('http://localhost:5050/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user.id,
          ...leaveForm
        })
      });
      if (resp.ok) {
        setLeaveMsg('Leave requested!');
        setLeaveForm({ type: 'Annual', from: '', to: '', reason: '' });
        fetchLeaves();
      } else {
        const err = await resp.json();
        setLeaveMsg('Error: ' + (err.error || 'Could not request leave'));
      }
    } catch {
      setLeaveMsg('Network error.');
    }
    setLeaveLoading(false);
  };

  // Approve/reject leave (admin/superadmin)
  const handleLeaveStatus = async (leaveId: string, status: 'Approved' | 'Rejected') => {
    setLeaveMsg('');
    try {
      const resp = await fetch(`http://localhost:5050/api/leaves/${leaveId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (resp.ok) {
        setLeaveMsg(`Leave ${status.toLowerCase()}!`);
        fetchLeaves();
      } else {
        const err = await resp.json();
        setLeaveMsg('Error: ' + (err.error || `Could not ${status.toLowerCase()} leave`));
      }
    } catch {
      setLeaveMsg('Network error.');
    }
  };

  // Calculate leave balances (simple example: count by type)
  const annualLeaves = leaves.filter(l => l.type === 'Annual' && l.status === 'Approved').length;
  const sickLeaves = leaves.filter(l => l.type === 'Sick' && l.status === 'Approved').length;

  // Edit leave
  const handleEditLeave = (leave: any) => {
    setEditingLeaveId(leave._id);
    setLeaveForm({
      type: leave.type,
      from: leave.from,
      to: leave.to,
      reason: leave.reason || ''
    });
    setLeaveMsg('');
  };

  // Cancel edit
  const handleCancelEditLeave = () => {
    setEditingLeaveId(null);
    setLeaveForm({ type: 'Annual', from: '', to: '', reason: '' });
    setLeaveMsg('');
  };

  // Update leave
  const handleUpdateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveMsg('');
    setLeaveLoading(true);
    try {
      const resp = await fetch(`http://localhost:5050/api/leaves/${editingLeaveId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...leaveForm,
          employeeId: user.id // for backend validation
        })
      });
      if (resp.ok) {
        setLeaveMsg('Leave updated!');
        setEditingLeaveId(null);
        setLeaveForm({ type: 'Annual', from: '', to: '', reason: '' });
        fetchLeaves();
      } else {
        const err = await resp.json();
        setLeaveMsg('Error: ' + (err.error || 'Could not update leave'));
      }
    } catch {
      setLeaveMsg('Network error.');
    }
  };

  // Delete leave
  const handleDeleteLeave = async (leaveId: string) => {
    setLeaveMsg('');
    setLeaveLoading(true);
    try {
      const resp = await fetch(`http://localhost:5050/api/leaves/${leaveId}`, {
        method: 'DELETE'
      });
      if (resp.ok) {
        setLeaveMsg('Leave deleted!');
        fetchLeaves();
      } else {
        const err = await resp.json();
        setLeaveMsg('Error: ' + (err.error || 'Could not delete leave'));
      }
    } catch {
      setLeaveMsg('Network error.');
    }
    setLeaveLoading(false);
  };

  // --- Payroll state and logic ---
  interface AllowanceOrDeduction {
    name: string;
    amount: number;
  }
  interface PayrollDetails {
    salary: number;
    position: string;
    department: string;
    startDate: string;
    allowances: AllowanceOrDeduction[];
    deductions: AllowanceOrDeduction[];
  }
  const [salary, setSalary] = useState<number | null>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [payslipMonth, setPayslipMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [payslipError, setPayslipError] = useState<string | null>(null);
  const [payrollDetails, setPayrollDetails] = useState<PayrollDetails | null>(null);
  const [standardAllowances, setStandardAllowances] = useState<AllowanceOrDeduction[]>([]);
  const [standardDeductions, setStandardDeductions] = useState<AllowanceOrDeduction[]>([]);

  // Fetch standard payroll values from backend
  useEffect(() => {
    const fetchStandards = async () => {
      try {
        const res = await fetch('http://localhost:5050/api/payroll/standards');
        const data = await res.json();
        setStandardAllowances(data.allowances || []);
        setStandardDeductions(data.deductions || []);
      } catch {
        setStandardAllowances([]);
        setStandardDeductions([]);
      }
    };
    fetchStandards();
  }, []);

  function calculateMonthlyGross(salary: number) {
    if (typeof salary !== "number" || isNaN(salary)) return 0;
    return Math.round(salary / 12);
  }
  function calculateTotalAllowances(details: PayrollDetails | null) {
    if (!details || !Array.isArray(details.allowances)) return 0;
    return details.allowances.reduce((sum, a) => sum + (a.amount || 0), 0);
  }
  function calculateTotalDeductions(details: PayrollDetails | null) {
    if (!details || !Array.isArray(details.deductions)) return 0;
    return details.deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
  }
  function calculateNetMonthlySalary(details: PayrollDetails | null) {
    const gross = details ? calculateMonthlyGross(details.salary) : 0;
    const allowances = calculateTotalAllowances(details);
    const deductions = calculateTotalDeductions(details);
    return gross + allowances - deductions;
  }

  // Fetch salary and payroll details for the current user from backend for all roles
  const fetchSalary = useCallback(async () => {
    setSalaryLoading(true);
    try {
      // Fetch salary from dedicated endpoint
      const res = await fetch(`http://localhost:5050/api/employees/${userId}/salary`);
      if (!res.ok) {
        setSalary(null);
        setPayrollDetails(null);
        setSalaryLoading(false);
        return;
      }
      const data = await res.json();
      setSalary(typeof data.salary === "number" ? data.salary : (data.salary && !isNaN(Number(data.salary)) ? Number(data.salary) : null));
      // Optionally fetch other details from /api/employees/:id if needed
      const empRes = await fetch(`http://localhost:5050/api/employees/${userId}`);
      const empData = empRes.ok ? await empRes.json() : {};
      setPayrollDetails({
        salary: typeof data.salary === "number" ? data.salary : (data.salary && !isNaN(Number(data.salary)) ? Number(data.salary) : 0),
        position: empData.position ?? '',
        department: empData.department ?? '',
        startDate: empData.startDate ?? '',
        allowances: Array.isArray(empData.allowances) && empData.allowances.length > 0 ? empData.allowances : standardAllowances,
        deductions: Array.isArray(empData.deductions) && empData.deductions.length > 0 ? empData.deductions : standardDeductions,
      });
    } catch {
      setSalary(null);
      setPayrollDetails(null);
    }
    setSalaryLoading(false);
  }, [userId, standardAllowances, standardDeductions]);

  useEffect(() => {
    if (activeTab === 'payroll') fetchSalary();
  }, [activeTab, fetchSalary]);

  // Payslip download handler for any month
  const handleDownloadPayslipForMonth = async (month: string) => {
    setPayslipError(null);
    try {
      const response = await fetch(`http://localhost:5050/api/employees/${user.id}/payslip?month=${month}`);
      if (!response.ok) {
        setPayslipError('Failed to download payslip.');
        return;
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `payslip_${user.id}_${month}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setPayslipError('Failed to download payslip.');
    }
  };

  // Payslip download handler for selected month
  const handleDownloadPayslip = async () => {
    await handleDownloadPayslipForMonth(payslipMonth);
  };

  useEffect(() => {
    if (activeTab === 'payroll') fetchSalary();
  }, [activeTab, fetchSalary]);

  // --- Remote Work state and logic ---
  const [isRemoteToday, setIsRemoteToday] = useState(false);
  const [remoteCount, setRemoteCount] = useState(0);
  const [remoteError, setRemoteError] = useState('');
  const [remoteEmployees, setRemoteEmployees] = useState<any[]>([]);
  // Pending remote requests (for admin/superadmin)
  const [pendingRemoteRequests, setPendingRemoteRequests] = useState<any[]>([]);
  // For employee: track if request is pending
  const [remoteRequestPending, setRemoteRequestPending] = useState(false);
  const [remoteApprover, setRemoteApprover] = useState<string | null>(null);

  // Fetch if current user is remote today (on mount and when userId changes)
  useEffect(() => {
    // Only check remote status for employees
    if (user.role !== 'employee') {
      setIsRemoteToday(false);
      setRemoteRequestPending(false);
      setRemoteError('');
      setRemoteApprover(null);
      return;
    }
    const checkRemote = async () => {
      try {
        setRemoteError('');
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch(`http://localhost:5050/api/employees/${userId}`);
        if (!res.ok) {
          setRemoteError('Failed to fetch user for remote check');
          setIsRemoteToday(false);
          setRemoteRequestPending(false);
          setRemoteApprover(null);
          return;
        }
        const emp = await res.json();
        setIsRemoteToday(Array.isArray(emp.remoteWork) && emp.remoteWork.includes(today));
        // Check if there's a pending remote request for this user
        if (Array.isArray(emp.remoteRequests)) {
          setRemoteRequestPending(emp.remoteRequests.includes(today));
        } else {
          setRemoteRequestPending(false);
        }
        // Find approver for today if remote is approved
        if (Array.isArray(emp.remoteWorkApprovals)) {
          const approval = emp.remoteWorkApprovals.find(a => a.date === today);
          setRemoteApprover(approval ? (approval.approver === 'hr' ? 'Accepted by HR' : approval.approver === 'admin' ? 'Accepted by Manager' : `Accepted by ${approval.approverName || approval.approver}`) : null);
        } else {
          setRemoteApprover(null);
        }
      } catch (err) {
        setRemoteError('Error checking remote status');
        setIsRemoteToday(false);
        setRemoteRequestPending(false);
        setRemoteApprover(null);
      }
    };
    if (userId) checkRemote();
  }, [userId, user.role]);

  // Mark remote for today (employee: send request, not direct mark)
  const handleMarkRemote = async () => {
    if (isRemoteToday || remoteRequestPending) return;
    try {
      setRemoteError('');
      const today = new Date().toISOString().slice(0, 10);
      // Send a remote work request (not direct mark)
      const res = await fetch(`http://localhost:5050/api/employees/${userId}/remote-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today })
      });
      if (!res.ok) {
        let errorMsg = 'Failed to request remote work';
        try {
          const errorData = await res.json();
          if (errorData && errorData.error) {
            errorMsg = errorData.error;
          }
        } catch {}
        setRemoteError(errorMsg);
        return;
      }
      setRemoteRequestPending(true);
    } catch {
      setRemoteError('Error requesting remote work');
    }
  };

  // Fetch remote count for today and remote employees for admin/superadmin
  // Also fetch pending remote requests for admin/superadmin
  const fetchRemoteCount = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`http://localhost:5050/api/employees?remoteDate=${today}`);
      const data = await res.json();
      if (data && typeof data === 'object' && 'remoteEmployees' in data && 'pendingRemoteRequests' in data) {
        setRemoteCount(Array.isArray(data.remoteEmployees) ? data.remoteEmployees.length : 0);
        if (user.role === 'admin' || user.role === 'superadmin') {
          setRemoteEmployees(Array.isArray(data.remoteEmployees) ? data.remoteEmployees : []);
          setPendingRemoteRequests(Array.isArray(data.pendingRemoteRequests) ? data.pendingRemoteRequests : []);
        }
      } else {
        // fallback for old response shape
        const filtered = Array.isArray(data)
          ? data.filter(e => Array.isArray(e.remoteWork) && e.remoteWork.includes(today))
          : [];
        setRemoteCount(filtered.length);
        if (user.role === 'admin' || user.role === 'superadmin') {
          setRemoteEmployees(filtered);
          setPendingRemoteRequests([]);
        }
      }
    } catch {
      setRemoteCount(0);
      setRemoteEmployees([]);
      setPendingRemoteRequests([]);
    }
  }, [user.role]);

  useEffect(() => {
    fetchRemoteCount();
  }, [fetchRemoteCount]);

  // Admin: Accept remote request
  const handleAcceptRemoteRequest = async (employeeId: string) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`http://localhost:5050/api/employees/${employeeId}/remote-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today })
      });
      if (res.ok) {
        fetchRemoteCount();
      }
    } catch {}
  };

  // Admin: Cancel remote request
  const handleCancelRemoteRequest = async (employeeId: string) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`http://localhost:5050/api/employees/${employeeId}/remote-cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today })
      });
      if (res.ok) {
        fetchRemoteCount();
      }
    } catch {}
  };

  // --- Manager Section State ---
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<any[]>([]);
  const [managerLoading, setManagerLoading] = useState(false);

  useEffect(() => {
    if (user.role === 'manager') {
      setManagerLoading(true);
      fetch(`http://localhost:5050/api/manager/team?managerId=${user.id}`)
        .then(res => res.json())
        .then(data => setTeamMembers(data))
        .catch(() => setTeamMembers([]));
      fetch(`http://localhost:5050/api/manager/leaves?managerId=${user.id}`)
        .then(res => res.json())
        .then(data => setLeaveRequests(data))
        .catch(() => setLeaveRequests([]));
      fetch(`http://localhost:5050/api/manager/attendance?managerId=${user.id}`)
        .then(res => res.json())
        .then(data => setAttendanceSummary(data))
        .catch(() => setAttendanceSummary([]));
      setManagerLoading(false);
    }
  }, [user.id, user.role]);

  const handleLeaveAction = async (leaveId, action) => {
    await fetch(`http://localhost:5050/api/manager/leaves/${leaveId}/${action}`, { method: 'POST' });
    // Refresh leave requests
    fetch(`http://localhost:5050/api/manager/leaves?managerId=${user.id}`)
      .then(res => res.json())
      .then(data => setLeaveRequests(data))
      .catch(() => setLeaveRequests([]));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        const timesheetDisplay = isClockedIn
          ? new Date(elapsedMs).toISOString().substr(11, 8)
          : clockInTime && clockOutTime
          ? new Date(new Date(clockOutTime).getTime() - new Date(clockInTime).getTime()).toISOString().substr(11, 8)
          : '00:00:00';

        // Calculate number of employees on leave today
        const todayStr = new Date().toISOString().slice(0, 10);
        const onLeaveToday = employees.filter(emp =>
          Array.isArray(emp.leaves) &&
          emp.leaves.some(l =>
            l.status === 'Approved' &&
            l.from <= todayStr &&
            l.to >= todayStr
          )
        ).length;

        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-6">Welcome to your Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {user.role === 'employee' && activeTab === 'dashboard' && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Work Session Tracker</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    <button
                      className="px-4 py-2 rounded bg-green-600 text-white font-semibold disabled:opacity-50"
                      onClick={handleStartSession}
                      disabled={sessionActive}
                    >
                      Start Session
                    </button>
                    <button
                      className="px-4 py-2 rounded bg-red-600 text-white font-semibold disabled:opacity-50"
                      onClick={handleEndSession}
                      disabled={!sessionActive}
                    >
                      End Session
                    </button>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Session History</h4>
                    <ul className="list-disc ml-6">
                      {workSessions.length === 0 && <li>No sessions yet.</li>}
                      {workSessions.map((s, i) => (
                        <li key={i}>
                          Start: {new Date(s.start).toLocaleString()} {s.end ? `| End: ${new Date(s.end).toLocaleString()}` : '| In Progress'}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
              {/* On Leave Today Widget */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>On Leave Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600 mb-2">{onLeaveToday}</div>
                  <div className="text-muted-foreground">Employees on leave</div>
                </CardContent>
              </Card>
              {/* Holidays Widget */}
              {(user.role === 'admin' || user.role === 'superadmin') && (
                  <Card className="col-span-1 mb-4">
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-gray-100">Add Holiday</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddHoliday} className="space-y-3">
                      <input
                        type="text"
                        name="name"
                        value={holidayForm.name}
                        onChange={handleHolidayFormChange}
                        placeholder="Holiday Name"
                        className="w-full px-3 py-2 border rounded-md bg-white text-black border-gray-300 
                                   dark:bg-gray-800 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <input
                        type="date"
                        name="date"
                        value={holidayForm.date}
                        onChange={handleHolidayFormChange}
                        className="w-full px-3 py-2 border rounded-md bg-white text-black border-gray-300 
                                   dark:bg-gray-800 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <button
                        type="submit"
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                                   dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                      >
                        Add Holiday
                      </button>
                      {holidayMsg && (
                        <div className="text-xs mt-1 text-red-600 dark:text-red-400">{holidayMsg}</div>
                      )}
                    </form>
                  </CardContent>
                </Card>
                           
                 )}
              <Card className="col-span-1">
              <CardHeader>
              <CardTitle>Upcoming Holidays</CardTitle>
              </CardHeader>
              <CardContent>
               <ul className="text-muted-foreground space-y-1">
                 {holidays.length === 0 ? (
                 <li>No holidays found.</li>
                  ) : (
                 holidays.map((h, i) => (
                 <li key={i}>{h.name} - {new Date(h.date).toLocaleDateString()}</li>
                  ))
                    )}
                    </ul>
                   </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Welcome New Employees Widget */}
              <Card className="col-span-1 bg-gradient-to-br from-yellow-100 via-pink-100 to-blue-100 dark:from-yellow-900 dark:via-pink-900 dark:to-blue-900 border-2 border-yellow-300 dark:border-yellow-700 shadow-xl relative overflow-hidden">
                <CardHeader>
                  <CardTitle>
                    <span className="flex items-center gap-2 text-2xl font-extrabold text-yellow-700 dark:text-yellow-200">
                      🎉 Welcome New Employees!
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="absolute right-4 top-4 text-4xl opacity-30 pointer-events-none select-none">🎊</div>
                  <ul className="space-y-3 mt-2">
                    {employees.filter(emp => {
                      if (!emp.createdAt) return false;
                      const created = new Date(emp.createdAt);
                      const now = new Date();
                      return (
                        created.getFullYear() === now.getFullYear() &&
                        created.getMonth() === now.getMonth() &&
                        created.getDate() === now.getDate()
                      );
                    }).length === 0 ? (
                      <li className="text-center text-muted-foreground text-lg font-semibold py-4">
                        No new employees today.
                      </li>
                    ) : (
                      employees
                        .filter(emp => {
                          if (!emp.createdAt) return false;
                          const created = new Date(emp.createdAt);
                          const now = new Date();
                          return (
                            created.getFullYear() === now.getFullYear() &&
                            created.getMonth() === now.getMonth() &&
                            created.getDate() === now.getDate()
                          );
                        })
                        .map(emp => (
                          <li key={emp._id} className="flex items-center gap-3 bg-white/70 dark:bg-gray-800/70 rounded-lg px-3 py-2 shadow border border-yellow-200 dark:border-yellow-700">
                            {/* Avatar or initials */}
                            {emp.picture ? (
                              <img src={emp.picture} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-yellow-400 dark:border-yellow-700" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-yellow-200 dark:bg-yellow-700 flex items-center justify-center text-yellow-900 dark:text-yellow-100 font-bold text-lg">
                                {emp.firstname?.[0]}{emp.lastname?.[0]}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-foreground dark:text-yellow-100 text-lg">
                                {emp.firstname} {emp.lastname}
                              </div>
                              <div className="text-xs text-yellow-700 dark:text-yellow-200">{emp.department || 'N/A'}</div>
                            </div>
                            <span className="ml-auto text-2xl animate-bounce">🎈</span>
                          </li>
                        ))
                    )}
                  </ul>
                  <div className="mt-4 text-center text-yellow-700 dark:text-yellow-200 font-bold text-lg">
                    {employees.some(emp => {
                      if (!emp.createdAt) return false;
                      const created = new Date(emp.createdAt);
                      const now = new Date();
                      return (
                        created.getFullYear() === now.getFullYear() &&
                        created.getMonth() === now.getMonth() &&
                        created.getDate() === now.getDate()
                      );
                    }) && "We're excited to have you join the team!"}
                  </div>
                </CardContent>
              </Card>
              {/* Working Remotely Widget */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Working Remotely</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-2">{remoteCount}</div>
                  <div className="text-muted-foreground mb-2">Employees remote today</div>
                  {/* Show list for admin/superadmin */}
                  {(user.role === 'admin' || user.role === 'superadmin') && (
                    <>
                      <ul className="text-muted-foreground text-sm mb-2 max-h-32 overflow-y-auto">
                        {remoteEmployees.length === 0 ? (
                          <li>No one is working remotely today.</li>
                        ) : (
                          remoteEmployees.map(emp => (
                            <li key={emp._id}>
                              {emp.firstname} {emp.lastname} ({emp.department || 'N/A'})
                            </li>
                          ))
                       
                       ) }
                      </ul>
                      {/* Pending remote requests */}
                      <div className="mt-4">
                        <div className="font-semibold mb-1">Pending Remote Requests</div>
                        <ul className="text-sm max-h-32 overflow-y-auto">
                          {pendingRemoteRequests.length === 0 ? (
                            <li className="text-muted-foreground">No pending requests.</li>
                          ) : (
                            pendingRemoteRequests.map(emp => (
                              <li key={emp._id} className="flex items-center justify-between mb-1">
                                <span>
                                  {emp.firstname} {emp.lastname} ({emp.department || 'N/A'})
                                </span>
                                <span className="flex gap-2">
                                  <button
                                    className="px-2 py-1 bg-green-600 text-white rounded text-xs font-semibold"
                                    onClick={() => handleAcceptRemoteRequest(emp._id)}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold"
                                    onClick={() => handleCancelRemoteRequest(emp._id)}
                                  >
                                    Cancel
                                  </button>
                                </span>
                              </li>
                            ))
                         ) }
                        </ul>
                      </div>
                    </>
                  )}
                  {/* Button for employee to mark remote */}
                  {user.role === 'employee' && (
                    <button
                      className="px-4 py-2 rounded bg-blue-600 text-white font-semibold disabled:opacity-50"
                      onClick={handleMarkRemote}
                      disabled={isRemoteToday || remoteRequestPending}
                    >
                      {isRemoteToday
                        ? remoteApprover || "Request Accepted"
                        : remoteRequestPending
                        ? "Pending Approval"
                        : "Mark as Working Remotely"}
                    </button>
                  )}
                  {/* Optionally show error */}
                  {remoteError && (
                    <div className="text-xs text-red-600 mt-2">{remoteError}</div>
                  )}
                </CardContent>
              </Card>
              {/* Attendance Widget */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {todayTotalMarked > 0
                          ? `${Math.round((todayPresent / todayTotalMarked) * 100)}%`
                          : 'N/A'}
                      </div>
                      <div className="text-muted-foreground text-sm">Present</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-500">
                        {todayTotalMarked > 0
                          ? `${Math.round((todayAbsent / todayTotalMarked) * 100)}%`
                          : 'N/A'}
                      </div>
                      <div className="text-muted-foreground text-sm">Absent</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {todayTotalMarked} marked today
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Announcements Widget */}
              <Card>
                <CardHeader>
                  <CardTitle>Announcements</CardTitle>
                </CardHeader>
                <CardContent>
                  {(user.role === 'admin' || user.role === 'superadmin') && (
                    <form className="mb-4 flex gap-2" onSubmit={handleAddAnnouncement}>
                      <input
                        className="flex-1 border rounded px-3 py-2 bg-background text-foreground"
                        placeholder="Write a new announcement..."
                        value={announcementInput}
                        onChange={e => setAnnouncementInput(e.target.value)}
                        required
                        disabled={announcementLoading}
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded font-semibold"
                        disabled={announcementLoading}
                      >
                        {announcementLoading ? 'Posting...' : 'Post'}
                      </button>
                    </form>
                  )}
                  {announcementMsg && (
                    <div className={`mb-2 text-sm ${announcementMsg.startsWith('Error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {announcementMsg}
                    </div>
                  )}
                  {announcements.length === 0 ? (
                    <p className="text-muted-foreground">No announcements yet.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {announcements.map(a => (
                        <li key={a._id} className="py-3 flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-foreground">{a.message}</div>
                            <div className="text-xs text-muted-foreground">
                              {a.createdBy ? `By ${a.createdBy}` : ''} &middot; {new Date(a.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          {(user.role === 'admin' || user.role === 'superadmin') && (
                            <>
                              <button
                                className="ml-4 text-xs text-red-600 hover:underline"
                                onClick={() => setConfirmDeleteAnnouncementId(a._id)}
                                title="Delete announcement"
                              >
                                Delete
                              </button>
                              {/* Confirmation dialog for announcement delete */}
                              {confirmDeleteAnnouncementId === a._id && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                                  <div className="bg-card rounded-lg shadow-lg max-w-xs w-full p-6 relative">
                                    <div className="mb-4 text-center">
                                      Are you sure you want to delete this announcement?
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <button
                                        className="px-4 py-2 bg-muted text-foreground rounded font-semibold"
                                        onClick={() => setConfirmDeleteAnnouncementId(null)}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        className="px-4 py-2 bg-red-600 text-white rounded font-semibold"
                                        onClick={() => handleDeleteAnnouncement(a._id)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              {/* Quick Links Widget */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc ml-6 text-blue-700 dark:text-blue-400 space-y-1">
                    <li className="cursor-pointer hover:underline" onClick={() => setActiveTab('attendance')}>Attendance</li>
                    <li className="cursor-pointer hover:underline" onClick={() => setActiveTab('leaves')}>Leaves</li>
                    <li className="cursor-pointer hover:underline" onClick={() => setActiveTab('payroll')}>Payroll</li>
                    <li className="cursor-pointer hover:underline" onClick={() => setActiveTab('projects')}>Projects</li>
                    <li className="cursor-pointer hover:underline" onClick={() => setActiveTab('teams')}>Teams</li>
                    <li className="cursor-pointer hover:underline" onClick={() => setActiveTab('awards')}>Awards</li>
                    {/* Removed Performance quick link */}
                  </ul>
                </CardContent>
              </Card>
            </div>
            
          </div>
        );
      case 'personal-details':
        return <EmployeePersonalDetails user={user} />;
      case 'employees':
        return <EmployeeList userRole={user.role} />;
      case 'add-employee':
        return (user.role === 'superadmin' || user.role === 'admin') ? <EmployeeForm onEmployeeAdded={fetchEmployees} /> : <EmployeeList userRole={user.role} />;
      case 'admin-panel':
        // Allow both admin and superadmin to access AdminPanel
        return (user.role === 'admin' || user.role === 'superadmin')
          ? <AdminPanel userRole={user.role} />
          : <div className="p-8">Access denied.</div>;
      case 'reports':
        return <Reports userRole={user.role} />;
      case 'settings':
        return <Settings userRole={user.role} userId={userId} />;
      case 'attendance':
        if (user.role === 'employee') {
          // Employee: show personal attendance calendar
          return (
            <div className="p-8">
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>My Attendance Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center gap-4">
                    <label className="font-semibold text-foreground" htmlFor="employee-calendar-month">Month:</label>
                    <input
                      id="employee-calendar-month"
                      type="month"
                      value={employeeCalendarMonth}
                      onChange={e => setEmployeeCalendarMonth(e.target.value)}
                      className="border rounded px-2 py-1 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                      max={new Date().toISOString().substring(0, 7)}
                    />
                  </div>
                  <AttendanceCalendar user={user} month={employeeCalendarMonth} />
                </CardContent>
              </Card>
            </div>
          );
        }
        // Admins and super admins: employee selector + calendar, and daily attendance
        return (
          <div className="p-8">
            <Card className="max-w-2xl mx-auto mb-8">
              <CardHeader>
                <CardTitle>View Employee Attendance Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-4">
                  <label className="font-semibold text-foreground" htmlFor="calendar-employee">Employee:</label>
                  <select
                    id="calendar-employee"
                    value={calendarEmployeeId}
                    onChange={e => setCalendarEmployeeId(e.target.value)}
                    className="border rounded px-2 py-1 bg-background text-foreground"
                  >
                    <option value="">Select employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstname} {emp.lastname}
                      </option>
                    ))}
                  </select>
                  <label className="font-semibold text-foreground ml-4" htmlFor="calendar-month">Month:</label>
                  <input
                    id="calendar-month"
                    type="month"
                    value={calendarMonth}
                    onChange={e => setCalendarMonth(e.target.value)}
                    className="border rounded px-2 py-1 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                    max={new Date().toISOString().substring(0, 7)}
                  />
                </div>
                {calendarEmployeeId ? (
                  <AttendanceCalendar
                    user={{ id: calendarEmployeeId }}
                    month={calendarMonth}
                  />
                ) : (
                  <div className="text-muted-foreground">Select an employee to view their attendance calendar.</div>
                )}
              </CardContent>
            </Card>
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-6 bg-blue-600 rounded-l"></span>
                    <span>Attendance Overview</span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-foreground">Select Date:</span>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={e => setAttendanceDate(e.target.value)}
                      className="border rounded px-2 py-1 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                      min={calendarMonth + '-01'}
                      max={new Date().toISOString().substring(0, 10)}
                    />
                  </div>
                  <div className="text-lg font-semibold text-muted-foreground">
                    Attendance for <span className="text-blue-700 dark:text-blue-300">{attendanceDate}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Present Card */}
                  <div className="rounded-xl bg-gradient-to-br from-green-100/80 to-green-200/60 dark:from-green-900 dark:to-green-800 shadow-lg p-6 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-7 h-7 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-2xl font-bold text-green-700 dark:text-green-200">Present</span>
                    </div>
                    <div className="text-5xl font-extrabold text-foreground mb-2">{presentEmployees.length}</div>
                    <div className="text-xs text-muted-foreground mb-2">Employees present</div>
                    <ul className="mt-2 text-sm text-green-900 dark:text-green-200 text-left max-h-32 overflow-y-auto w-full">
                      {attendanceLoading ? (
                        <li>Loading...</li>
                      ) : presentEmployees.length === 0 ? (
                        <li>No one present.</li>
                      ) : (
                        presentEmployees.map(emp => (
                          <li key={emp._id} className="flex items-center gap-2 py-1">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 font-bold text-base">
                              {emp.firstname && emp.lastname
                                ? `${emp.firstname[0]}${emp.lastname[0]}`
                                : emp.firstname?.slice(0, 2) || 'EM'}
                            </span>
                            <span className="font-medium">{emp.firstname} {emp.lastname}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{emp.department}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  {/* Absent Card */}
                  <div className="rounded-xl bg-gradient-to-br from-red-100/80 to-red-200/60 dark:from-red-900 dark:to-red-800 shadow-lg p-6 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-7 h-7 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-2xl font-bold text-red-700 dark:text-red-200">Absent</span>
                    </div>
                    <div className="text-5xl font-extrabold text-foreground mb-2">{absentEmployees.length}</div>
                    <div className="text-xs text-muted-foreground mb-2">Employees absent</div>
                    <ul className="mt-2 text-sm text-red-900 dark:text-red-200 text-left max-h-32 overflow-y-auto w-full">
                      {attendanceLoading ? (
                        <li>Loading...</li>
                      ) : absentEmployees.length === 0 ? (
                        <li>No one absent.</li>
                      ) : (
                        absentEmployees.map(emp => (
                          <li key={emp._id} className="flex items-center gap-2 py-1">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 font-bold text-base">
                              {emp.firstname && emp.lastname
                                ? `${emp.firstname[0]}${emp.lastname[0]}`
                                : emp.firstname?.slice(0, 2) || 'EM'}
                            </span>
                            <span className="font-medium">{emp.firstname} {emp.lastname}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{emp.department}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  {/* Total Card */}
                  <div className="rounded-xl bg-gradient-to-br from-gray-100/80 to-gray-200/60 dark:from-gray-900 dark:to-gray-800 shadow-lg p-6 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-7 h-7 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                      </svg>
                      <span className="text-2xl font-bold text-blue-700 dark:text-blue-200">Total</span>
                    </div>
                    <div className="text-5xl font-extrabold text-foreground mb-2">{presentEmployees.length + absentEmployees.length}</div>
                    <div className="text-xs text-muted-foreground mb-2">Total marked</div>
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                      <span className="inline-block px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold">
                        {presentEmployees.length + absentEmployees.length} / {employees.length} employees
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'leaves':
        // Leaves feature: show leave balance, request leave, and leave history
        return (
          <div className="p-8">
            {/* Only show leave request form for employees */}
            {user.role === 'employee' && (
              <Card className="max-w-2xl mx-auto mb-8">
                <CardHeader>
                  <CardTitle>My Leave Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-200">{12 - annualLeaves}</div>
                      <div className="text-muted-foreground text-sm">Annual Leaves Left</div>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-200">{5 - sickLeaves}</div>
                      <div className="text-muted-foreground text-sm">Sick Leaves Left</div>
                    </div>
                  </div>
                  <form className="space-y-4" onSubmit={editingLeaveId ? handleUpdateLeave : handleLeaveSubmit}>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Leave Type</label>
                      <select
                        name="type"
                        value={leaveForm.type}
                        onChange={handleLeaveFormChange}
                        className="w-full border rounded px-3 py-2 bg-background text-foreground"
                        required
                        disabled={leaveLoading}
                      >
                        <option value="Annual">Annual</option>
                        <option value="Sick">Sick</option>
                        <option value="Unpaid">Unpaid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">From</label>
                      <input
                        type="date"
                        name="from"
                        value={leaveForm.from}
                        onChange={handleLeaveFormChange}
                        className="w-full border rounded px-3 py-2 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                        required
                        disabled={leaveLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">To</label>
                      <input
                        type="date"
                        name="to"
                        value={leaveForm.to}
                        onChange={handleLeaveFormChange}
                        className="w-full border rounded px-3 py-2 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                        required
                        disabled={leaveLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Reason</label>
                      <textarea
                        name="reason"
                        value={leaveForm.reason}
                        onChange={handleLeaveFormChange}
                        className="w-full border rounded px-3 py-2 bg-background text-foreground"
                        rows={2}
                        placeholder="Reason for leave"
                        required
                        disabled={leaveLoading}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded font-semibold"
                        disabled={leaveLoading}
                      >
                        {leaveLoading
                          ? (editingLeaveId ? 'Updating...' : 'Requesting...')
                          : (editingLeaveId ? 'Update Leave' : 'Request Leave')}
                      </button>
                      {editingLeaveId && (
                        <button
                          type="button"
                          className="px-4 py-2 bg-muted text-foreground rounded font-semibold"
                          onClick={handleCancelEditLeave}
                          disabled={leaveLoading}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    {leaveMsg && (
                      <div className={`mt-2 text-sm ${leaveMsg.startsWith('Error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {leaveMsg}
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            )}
            <Card className="max-w-2xl mx-auto bg-card text-foreground">
              <CardHeader>
                <CardTitle>Leave History</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {leaves.length === 0 && (
                    <li className="py-2 text-muted-foreground">No leave requests yet.</li>
                  )}
                  {leaves.map(l => (
                    <li key={l._id} className="py-2 flex justify-between items-center">
                      <span>
                        {/* Show employee name for admin/superadmin */}
                        {(user.role === 'admin' || user.role === 'superadmin') && l.employee && (
                          <span className="font-semibold text-foreground">
                            {l.employee.firstname} {l.employee.lastname}
                            <span className="text-xs text-muted-foreground ml-2">
                              ({l.employee.email || l.employeeId})
                            </span>
                            <br />
                          </span>
                        )}
                        {l.from} to {l.to} ({l.type})<br />
                        <span className="text-xs text-muted-foreground">{l.reason}</span>
                      </span>
                      <span className={
                        l.status === 'Approved'
                          ? 'text-green-600 dark:text-green-400'
                          : l.status === 'Pending'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }>
                        {l.status}
                      </span>
                      {/* Employee: show edit/delete for pending leaves */}
                      {user.role === 'employee' && l.status === 'Pending' && (
                        <span className="flex gap-2 ml-4">
                          <button
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold"
                            onClick={() => handleEditLeave(l)}
                            disabled={editingLeaveId === l._id}
                          >
                            Edit
                          </button>
                          <button
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold"
                            onClick={() => setConfirmDeleteLeaveId(l._id)}
                            disabled={leaveLoading}
                          >
                            Delete
                          </button>
                        </span>
                      )}
                      {/* Admin/superadmin: show approve/reject buttons for pending leaves */}
                      {(user.role === 'admin' || user.role === 'superadmin') && l.status === 'Pending' && (
                        <span className="flex gap-2 ml-4">
                          <button
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs font-semibold"
                            onClick={() => handleLeaveStatus(l._id, 'Approved')}
                          >
                            Approve
                          </button>
                          <button
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold"
                            onClick={() => handleLeaveStatus(l._id, 'Rejected')}
                          >
                            Reject
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {leaveMsg && (
                  <div className={`mt-2 text-sm ${leaveMsg.startsWith('Error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {leaveMsg}
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Confirmation dialog */}
            {confirmDeleteLeaveId && (

              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-card rounded-lg shadow-lg max-w-xs w-full p-6 relative">
                  <div className="mb-4 text-center">
                    Are you sure you want to delete this leave request?
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-4 py-2 bg-muted text-foreground rounded font-semibold"
                      onClick={() => setConfirmDeleteLeaveId(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded font-semibold"
                      onClick={() => {
                        handleDeleteLeave(confirmDeleteLeaveId);
                        setConfirmDeleteLeaveId(null);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'payroll':
        // Returns an array of the last 6 months (including current), in "YYYY-MM" format, most recent first
        function getRecentMonths(): string[] {
          const months: string[] = [];
          const now = new Date();
          for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            months.push(`${y}-${m}`);
          }
          return months;
        }
        // Helper to format "YYYY-MM" as "Month YYYY"
        function formatMonth(month: string): string {
          const [y, m] = month.split('-');
          const date = new Date(Number(y), Number(m) - 1, 1);
          return date.toLocaleString('default', { month: 'long', year: 'numeric' });
        }

        // Payroll feature: show salary details and payslip download
        return (
          <div className="p-8">
            <Card className="max-w-2xl mx-auto mb-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center mb-2">My Salary Details</CardTitle>
              </CardHeader>
              <CardContent>
                {salaryLoading ? (
                  <div className="flex justify-center items-center h-24">Loading salary...</div>
                ) : (
                  <div className="mb-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900 rounded p-3 flex flex-col">
                        <span className="font-semibold text-blue-700 dark:text-blue-200">Annual CTC</span>
                        <span className="text-lg font-bold">{salary !== null && salary !== undefined ? `₹${salary.toLocaleString("en-IN")}` : <span className="text-red-600">Not available</span>}</span>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900 rounded p-3 flex flex-col">
                        <span className="font-semibold text-purple-700 dark:text-purple-200">Monthly Gross Salary</span>
                        <span className="text-lg font-bold">{salary !== null && salary !== undefined ? `₹${calculateMonthlyGross(salary)?.toLocaleString("en-IN")}` : '--'}</span>
                      </div>
                    </div>
                    {/* Allowances Section */}
                    {Array.isArray(payrollDetails?.allowances) && payrollDetails.allowances.length > 0 && (
                      <div>
                        <div className="font-semibold text-green-700 dark:text-green-300 mb-1 flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 01-1.4 2.4H6a1.65 1.65 0 01-1.4-2.4l1.4-2.4V7a5 5 0 0110 0v5.6l1.4 2.4z"/></svg>
                          Allowances (Monthly)
                        </div>
                        <table className="w-full text-sm mb-2">
                          <tbody>
                            {payrollDetails.allowances.map((a, idx) => (
                              <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="py-1 pl-2">{a.name}</td>
                                <td className="py-1 pr-2 text-right text-green-700 dark:text-green-300 font-semibold">₹{a.amount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {/* Deductions Section */}
                    {Array.isArray(payrollDetails?.deductions) && payrollDetails.deductions.length > 0 && (
                      <div>
                        <div className="font-semibold text-red-700 dark:text-red-300 mb-1 flex items-center gap-2">
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 01-1.4 2.4H6a1.65 1.65 0 01-1.4-2.4l1.4-2.4V7a5 5 0 0110 0v5.6l1.4 2.4z"/></svg>
                          Deductions (Monthly)
                        </div>
                        <table className="w-full text-sm mb-2">
                          <tbody>
                            {payrollDetails.deductions.map((d, idx) => (
                              <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="py-1 pl-2">{d.name}</td>
                                <td className="py-1 pr-2 text-right text-red-700 dark:text-red-300 font-semibold">₹{d.amount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {/* Net Salary Section */}
                    <div className="flex justify-between items-center mt-4 p-3 rounded bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-700 shadow">
                      <span className="font-bold text-lg">Net Monthly Salary</span>
                      <span className="font-bold text-2xl text-green-700 dark:text-green-300">
                        {payrollDetails ? `₹${calculateNetMonthlySalary(payrollDetails)?.toLocaleString("en-IN")}` : '--'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">* CTC is annual. All other values are monthly. Net = Gross + Allowances - Deductions</div>
                  </div>
                )}
                <div className="mb-4 flex items-center gap-4">
                  <label className="font-semibold text-foreground" htmlFor="payslip-month">Payslip Month:</label>
                  <input
                    id="payslip-month"
                    type="month"
                    value={payslipMonth}
                    onChange={e => setPayslipMonth(e.target.value)}
                    className="border rounded px-2 py-1 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                    max={new Date().toISOString().substring(0, 7)}
                  />
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded font-semibold"
                    onClick={handleDownloadPayslip}
                    disabled={salary === null || !payslipMonth}
                  >
                    Download Payslip (PDF)
                  </button>
                </div>
                {payslipError && (
                  <div className="text-red-600 text-sm mb-2">{payslipError}</div>
                )}
              </CardContent>
            </Card>
            <Card className="max-w-2xl mx-auto bg-card text-foreground">
              <CardHeader>
                <CardTitle>Payslip History</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {getRecentMonths().map(month => (
                    <li key={month} className="py-2 flex justify-between">
                      <span>{formatMonth(month)}</span>
                      <button
                        className="text-blue-600 dark:text-blue-400 underline"
                        onClick={() => handleDownloadPayslipForMonth(month)}
                      >
                        Download
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        );
      case 'projects':
        return (
          <div className="p-8">
            
              <Card className="max-w-3xl mx-auto mb-8 bg-card text-foreground">
                <CardHeader>
                  <CardTitle>Add New Project</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleProjectSubmit} ref={projectFormRef}>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Project Name</label>
                      <input
                        className="w-full border rounded px-3 py-2 bg-background text-foreground"
                        placeholder="Enter project name"
                        name="name"
                        value={projectForm.name}
                        onChange={handleProjectFormChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Description</label>
                      <textarea
                        className="w-full border rounded px-3 py-2 bg-background text-foreground"
                        placeholder="Describe the project"
                        rows={3}
                        name="description"
                        value={projectForm.description}
                        onChange={handleProjectFormChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground dark:text-gray-200">
                        Project Lead (Admin/Super Admin)
                      </label>
                      <select
                        name="lead"
                        value={projectForm.lead}
                        onChange={handleProjectFormChange}
                        required
                        className="w-full border rounded px-3 py-2 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      >
                        <option value="" className="text-gray-400 dark:text-gray-500">Select project lead</option>
                        {leadOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Team (Employees & Interns)</label>
                      <div className="border rounded bg-background px-2 py-2 max-h-64 overflow-y-auto">
                        {teamOptions.length === 0 && (
                          <div className="text-xs text-muted-foreground">No team members available.</div>
                        )}
                        <ul className="space-y-2">
                          {teamOptions.map(opt => (
                            <li key={opt.value} className="flex items-center gap-3 hover:bg-muted/50 rounded px-2 py-1 transition">
                              <input
                                type="checkbox"
                                value={opt.value}
                                checked={projectForm.team.includes(opt.value)}
                                onChange={handleTeamCheckbox}
                                className="accent-blue-600 h-4 w-4"
                                id={`team-checkbox-${opt.value}`}
                              />
                              <label htmlFor={`team-checkbox-${opt.value}`} className="flex-1 cursor-pointer text-sm">
                                {opt.label}
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Select one or more team members.
                      </div>
                    </div>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-semibold">Add Project</button>
                    {projectMsg && (
                      <div className={`mt-2 text-sm ${projectMsg.startsWith('Error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {projectMsg}
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            
            <div className="max-w-6xl mx-auto">
              <Card className="bg-gray-50 dark:bg-gray-900 text-foreground mb-6 border-2 border-gray-300 dark:border-gray-700 shadow-lg">
                <CardHeader>
                  <CardTitle>Ongoing Company Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  {deleteMsg && (
                    <div className={`mb-4 text-sm font-medium ${deleteMsg.startsWith('Project deleted') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {deleteMsg}
                    </div>
                  )}
                  {editMsg && (
                    <div className={`mb-4 text-sm font-medium ${editMsg.startsWith('Project updated') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {editMsg}
                    </div>
                  )}
                  {concludeMsg && (
                    <div className={`mb-4 text-sm font-medium ${concludeMsg.startsWith('Project marked') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {concludeMsg}
                    </div>
                  )}
                  {projects.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground">No projects found.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                      {projects.map((proj) => (
                        <div
                          key={proj._id || proj.name}
                          className={`rounded-xl border p-6 flex flex-col min-h-[200px] shadow-md
                            ${proj.status === 'over' ? 'border-gray-400 bg-gray-200 dark:bg-gray-700 opacity-70' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'}
                          `}
                        >
                          {/* Project Name and Status */}
                          <div className="mb-2">
                            <div className="font-bold text-xl text-gray-900 dark:text-gray-100 truncate">
                              {proj.name}
                              {proj.status === 'over' && (
                                <span className="ml-2 px-2 py-1 rounded bg-red-500 text-white text-xs font-semibold">Project Over</span>
                              )}
                            </div>
                          </div>
                          {/* Show completion message if project is over */}
                          {proj.status === 'over' && (
                            <div className="mb-2 p-2 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-200 text-sm font-semibold">
                              This project is complete. All team members must submit a report of the completed project:
                              <ul className="list-disc ml-6 mt-2">
                                {Array.isArray(proj.team) && proj.team.length > 0
                                  ? proj.team.map((id: string) => {
                                      const member = teamOptions.find(opt => opt.value === id);
                                      return (
                                        <li key={id}>
                                          {member ? member.label : id}
                                        </li>
                                      );
                                    })
                                  : <li>N/A</li>}
                              </ul>
                            </div>
                          )}
                          {/* Action Buttons */}
                          {(user.role === 'admin' || user.role === 'superadmin') && (
                            <div className="flex gap-2 mb-2 flex-wrap">
                              {proj.status !== 'over' && (
                                <button
                                  onClick={() => handleConcludeProject(proj._id)}
                                  className="text-orange-600 hover:underline text-xs font-semibold"
                                  title="Conclude Project"
                                >
                                  Conclude
                                </button>
                              )}
                              <button
                                onClick={() => handleEditProject(proj)}
                                className="text-blue-600 hover:underline text-xs font-semibold"
                                title="Edit Project"
                              >
                                Edit
                              </button>
                              {confirmDeleteId === proj._id ? (
                                <div className="flex flex-col items-end gap-2">
                                  <div className="text-xs text-foreground mb-1">Are you sure?</div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleDeleteProject(proj._id)}
                                      className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-2 py-1 bg-muted text-foreground rounded text-xs font-semibold"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(proj._id)}
                                  className="text-red-600 hover:underline text-xs font-semibold"
                                  title="Delete Project"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                          {/* ...existing code for description, lead, team, created/updated... */}
                          <div className="text-xs text-muted-foreground mb-2">{proj.description}</div>
                          <div className="mb-2">
                            <span className="font-semibold text-base text-foreground">Lead: </span>
                            <span className="text-base text-muted-foreground">
                              {(() => {
                                const lead = leadOptions.find(opt => opt.value === proj.lead);
                                return lead ? lead.label : (proj.lead || 'N/A');
                              })()}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-base text-foreground">Team: </span>
                            <ul className="text-base text-muted-foreground list-disc ml-6 mt-2">
                              {Array.isArray(proj.team) && proj.team.length > 0
                                ? proj.team.map((id: string) => {
                                    const member = teamOptions.find(opt => opt.value === id);
                                    return (
                                      <li key={id}>
                                        {member ? member.label : id}
                                      </li>
                                    );
                                  })
                                : <li>N/A</li>}
                          </ul>
                          </div>
                          <div className="pt-4 mt-auto flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Created: {proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Updated: {proj.updatedAt ? new Date(proj.updatedAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      ))}

                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            {/* Edit Project Modal */}
            {editProject && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-card rounded-lg shadow-lg max-w-lg w-full p-6 relative">
                  <button
                    className="absolute top-2 right-2 text-lg text-muted-foreground hover:text-foreground"
                    onClick={() => setEditProject(null)}
                  >
                    ×
                  </button>
                  <h2 className="text-xl font-bold mb-4">Edit Project</h2>
                  <form className="space-y-4" onSubmit={handleEditProjectSubmit}>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Project Name</label>
                      <input
                        className="w-full border rounded px-3 py-2 bg-background text-foreground"
                        name="name"
                        value={editProject.name}
                        onChange={handleEditProjectChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Description</label>
                      <textarea
                        className="w-full border rounded px-3 py-2 bg-background text-foreground"
                        name="description"
                        value={editProject.description}
                        onChange={handleEditProjectChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground dark:text-gray-200">
                        Project Lead (Admin/Super Admin)
                      </label>
                      <select
                        name="lead"
                        value={editProject.lead}
                        onChange={handleEditProjectChange}
                        required
                        className="w-full border rounded px-3 py-2 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      >
                        <option value="" className="text-gray-400 dark:text-gray-500">Select project lead</option>
                        {leadOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Team (Employees & Interns)</label>
                      <div className="border rounded bg-background px-2 py-2 max-h-64 overflow-y-auto">
                        <ul className="space-y-2">
                          {teamOptions.map(opt => (
                            <li key={opt.value} className="flex items-center gap-3 hover:bg-muted/50 rounded px-2 py-1 transition">
                              <input
                                type="checkbox"
                                value={opt.value}
                                checked={editProject.team.includes(opt.value)}
                                onChange={handleEditTeamCheckbox}
                                className="accent-blue-600 h-4 w-4"
                                id={`edit-team-checkbox-${opt.value}`}
                              />
                              <label htmlFor={`edit-team-checkbox-${opt.value}`} className="flex-1 cursor-pointer text-sm">
                                {opt.label}
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 bg-muted text-foreground rounded font-semibold"
                        onClick={() => setEditProject(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded font-semibold"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      case 'teams':
        // Teams feature: show team members and allow team creation/edit/delete
        return (
          <div className="p-8">
            {(user.role === 'superadmin' || user.role === 'admin') && (
              <Card className="max-w-2xl mx-auto mb-8 bg-card text-foreground">
                <CardHeader>
                  <CardTitle>Create New Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleTeamSubmit}>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Team Name</label>
                      <input
                        className="w-full border rounded px-3 py-2 bg-background text-foreground"
                        name="name"
                        value={teamForm.name}
                        onChange={handleTeamFormChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Members</label>
                      <div className="border rounded bg-background px-2 py-2 max-h-64 overflow-y-auto">
                        <ul className="space-y-2">
                          {employees.map(emp => (
                            <li key={emp._id} className="flex items-center gap-3 hover:bg-muted/50 rounded px-2 py-1 transition">
                              <input
                                type="checkbox"
                                value={emp._id}
                                checked={teamForm.members.includes(emp._id)}
                                onChange={handleTeamMemberCheckbox}
                                className="accent-blue-600 h-4 w-4"
                                id={`team-member-checkbox-${emp._id}`}
                              />
                              <label htmlFor={`team-member-checkbox-${emp._id}`} className="flex-1 cursor-pointer text-sm">
                                {emp.firstname} {emp.lastname} ({emp.department || 'N/A'})
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-semibold">Create Team</button>
                    {teamMsg && (
                      <div className={`mt-2 text-sm ${teamMsg.startsWith('Error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {teamMsg}
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            )}
            <div className="max-w-4xl mx-auto">
              <Card className="bg-gray-50 dark:bg-gray-900 text-foreground mb-6 border-2 border-gray-300 dark:border-gray-700 shadow-lg">
                <CardHeader>
                  <CardTitle>Teams</CardTitle>
                </CardHeader>
                <CardContent>
                  {editTeamMsg && (
                    <div className={`mb-4 text-sm font-medium ${editTeamMsg.startsWith('Team updated') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {editTeamMsg}
                    </div>
                  )}
                  {teams.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground">No teams found.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      {teams.map(team => (
                        <div key={team._id} className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 flex flex-col min-h-[200px] shadow-md">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-xl text-gray-900 dark:text-gray-100 truncate">{team.name}</span>
                            {(user.role === 'admin' || user.role === 'superadmin') && (
                              <div className="flex gap-2">
                                {/* ...edit/delete buttons... */}
                                <button
                                  onClick={() => handleEditTeam(team)}
                                  className="text-blue-600 hover:underline text-xs font-semibold"
                                  title="Edit Team"
                                >
                                  Edit
                                </button>
                                {confirmDeleteTeamId === team._id ? (
                                  <div className="flex flex-col items-end gap-2">
                                    <div className="text-xs text-foreground mb-1">Are you sure?</div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleDeleteTeam(team._id)}
                                        className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold"
                                      >
                                        Delete
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteTeamId(null)}
                                        className="px-2 py-1 bg-muted text-foreground rounded text-xs font-semibold"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteTeamId(team._id)}
                                    className="text-red-600 hover:underline text-xs font-semibold"
                                    title="Delete Team"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-base text-foreground">Members:</span>
                            <ul className="text-base text-muted-foreground list-disc ml-6 mt-2">
                              {Array.isArray(team.members) && team.members.length > 0
                                ? team.members.map((id: string) => {
                                    const emp = employees.find(e => e._id === id);
                                    return (
                                      <li key={id}>
                                        {emp ? `${emp.firstname} ${emp.lastname} (${emp.department || 'N/A'})` : id}
                                      </li>
                                    );
                                  })
                                : <li>N/A</li>}
                          </ul>
                          </div>
                        </div>
                      ))}

                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            {/* Edit Team Modal */}
            {editTeam && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-card rounded-lg shadow-lg max-w-lg w-full p-6 relative">
                  <button
                    className="absolute top-2 right-2 text-lg text-muted-foreground hover:text-foreground"
                    onClick={() => setEditTeam(null)}
                  >
                    ×
                  </button>
                  <h2 className="text-xl font-bold mb-4">Edit Team</h2>
                  <form className="space-y-4" onSubmit={handleEditTeamSubmit}>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Team Name</label>
                      <input
                        className="w-full border rounded px-3 py-2 bg-background text-foreground"
                        name="name"
                        value={editTeam.name}
                        onChange={handleEditTeamChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Members</label>
                      <div className="border rounded bg-background px-2 py-2 max-h-64 overflow-y-auto">
                        <ul className="space-y-2">
                          {employees.map(emp => (
                            <li key={emp._id} className="flex items-center gap-3 hover:bg-muted/50 rounded px-2 py-1 transition">
                              <input
                                type="checkbox"
                                value={emp._id}
                                checked={editTeam.members.includes(emp._id)}
                                onChange={handleEditTeamMemberCheckbox}
                                className="accent-blue-600 h-4 w-4"
                                id={`edit-team-member-checkbox-${emp._id}`}
                              />
                              <label htmlFor={`edit-team-member-checkbox-${emp._id}`} className="flex-1 cursor-pointer text-sm">
                                {emp.firstname} {emp.lastname} ({emp.department || 'N/A'})
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 bg-muted text-foreground rounded font-semibold"
                        onClick={() => setEditTeam(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded font-semibold"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      case 'awards':
        // Awards feature: show awards, allow nomination, voting, and winner announcement
        return (
          <div className="p-8">
            <Card className="max-w-2xl mx-auto mb-8 bg-card text-foreground">
              <CardHeader>
                <CardTitle>Awards & Nominations</CardTitle>
              </CardHeader>
              <CardContent>
                <AwardsSection user={user} employees={employees} />
              </CardContent>
            </Card>
          </div>
        );
      case 'org-structure':
        return <OrgChart />;
      default:
        return <div className="p-8">Coming soon...</div>;
    }
  }; // <-- FIX: close renderContent function here

  // Admin notifications for employee session start
  const [notifications, setNotifications] = useState<{ employeeName: string, time: string }[]>([]);
  useEffect(() => {
    if (user.role === 'admin' || user.role === 'superadmin') {
      socket.emit('register', user.role);
      socket.on('employee-session-started', (data) => {
        setNotifications((prev) => [
          { employeeName: data.employeeName, time: data.time },
          ...prev
        ]);
      });
      return () => {
        socket.off('employee-session-started');
      };
    }
  }, [user.role]);

  // Real-time update: listen for remoteRequestApproved
  useEffect(() => {
    if (user.role !== 'employee') return;
    const handler = (data: { employeeId: string; date: string }) => {
      if (data.employeeId === userId) {
        // Re-fetch remote status for this employee
        const today = new Date().toISOString().slice(0, 10);
        if (data.date === today) {
          // Call the same logic as in checkRemote
          (async () => {
            try {
              setRemoteError('');
              const res = await fetch(`http://localhost:5050/api/employees/${userId}`);
              if (!res.ok) {
                setRemoteError('Failed to fetch user for remote check');
                setIsRemoteToday(false);
                setRemoteRequestPending(false);
                setRemoteApprover(null);
                return;
              }
              const emp = await res.json();
              setIsRemoteToday(Array.isArray(emp.remoteWork) && emp.remoteWork.includes(today));
              if (Array.isArray(emp.remoteRequests)) {
                setRemoteRequestPending(emp.remoteRequests.includes(today));
              } else {
                setRemoteRequestPending(false);
              }
              // Find approver for today if remote is approved
              if (Array.isArray(emp.remoteWorkApprovals)) {
                const approval = emp.remoteWorkApprovals.find(a => a.date === today);
                setRemoteApprover(approval ? (approval.approver === 'hr' ? 'Accepted by HR' : approval.approver === 'admin' ? 'Accepted by Manager' : `Accepted by ${approval.approverName || approval.approver}`) : null);
              } else {
                setRemoteApprover(null);
              }
            } catch (err) {
              setRemoteError('Error checking remote status');
              setIsRemoteToday(false);
              setRemoteRequestPending(false);
              setRemoteApprover(null);
            }
          })();
        }
      }
    };
    socket.on('remoteRequestApproved', handler);
    return () => {
      socket.off('remoteRequestApproved', handler);
    };
  }, [userId, user.role]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header user={user} onLogout={onLogout} />
      <div className="flex">
        <Sidebar 
          userRole={user.role} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
        <main className="flex-1 p-6">
          {/* Render notifications for admin users */}
          {(user.role === 'admin' || user.role === 'superadmin') && notifications.length > 0 && (
            <div className="mb-4">
              <h4 className="font-bold">Employee Session Notifications</h4>
              <ul>
                {notifications.map((n, i) => (
                  <li key={i}>
                    {n.employeeName} started a session at {new Date(n.time).toLocaleTimeString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
function AwardsSection({ user, employees }) {
  const [awards, setAwards] = useState<any[]>([]);
  const [awardName, setAwardName] = useState('Employee of the Month');
  const [awardMonth, setAwardMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [nomineeId, setNomineeId] = useState('');
  const [awardMsg, setAwardMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch awards for the selected month and award name
  const fetchAwards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5050/api/awards?month=${awardMonth}&name=${encodeURIComponent(awardName)}`);
      const data = await res.json();
      setAwards(Array.isArray(data) ? data : []);
    } catch {
      setAwards([]);
    }
    setLoading(false);
  }, [awardMonth, awardName]);

  useEffect(() => {
    fetchAwards();
  }, [fetchAwards]);

  // Nominate employee (admin/superadmin)
  const handleNominate = async (e) => {
    e.preventDefault();
    setAwardMsg('');
    if (!nomineeId) return;
    try {
      const resp = await fetch('http://localhost:5050/api/awards/nominate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: awardName, month: awardMonth, nomineeId })
      });
      const data = await resp.json();
      if (resp.ok) {
        setAwardMsg('Nomination successful!');
        setNomineeId('');
        fetchAwards();
      } else {
        setAwardMsg(data.error || 'Failed to nominate');
      }
    } catch {
      setAwardMsg('Network error.');
    }
  };

  // Vote for nominee (employee)
  const handleVote = async (awardId, nomineeId) => {
    setAwardMsg('');
    try {
      const resp = await fetch('http://localhost:5050/api/awards/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awardId, nomineeId, voterId: user.id })
      });
      const data = await resp.json();
      if (resp.ok) {
        setAwardMsg('Vote recorded!');
        fetchAwards();
      } else {
        setAwardMsg(data.error || 'Failed to vote');
      }
    } catch {
      setAwardMsg('Network error.');
    }
  };

  // Announce winner (admin/superadmin)
  const handleAnnounce = async (awardId, winnerId) => {
    setAwardMsg('');
    try {
      const resp = await fetch('http://localhost:5050/api/awards/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awardId, winnerId })
      });
      const data = await resp.json();
      if (resp.ok) {
        setAwardMsg('Winner announced!');
        fetchAwards();
      } else {
        setAwardMsg(data.error || 'Failed to announce winner');
      }
    } catch {
      setAwardMsg('Network error.');
    }
  };

  // Find current award for UI
  const currentAward = awards.length > 0 ? awards[0] : null;
  const nominees = currentAward?.nominees || [];
  const winner = currentAward?.winner;
  const announced = currentAward?.announced;

  // Find who the current user voted for
  let userVote = '';
  if (currentAward && nominees.length > 0) {
    for (const n of nominees) {
      if (n.votes && n.votes.includes(user.id)) {
        userVote = n.employee?._id || '';
        break;
      }
    }
  }

  // Helper for avatar initials
  const getInitials = (emp) =>
    emp?.firstname && emp?.lastname
      ? `${emp.firstname[0]}${emp.lastname[0]}`
      : emp?.firstname?.slice(0, 2) || 'EM';

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <label className="font-semibold mr-2">Award:</label>
          <select
            value={awardName}
            onChange={e => setAwardName(e.target.value)}
            className="border rounded px-2 py-1 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
          >
            <option value="Employee of the Month">Employee of the Month</option>
            <option value="Best Team Player">Best Team Player</option>
            {/* Add more award types if needed */}
          </select>
        </div>
        <div>
          <label className="font-semibold mr-2">Month:</label>
          <input
            type="month"
            value={awardMonth}
            onChange={e => setAwardMonth(e.target.value)}
            className="border rounded px-2 py-1 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
            max={new Date().toISOString().substring(0, 7)}
          />
        </div>
      </div>
      {awardMsg && (
        <div className={`mb-2 text-sm ${awardMsg.startsWith('Error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {awardMsg}
        </div>
      )}
      {/* Nomination section for admin/superadmin */}
      {(user.role === 'admin' || user.role === 'superadmin') && (
        <form className="mb-6 flex flex-col md:flex-row gap-4 items-end" onSubmit={handleNominate}>
          <div>
            <label className="font-semibold mr-2">Nominate Employee:</label>
            <select
              value={nomineeId}
              onChange={e => setNomineeId(e.target.value)}
              className="border rounded px-2 py-1 bg-background text-foreground dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
            >
              <option value="">Select employee</option>
              {employees
                .filter(emp => emp.role === 'employee' || emp.role === 'intern')
                .map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstname} {emp.lastname} ({emp.department || 'N/A'})
                  </option>
                ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded font-semibold"
            disabled={!nomineeId}
          >
            Nominate
          </button>
        </form>
      )}
      {/* Voting section for all employees */}
      {currentAward && !announced && (
        <div className="mb-6">
          <div className="font-semibold mb-4 text-lg text-foreground flex items-center gap-2">
            <span className="inline-block w-2 h-6 bg-yellow-400 rounded-l" />
            Nominees
          </div>
          <div className="grid grid-cols-1 gap-4">
            {nominees.length === 0 && (
              <div className="py-4 text-muted-foreground text-center bg-muted rounded-lg shadow">No nominees yet.</div>
            )}
            {nominees.map(nom => (
              <div
                key={nom.employee?._id}
                className={`flex items-center justify-between rounded-xl p-4 shadow border
                  ${winner && winner._id === nom.employee?._id
                    ? 'bg-yellow-100 dark:bg-yellow-900 border-yellow-400'
                    : 'bg-card border-muted'}
                `}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-900 flex items-center justify-center text-3xl font-bold text-blue-700 dark:text-blue-200 border border-blue-400 dark:border-blue-700 mb-2">
                    {getInitials(nom.employee)}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-base">
                      {nom.employee?.firstname} {nom.employee?.lastname}
                      <span className="ml-2 text-base text-muted-foreground">
                        ({nom.employee?.department || 'N/A'})
                      </span>
                      {winner && winner._id === nom.employee?._id && (
                        <span className="ml-2 px-2 py-1 rounded bg-yellow-400 text-yellow-900 font-semibold text-xs shadow">
                          Winner
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold text-sm shadow">
                    {nom.votes.length} vote{nom.votes.length !== 1 ? 's' : ''}
                  </span>
                  {/* Voting button for employees (not admin/superadmin) */}
                  {user.role === 'employee' && (
                    <button
                      className={`ml-2 px-4 py-1 rounded font-semibold transition
                        ${userVote === nom.employee?._id
                          ? 'bg-green-600 text-white'
                          : 'bg-muted text-foreground hover:bg-blue-100 dark:hover:bg-blue-900'}
                      `}
                      disabled={userVote === nom.employee?._id}
                      onClick={() => handleVote(currentAward._id, nom.employee?._id)}
                    >
                      {userVote === nom.employee?._id ? 'Voted' : 'Vote'}
                    </button>
                  )}
                  {/* Admin/superadmin can see votes and announce winner */}
                  {(user.role === 'admin' || user.role === 'superadmin') && !announced && (
                    <button
                      className="ml-2 px-4 py-1 rounded bg-yellow-500 text-white font-semibold shadow"
                      onClick={() => handleAnnounce(currentAward._id, nom.employee?._id)}
                    >
                      Announce Winner
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Winner announcement */}
      {currentAward && announced && winner && (
        <div className="mt-8 text-center">
          <div className="inline-block bg-gradient-to-br from-yellow-200 to-yellow-400 dark:from-yellow-900 dark:to-yellow-700 rounded-2xl px-8 py-6 shadow-lg border-2 border-yellow-400 dark:border-yellow-700">
            <div className="text-3xl font-extrabold text-yellow-900 dark:text-yellow-200 mb-2 flex items-center justify-center gap-2">
              🏆 {awardName} Winner ({awardMonth})
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-blue-200 dark:bg-blue-900 flex items-center justify-center text-3xl font-bold text-blue-700 dark:text-blue-200 border-2 border-blue-400 dark:border-blue-700 mb-2">
                {getInitials(winner)}
              </div>
              <div className="text-xl font-semibold text-foreground">
                {winner.firstname} {winner.lastname}
                <span className="ml-2 text-base text-muted-foreground">
                  ({winner.department || 'N/A'})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

