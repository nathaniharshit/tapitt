import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

interface AttendanceCalendarProps {
  user: any;
  refresh?: number;
  month?: string; // YYYY-MM, optional
}

// Helper to get days in month
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ user, month }) => {
  const [attendance, setAttendance] = useState<{ date: string; status: string }[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`http://localhost:5050/api/employees/${user.id}/attendance`)
      .then(res => res.json())
      .then(data => setAttendance(data.attendance || []));
  }, [user?.id]);

  // Use selected month or current month
  let year: number, monthIdx: number;
  if (month) {
    const [y, m] = month.split('-');
    year = Number(y);
    monthIdx = Number(m) - 1;
  } else {
    const today = new Date();
    year = today.getFullYear();
    monthIdx = today.getMonth();
  }
  const daysInMonth = getDaysInMonth(year, monthIdx);
  const firstDay = new Date(year, monthIdx, 1).getDay();

  // Build calendar grid
  const weeks: Array<Array<number | null>> = [];
  let week: Array<number | null> = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push([...week, ...Array(7 - week.length).fill(null)]);

  // Attendance percentage calculation for the month
  const monthStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
  const monthAttendance = attendance.filter(a => a.date.startsWith(monthStr));
  const presentDays = monthAttendance.filter(a => a.status === 'present').length;
  const markedDays = monthAttendance.length;
  const attendancePercent = markedDays > 0 ? Math.round((presentDays / markedDays) * 100) : 0;

  return (
    <div className="bg-card rounded-lg p-4 shadow-md">
      <div className="mb-2 text-center font-semibold text-lg text-foreground">
        {new Date(year, monthIdx).toLocaleString('default', { month: 'long' })} {year}
      </div>
      <div className="mb-2 text-center">
        <span className="font-semibold text-blue-700 dark:text-blue-300">
          Attendance: {markedDays > 0 ? `${attendancePercent}%` : 'N/A'}
        </span>
        <span className="ml-2 text-xs text-muted-foreground">
          ({presentDays} present / {markedDays} marked)
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold mb-1">
        <div className="text-muted-foreground">Sun</div>
        <div className="text-muted-foreground">Mon</div>
        <div className="text-muted-foreground">Tue</div>
        <div className="text-muted-foreground">Wed</div>
        <div className="text-muted-foreground">Thu</div>
        <div className="text-muted-foreground">Fri</div>
        <div className="text-muted-foreground">Sat</div>
      </div>
      {weeks.map((week, i) => (
        <div className="grid grid-cols-7 gap-1 mb-1" key={i}>
          {week.map((d, j) => {
            if (!d) return <div key={j} className="bg-muted rounded p-2" />;
            const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const att = attendance.find(a => a.date === dateStr);
            let cellClass = "rounded p-2 font-bold text-center ";
            if (att?.status === 'present') {
              cellClass += "bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-200";
            } else if (att?.status === 'absent') {
              cellClass += "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200";
            } else {
              cellClass += "bg-muted text-foreground";
            }
            return (
              <div key={j} className={cellClass}>
                {d}
              </div>
            );
          })}
        </div>
      ))}
      <div className="mt-2 flex space-x-4 text-xs">
        <span className="inline-block w-3 h-3 bg-green-200 dark:bg-green-900 rounded-full mr-1 align-middle border border-green-400 dark:border-green-700" /> 
        <span className="text-muted-foreground">Present</span>
        <span className="inline-block w-3 h-3 bg-red-100 dark:bg-red-900 rounded-full mr-1 align-middle border border-red-400 dark:border-red-700" /> 
        <span className="text-muted-foreground">Absent</span>
        <span className="inline-block w-3 h-3 bg-muted rounded-full mr-1 align-middle border border-gray-300 dark:border-gray-700" /> 
        <span className="text-muted-foreground">Not Marked</span>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
