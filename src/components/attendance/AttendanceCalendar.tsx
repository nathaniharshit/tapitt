import React from 'react';
import { Card } from '@/components/ui/card';

interface AttendanceCalendarProps {
  user: any;
  refresh?: number;
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
    <div className="bg-card rounded-lg p-4 shadow-md">
      <div className="mb-2 text-center font-semibold text-lg text-foreground">
        {today.toLocaleString('default', { month: 'long' })} {year}
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
          {week.map((d, j) =>
            d ? (
              <div
                key={j}
                className={`rounded p-2 font-bold text-center
                  ${
                    attendance[d] === 'present'
                      ? 'bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-200'
                      : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200'
                  }
                `}
              >
                {d}
              </div>
            ) : (
              <div key={j} className="bg-muted rounded p-2" />
            )
          )}
        </div>
      ))}
      <div className="mt-2 flex space-x-4 text-xs">
        <span className="inline-block w-3 h-3 bg-green-200 dark:bg-green-900 rounded-full mr-1 align-middle border border-green-400 dark:border-green-700" /> 
        <span className="text-muted-foreground">Present</span>
        <span className="inline-block w-3 h-3 bg-red-100 dark:bg-red-900 rounded-full mr-1 align-middle border border-red-400 dark:border-red-700" /> 
        <span className="text-muted-foreground">Absent</span>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
