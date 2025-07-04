import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import SessionHistory from './SessionHistory';

interface AttendanceCalendarProps {
  user: any;
  refresh?: number;
  month?: string; // YYYY-MM, optional
}

// Helper to get days in month
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isWeekend(dateStr: string) {
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ user, month }) => {
  const [attendance, setAttendance] = useState<{ date: string; status: string }[]>([]);
  const [workSessions, setWorkSessions] = useState<{ start: string; end?: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([]);

  useEffect(() => {
    if (!user?.id) {
      console.log('AttendanceCalendar: No user.id available, skipping data fetch');
      return;
    }
    
    console.log('AttendanceCalendar: Fetching data for user:', user.id);
    
    fetch(`http://localhost:5050/api/employees/${user.id}/attendance`)
      .then(res => res.json())
      .then(data => setAttendance(data.attendance || []))
      .catch(err => console.error('AttendanceCalendar: Error fetching attendance:', err));
    
    // Fetch work sessions for the user
    fetch(`http://localhost:5050/api/sessions?employeeId=${user.id}`)
      .then(res => {
        console.log('AttendanceCalendar: Sessions API response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('AttendanceCalendar: Sessions data received:', data);
        setWorkSessions((data.sessions || []).map((s: any) => ({ start: s.startTime, end: s.endTime })));
      })
      .catch(err => console.error('AttendanceCalendar: Error fetching sessions:', err));
    
    // Fetch holidays for the calendar
    fetch('http://localhost:5050/api/holidays')
      .then(res => res.json())
      .then(data => setHolidays(Array.isArray(data.holidays) ? data.holidays : []))
      .catch(err => console.error('AttendanceCalendar: Error fetching holidays:', err));
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

  // Helper to check if a date is a declared holiday
  function getHoliday(dateStr: string) {
    return holidays.find(h => h.date === dateStr);
  }

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

  // Attendance percentage calculation for the month (excluding weekends and declared holidays, till today if current month)
  const monthStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
  const today = new Date();
  // Get all days in the month that are NOT weekends, NOT declared holidays, and (if current month) <= today
  const allDays: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(dateStr);
    const isWeekendDay = isWeekend(dateStr);
    const isDeclaredHoliday = !!getHoliday(dateStr);
    if (!isWeekendDay && !isDeclaredHoliday && (year !== today.getFullYear() || monthIdx !== today.getMonth() || dateObj <= today)) {
      allDays.push(dateStr);
    }
  }
  // Only consider attendance for non-weekend, non-holiday days and till today if current month
  const monthAttendance = attendance.filter(a => {
    const isDeclaredHoliday = !!getHoliday(a.date);
    return a.date.startsWith(monthStr) && !isWeekend(a.date) && !isDeclaredHoliday && (year !== today.getFullYear() || monthIdx !== today.getMonth() || new Date(a.date) <= today);
  });
  const presentDays = monthAttendance.filter(a => a.status === 'present').length;
  const markedDays = monthAttendance.length;
  const totalWorkingDays = allDays.length;
  const attendancePercent = totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0;

  return (
    <>
      <div className="bg-card rounded-lg p-4 shadow-md mb-6">
        <div className="mb-2 text-center font-semibold text-lg text-foreground">
          {new Date(year, monthIdx).toLocaleString('default', { month: 'long' })} {year}
        </div>
        <div className="mb-2 text-center">
          <span className="font-semibold text-blue-700 dark:text-blue-300">
            Attendance: {totalWorkingDays > 0 ? `${attendancePercent}%` : 'N/A'}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            ({presentDays} present / {totalWorkingDays} working days)
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
              const isHoliday = isWeekend(dateStr);
              const holidayObj = getHoliday(dateStr);
              let cellClass = "rounded p-2 font-bold text-center cursor-pointer ";
              let tooltip = "";
              if (holidayObj) {
                // Use blue for declared holidays
                cellClass += "bg-purple-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100 border border-blue-500";
                tooltip = `Declared Holiday: ${holidayObj.name}`;
              } else if (isHoliday) {
                cellClass += "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200";
                tooltip = "Weekend";
              } else if (att?.status === 'present') {
                cellClass += "bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-200";
              } else if (att?.status === 'absent') {
                cellClass += "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200";
              } else {
                cellClass += "bg-muted text-foreground";
              }
              // Highlight selected date
              if (selectedDate === dateStr) {
                cellClass += " ring-2 ring-blue-500";
              }
              return (
                <div
                  key={j}
                  className={cellClass}
                  onClick={() => setSelectedDate(dateStr)}
                  title={tooltip}
                >
                  {d}
                </div>
              );
            })}
          </div>
        ))}
        <div className="mt-2 flex flex-wrap gap-4 text-xs">
          <span className="inline-block w-3 h-3 bg-green-200 dark:bg-green-900 rounded-full mr-1 align-middle border border-green-400 dark:border-green-700" /> 
          <span className="text-muted-foreground">Present</span>
          <span className="inline-block w-3 h-3 bg-red-100 dark:bg-red-900 rounded-full mr-1 align-middle border border-red-400 dark:border-red-700" /> 
          <span className="text-muted-foreground">Absent</span>
          <span className="inline-block w-3 h-3 bg-muted rounded-full mr-1 align-middle border border-gray-300 dark:border-gray-700" /> 
          <span className="text-muted-foreground">Not Marked</span>
          <span className="inline-block w-3 h-3 bg-yellow-100 dark:bg-yellow-900 rounded-full mr-1 align-middle border border-yellow-400 dark:border-yellow-700" /> 
          <span className="text-muted-foreground">Weekend</span>
          <span className="inline-block w-3 h-3 bg-blue-200 dark:bg-blue-800 rounded-full mr-1 align-middle border border-blue-500 dark:border-blue-800" /> 
          <span className="text-muted-foreground">Declared Holiday</span>
        </div>
      </div>
      {/* Session History separate box, filtered by selectedDate */}
      <SessionHistory workSessions={selectedDate ? workSessions.filter(s => {
        if (!s.end) return false;
        const start = new Date(s.start);
        const dateKey = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
        return dateKey === selectedDate;
      }) : []} />
    </>
  );
};

export default AttendanceCalendar;
