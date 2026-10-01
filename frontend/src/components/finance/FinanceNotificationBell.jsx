import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/client';

const AGE = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// Only finance activity belongs in this bell; the same inbox carries other portals' items.
const FINANCE_TYPE = /^finance_/;

const ICON = {
  finance_review_submitted: 'rate_review',
  finance_review_approved: 'task_alt',
  finance_review_returned: 'undo',
  finance_budget_alert: 'warning',
};

// Closes the manager/employee loop in the UI: the head sees what is waiting on them, and
// the employee sees what came back. Polls, because the finance portal has no socket feed.
export default function FinanceNotificationBell({ token }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ items: [], unread: 0, error: '' });
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    let alive = true;
    apiClient.get('/api/notifications?limit=25', token, { forceRefresh: true }).then(
      (res) => {
        if (!alive) return;
        const items = (res?.data || []).filter((n) => FINANCE_TYPE.test(n.type || ''));
        setState({ items, unread: items.filter((n) => !n.read).length, error: '' });
      },
      (err) => { if (alive) setState((s) => ({ ...s, error: err.message || 'Could not load notifications' })); },
    );
    return () => { alive = false; };
  }, [token, tick]);

  // Refresh on a slow interval and whenever the tab regains focus, so a decision made
  // elsewhere shows up without a manual reload.
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    const onFocus = () => setTick((t) => t + 1);
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, []);

  useEffect(() => {
    const onDocClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const openItem = useCallback(async (item) => {
    setOpen(false);
    if (!item.read) {
      // Optimistic: mark it read locally, then persist. A failed write just reappears
      // on the next poll rather than blocking navigation.
      setState((s) => ({ ...s, items: s.items.map((n) => (n._id === item._id ? { ...n, read: true } : n)), unread: Math.max(0, s.unread - 1) }));
      apiClient.put(`/api/notifications/${item._id}/read`, {}, token).catch(() => setTick((t) => t + 1));
    }
    if (item.metadata?.path) navigate(item.metadata.path);
  }, [navigate, token]);

  const markAll = async () => {
    setState((s) => ({ ...s, items: s.items.map((n) => ({ ...n, read: true })), unread: 0 }));
    try { await apiClient.put('/api/notifications/mark-all-read', {}, token); } catch { setTick((t) => t + 1); }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={state.unread ? `Notifications, ${state.unread} unread` : 'Notifications'}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900"
      >
        <span className="material-symbols-outlined text-[19px]">notifications</span>
        {state.unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {state.unread > 9 ? '9+' : state.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 max-h-[26rem] w-[21rem] overflow-auto rounded-xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Finance activity</p>
            {state.unread > 0 && (
              <button type="button" onClick={markAll} className="text-xs font-semibold text-primary hover:underline">Mark all read</button>
            )}
          </div>
          {state.error && <p role="alert" className="px-2 py-3 text-sm text-rose-600 dark:text-rose-300">{state.error}</p>}
          {!state.error && state.items.length === 0 && (
            <p className="px-2 py-3 text-sm text-neutral-500">Nothing yet. Approvals and decisions will show up here.</p>
          )}
          <ul>
            {state.items.map((item) => (
              <li key={item._id}>
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className={`flex w-full gap-2 rounded-lg px-2 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 ${item.read ? '' : 'bg-primary/5'}`}
                >
                  <span className={`material-symbols-outlined mt-0.5 text-[17px] ${item.type === 'finance_budget_alert' ? 'text-amber-500' : item.type === 'finance_review_returned' ? 'text-rose-500' : 'text-primary'}`}>
                    {ICON[item.type] || 'notifications'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-neutral-900 dark:text-white">{item.title}</span>
                    <span className="block text-xs text-neutral-500">{item.message}</span>
                    <span className="mt-0.5 block text-[11px] text-neutral-400">{AGE(item.createdAt)}</span>
                  </span>
                  {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
