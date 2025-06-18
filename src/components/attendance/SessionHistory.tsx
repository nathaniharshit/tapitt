import React from 'react';

interface Session {
  start: string;
  end?: string;
}

interface SessionHistoryProps {
  workSessions: Session[];
}

// Helper to format duration
function formatDuration(ms: number) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const seconds = Math.floor((ms / 1000) % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
}

// Helper to format date
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const SessionHistory: React.FC<SessionHistoryProps> = ({ workSessions }) => {
  if (!workSessions.length) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 mt-4 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold mb-2 text-lg text-gray-900 dark:text-gray-100">Work Sessions</h4>
        <div>No sessions.</div>
      </div>
    );
  }

  // Calculate total duration for all completed sessions
  const totalDuration = workSessions.reduce((sum, s) => {
    if (!s.end) return sum;
    const start = new Date(s.start);
    const end = new Date(s.end);
    return sum + (end.getTime() - start.getTime());
  }, 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 mt-4 border border-gray-200 dark:border-gray-700">
      <h4 className="font-semibold mb-2 text-lg text-gray-900 dark:text-gray-100">Work Sessions</h4>
      <ul className="list-disc ml-6 text-gray-800 dark:text-gray-200">
        {workSessions.map((s, i) => {
          if (!s.end) return null;
          const start = new Date(s.start);
          const end = new Date(s.end);
          return (
            <li key={i}>
              Start: {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — End: {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (<b>Duration:</b> {formatDuration(end.getTime() - start.getTime())})
            </li>
          );
        })}
      </ul>
      {workSessions.filter(s => s.end).length === 0 && <div>No completed sessions.</div>}
      {workSessions.filter(s => s.end).length > 1 && (
        <>
          <hr className="my-3 border-gray-300 dark:border-gray-700" />
          <div className="font-semibold text-gray-900 dark:text-gray-100">Total Duration: {formatDuration(totalDuration)}</div>
        </>
      )}
    </div>
  );
};

export default SessionHistory;
