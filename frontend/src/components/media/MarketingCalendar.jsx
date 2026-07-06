import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';

const TYPE_TONE = {
  campaign: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-500/10 dark:text-blue-300',
  launch: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-500/10 dark:text-violet-300',
  task: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300',
  'content-publish': 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300',
  approval: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-500/10 dark:text-cyan-300',
};

const MarketingCalendar = ({ projectId }) => {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    departmentApi.getMediaCalendar(token, projectId ? { projectId } : {})
      .then((res) => setEvents(res?.data?.items || []))
      .catch((err) => setError(err.message || 'Failed to load calendar.'));
  }, [token, projectId]);

  const grouped = events.reduce((acc, event) => {
    const dateKey = new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">{error}</div> : null}
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Every campaign start/end, task deadline, content publish, and approval automatically appears here.
      </p>
      {Object.keys(grouped).length ? (
        <div className="space-y-3">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className={card}>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{date}</p>
              <div className="space-y-1.5">
                {items.map((event, index) => (
                  <div key={`${event.refId}-${index}`} className={`inline-flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm ${TYPE_TONE[event.type] || 'border-slate-200 bg-slate-50 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                    <span className="font-semibold uppercase text-[10px] tracking-wide">{event.type}</span>
                    <span>{event.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={card}><p className="text-sm text-neutral-500 dark:text-neutral-400">No dated campaign, task, content, or approval events yet.</p></div>
      )}
    </div>
  );
};

export default MarketingCalendar;
