import React from 'react';
import { Card } from '@/components/ui/card';

interface AttendanceCalendarProps {
  user: { id: string; name: string; email: string; role: string };
}

// Helper to get days in current month
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ user }) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();

  // Demo: Mark today as present, rest as absent
  const attendance: Record<number, 'present' | 'absent'> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    attendance[d] = d === today.getDate() ? 'present' : 'absent';
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

  return (
    <div>
      <div className="mb-2 text-center font-semibold text-lg">
        {today.toLocaleString('default', { month: 'long' })} {year}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold mb-1">
        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
      </div>
      {weeks.map((week, i) => (
        <div className="grid grid-cols-7 gap-1 mb-1" key={i}>
          {week.map((d, j) => d ? (
            <div
              key={j}
              className={`rounded p-2 ${attendance[d] === 'present' ? 'bg-green-200 text-green-900 font-bold' : 'bg-red-100 text-gray-400'}`}
            >
              {d}
            </div>
          ) : <div key={j} />)}
        </div>
      ))}
      <div className="mt-2 flex space-x-4 text-xs">
        <span className="inline-block w-3 h-3 bg-green-200 rounded-full mr-1 align-middle" /> Present
        <span className="inline-block w-3 h-3 bg-red-100 rounded-full mr-1 align-middle" /> Absent
      </div>
    </div>
  );
};

export default AttendanceCalendar;
