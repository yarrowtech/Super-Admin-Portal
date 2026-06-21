import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { outsourcingApi } from '../../services/outsourcing';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';

// ─────────────────────────────────────────────────────────────────────────────
// Unchanged named exports that other files import
// ─────────────────────────────────────────────────────────────────────────────
const wrap = 'rounded-xl border border-neutral-200 bg-white p-4 shadow-sm min-h-[170px] dark:border-neutral-800 dark:bg-neutral-900 lg:p-5';

export const FreelancerStatsCards = ({ stats }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <KPICard title="Total Earnings" value={`INR ${stats.totalEarnings}`} icon="payments" colorScheme="green" subtitle="LIFETIME" compact className="min-h-[150px]" />
    <KPICard title="This Week" value={`INR ${stats.weekEarnings}`} icon="calendar_month" colorScheme="blue" subtitle={`${stats.weekHours} HRS`} compact className="min-h-[150px]" />
    <KPICard title="Active Jobs" value={stats.activeTasks} icon="work" colorScheme="purple" subtitle="ASSIGNED" compact className="min-h-[150px]" />
    <KPICard title="Pending Logs" value={stats.pendingLogs} icon="pending_actions" colorScheme="orange" subtitle="REVIEW" compact className="min-h-[150px]" />
  </div>
);
export const EarningsSummary = ({ current, pending }) => (
  <section className={wrap}><h3 className="mb-2 font-semibold text-neutral-900 dark:text-white">Earnings Summary</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Released</span><strong>INR {current}</strong></div><div className="flex justify-between"><span>Pending Approval</span><strong>INR {pending}</strong></div></div></section>
);
export const WeeklyEarningsChart = ({ series }) => {
  const max = Math.max(...series.map((x) => x.value), 1);
  return (
    <section className={`${wrap} min-h-[280px]`}><h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Weekly Earnings</h3><div className="grid grid-cols-7 gap-2">{series.map((d) => (<div key={d.day} className="flex flex-col items-center gap-1"><div className="h-24 w-full rounded bg-neutral-100 p-1 dark:bg-neutral-900"><div className="w-full rounded bg-neutral-900 dark:bg-white" style={{ height: `${Math.max(8, Math.round((d.value / max) * 100))}%`, marginTop: 'auto' }} /></div><span className="text-xs text-neutral-500">{d.day}</span></div>))}</div></section>
  );
};
export const TaskCard = ({ task, onOpen }) => (
  <button onClick={() => onOpen(task)} className="min-h-20 w-full rounded-xl border border-neutral-200 p-3 text-left transition hover:border-primary/50 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-neutral-800 dark:hover:bg-neutral-800"><p className="font-semibold text-neutral-900 dark:text-white">{task.title}</p><p className="text-xs text-neutral-500">Status: {task.status}</p><p className="text-xs text-neutral-500">Deadline: {task?.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}</p></button>
);
export const MyTasksList = ({ tasks, onOpen }) => (
  <section className={`${wrap} min-h-[340px]`}><h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">My Tasks</h3>{tasks.length === 0 ? (<p className="text-sm text-neutral-500">No tasks assigned yet.</p>) : (<div className="space-y-2">{tasks.map((t) => <TaskCard key={t._id} task={t} onOpen={onOpen} />)}</div>)}</section>
);
export const TaskDetailsView = ({ task }) => (
  <section className={`${wrap} min-h-[340px]`}><h3 className="mb-2 font-semibold text-neutral-900 dark:text-white">Task Details</h3>{task ? (<div className="text-sm text-neutral-600 dark:text-neutral-300"><p className="font-semibold text-neutral-900 dark:text-white">{task.title}</p><p className="mt-1">{task.description || 'No description'}</p></div>) : <p className="text-sm text-neutral-500">Select a task to view details.</p>}</section>
);
export const TimeTracker = ({ session, onCheckIn, onPause, onResume, onStop }) => (
  <section className={`${wrap} min-h-[130px]`}><h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Time Tracker</h3><div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center"><span className={`rounded-full px-2 py-1 text-xs ${session?.status === 'active' ? 'bg-emerald-100 text-emerald-800' : session?.status === 'paused' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'}`}>{session?.status === 'active' ? 'Checked In' : session?.status === 'paused' ? 'Paused' : 'Checked Out'}</span><button onClick={onCheckIn} disabled={Boolean(session)} className="min-h-11 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Check In</button><button onClick={onPause} disabled={session?.status !== 'active'} className="min-h-11 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Pause</button><button onClick={onResume} disabled={session?.status !== 'paused'} className="min-h-11 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Resume</button><button onClick={onStop} disabled={!session} className="min-h-11 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Stop</button></div></section>
);
export const WorkLogTable = ({ logs }) => (
  <section className={`${wrap} min-h-[280px]`}><h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Work Logs</h3>{logs.length === 0 ? <p className="text-sm text-neutral-500">No work logs submitted yet.</p> : (<div className="space-y-2">{logs.slice(0, 6).map((r) => (<div key={r._id} className="flex items-center justify-between rounded border border-neutral-200 p-2 text-sm dark:border-neutral-800"><span>{r?.job?.title || 'Job'} • {r.hours}h</span><span>{r.verificationStatus}</span></div>))}</div>)}</section>
);
export const SubmitWorkModal = ({ open, onClose, onSubmit, contracts = [] }) => {
  const [contractId, setContractId] = useState('');
  const [logDate, setLogDate] = useState('');
  const [hours, setHours] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"><div className="max-h-[96dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-neutral-950 sm:rounded-2xl"><h3 className="mb-3 font-semibold">Submit Work</h3><form onSubmit={(e) => { e.preventDefault(); onSubmit({ contractId, logDate, hours: Number(hours) }); onClose(); }} className="space-y-2"><select className="min-h-11 w-full rounded border p-2 dark:border-neutral-700 dark:bg-neutral-900" value={contractId} onChange={(e) => setContractId(e.target.value)} required><option value="">Select active contract</option>{contracts.map((c) => (<option key={c._id} value={c._id}>{`${c?.job?.title || 'Contract'} (${c.paymentType})`}</option>))}</select><input className="min-h-11 w-full rounded border p-2 dark:border-neutral-700 dark:bg-neutral-900" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required /><input className="min-h-11 w-full rounded border p-2 dark:border-neutral-700 dark:bg-neutral-900" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} required /><div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="min-h-11 rounded border px-3 py-1.5 dark:border-neutral-700">Cancel</button><button type="submit" className="min-h-11 rounded bg-neutral-900 px-3 py-1.5 text-white dark:bg-white dark:text-black">Submit</button></div></form></div></div>
  );
};
export const PaymentHistory = ({ payments }) => (
  <section className={`${wrap} min-h-[160px]`}><h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Payment History</h3>{payments.length === 0 ? <p className="text-sm text-neutral-500">No payment records yet.</p> : (<div className="space-y-2 text-sm">{payments.map((p) => <div key={p.id} className="flex justify-between rounded border p-2"><span>{p.label}</span><strong>INR {p.amount}</strong></div>)}</div>)}</section>
);
export const PaymentStatus = ({ paid, pending }) => (
  <section className={`${wrap} min-h-[220px]`}><h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Payment Status</h3><div className="space-y-2 text-sm"><div className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50 p-2 dark:border-emerald-900 dark:bg-emerald-900/20"><span>Paid</span><strong>INR {paid}</strong></div><div className="flex items-center justify-between rounded border border-amber-200 bg-amber-50 p-2 dark:border-amber-900 dark:bg-amber-900/20"><span>Pending</span><strong>INR {pending}</strong></div></div></section>
);
export const InvoiceList = ({ invoices }) => (
  <section className={`${wrap} min-h-[220px]`}><h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Invoice List</h3>{invoices.length === 0 ? <p className="text-sm text-neutral-500">No invoices generated.</p> : (<div className="space-y-2 text-sm">{invoices.map((i) => <div key={i.id} className="rounded border p-2">{i.label}</div>)}</div>)}</section>
);
export const FreelancerProfileCard = ({ user }) => (
  <section className={`${wrap} min-h-[210px]`}><h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Profile Summary</h3><p className="font-semibold">{user?.firstName} {user?.lastName}</p><p className="text-sm text-neutral-500">{user?.email}</p><div className="mt-3 space-y-1 text-sm text-neutral-600 dark:text-neutral-300"><p><span className="font-medium">Skills:</span> {(user?.metadata?.skills || []).join(', ') || 'Not set'}</p><p><span className="font-medium">Hourly Rate:</span> {user?.metadata?.hourlyRate || 0} INR</p><p><span className="font-medium">Availability:</span> {user?.metadata?.availability || 'Available'}</p><p><span className="font-medium">Location:</span> {[user?.metadata?.city, user?.metadata?.country].filter(Boolean).join(', ') || 'Not set'}</p></div></section>
);
export const EditProfileForm = ({ form, setForm, onSave, saving, message }) => (
  <section className={`${wrap} min-h-[210px]`}><h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Edit Profile</h3><form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-2 text-sm"><input className="w-full rounded border p-2" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /><input className="w-full rounded border p-2" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /><input className="w-full rounded border p-2 bg-neutral-100" placeholder="Email / User ID (locked)" value={form.email} readOnly /><input className="w-full rounded border p-2" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><input className="w-full rounded border p-2" placeholder="Professional title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><textarea className="w-full rounded border p-2" placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /><div className="grid grid-cols-2 gap-2"><input className="rounded border p-2" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /><input className="rounded border p-2" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div><div className="grid grid-cols-2 gap-2"><input className="rounded border p-2" placeholder="Timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /><input className="rounded border p-2" placeholder="Hourly rate (INR)" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} /></div><input className="w-full rounded border p-2" placeholder="Availability (e.g. Full-time, Part-time)" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} /><input className="w-full rounded border p-2" placeholder="Skills (comma separated)" value={form.skillsCsv} onChange={(e) => setForm({ ...form, skillsCsv: e.target.value })} /><h4 className="pt-2 font-semibold">Payment / Bank Details</h4><input className="w-full rounded border p-2" placeholder="Account holder name" value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} /><input className="w-full rounded border p-2" placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /><div className="grid grid-cols-2 gap-2"><input className="rounded border p-2" placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} /><input className="rounded border p-2" placeholder="IFSC code" value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value })} /></div><div className="grid grid-cols-2 gap-2"><input className="rounded border p-2" placeholder="Account type" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })} /><input className="rounded border p-2" placeholder="UPI ID" value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} /></div><input className="w-full rounded border p-2" placeholder="PayPal email" value={form.paypalEmail} onChange={(e) => setForm({ ...form, paypalEmail: e.target.value })} />{message ? <p className="text-xs text-emerald-600">{message}</p> : null}<button disabled={saving} className="rounded bg-neutral-900 px-3 py-1.5 text-white disabled:opacity-60 dark:bg-white dark:text-black">{saving ? 'Saving...' : 'Save Profile'}</button></form></section>
);
export const FreelancerNotifications = ({ notifications }) => (
  <section className={`${wrap} min-h-[210px]`}><h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Notifications</h3>{notifications.length === 0 ? <p className="text-sm text-neutral-500">No notifications.</p> : (<div className="space-y-2 text-sm">{notifications.map((n) => <div key={n._id || n.id} className="rounded border p-2">{n.title || n.message || 'Notification'}</div>)}</div>)}</section>
);
export const FreelancerActivityFeed = ({ sessions }) => (
  <section className={`${wrap} min-h-[220px]`}><h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Activity Feed</h3>{sessions.length === 0 ? <p className="text-sm text-neutral-500">No activity yet.</p> : (<div className="space-y-2 text-sm">{sessions.slice(0, 6).map((s) => (<div key={s._id} className="rounded border p-2">{new Date(s.checkInAt).toLocaleString()} {s.checkOutAt ? `-> ${new Date(s.checkOutAt).toLocaleString()}` : '(Active)'}</div>))}</div>)}</section>
);

// ─────────────────────────────────────────────────────────────────────────────
// Notification Panel
// ─────────────────────────────────────────────────────────────────────────────
const relativeTime = (dateStr) => {
  const diff = Date.now() - new Date(dateStr || 0).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const avatarColor = (str = '') => {
  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-pink-500'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xfffffff;
  return colors[h % colors.length];
};

const NotificationPanel = ({ notifications = [] }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const [tab, setTab] = useState('inbox');
  const ref = useRef(null);

  useEffect(() => { setItems(notifications); }, [notifications]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const unread = items.filter((n) => !n.read).length;

  const displayed = tab === 'inbox'
    ? items.filter((n) => ['Project assignment', 'Contract', 'Approval'].includes(n.type))
    : items.filter((n) => !['Project assignment', 'Contract', 'Approval'].includes(n.type));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-neutral-900">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950 sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                Mark all as read
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-neutral-100 dark:border-neutral-800">
            {['inbox', 'general'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-semibold capitalize transition ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
              >
                {t}
                {t === 'inbox' && unread > 0 && (
                  <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {unread}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {displayed.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-400">No notifications</div>
            ) : (
              displayed.map((n) => (
                <div
                  key={n._id}
                  className={`flex gap-3 border-b border-neutral-50 px-4 py-3 last:border-0 dark:border-neutral-900 ${!n.read ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(n.from || 'A')}`}>
                    {(n.from || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs leading-snug ${!n.read ? 'font-semibold text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                      {n.title || 'Notification'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-400">
                      {relativeTime(n.createdAt)} · {n.type || 'General'}
                    </p>
                    {n.hasActions && (
                      <div className="mt-1.5 flex gap-2">
                        <button className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">Accept</button>
                        <button className="rounded border border-neutral-300 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">Decline</button>
                      </div>
                    )}
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
            <button className="w-full text-center text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Task Progress Line Graph
// ─────────────────────────────────────────────────────────────────────────────
const TaskProgressGraph = ({ jobs = [], logs = [] }) => {
  const [filter, setFilter] = useState('daily');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const series = useMemo(() => {
    const now = new Date();

    if (filter === 'daily') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().slice(0, 10);
        const hours = logs
          .filter((l) => (l.logDate || '').slice(0, 10) === key)
          .reduce((s, l) => s + Number(l.hours || 0), 0);
        const completed = jobs.filter((j) => j.status === 'completed' && (j.updatedAt || '').slice(0, 10) === key).length;
        return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), hours: Number(hours.toFixed(1)), tasks: completed };
      });
    }

    if (filter === 'monthly') {
      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const prefix = `${yyyy}-${mm}`;
        const hours = logs
          .filter((l) => (l.logDate || '').startsWith(prefix))
          .reduce((s, l) => s + Number(l.hours || 0), 0);
        const completed = jobs.filter((j) => j.status === 'completed' && (j.updatedAt || '').startsWith(prefix)).length;
        return { label: d.toLocaleDateString('en-US', { month: 'short' }), hours: Number(hours.toFixed(1)), tasks: completed };
      });
    }

    // custom
    const from = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = customTo ? new Date(customTo) : now;
    const diffDays = Math.max(1, Math.ceil((to - from) / 86400000));
    const step = diffDays <= 14 ? 1 : Math.ceil(diffDays / 10);
    const pts = [];
    for (let i = 0; i <= diffDays; i += step) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const hours = logs
        .filter((l) => (l.logDate || '').slice(0, 10) === key)
        .reduce((s, l) => s + Number(l.hours || 0), 0);
      const completed = jobs.filter((j) => j.status === 'completed' && (j.updatedAt || '').slice(0, 10) === key).length;
      pts.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), hours: Number(hours.toFixed(1)), tasks: completed });
    }
    return pts;
  }, [filter, logs, jobs, customFrom, customTo]);

  const maxHours = Math.max(...series.map((s) => s.hours), 1);
  const W = 600;
  const H = 220;
  const pad = { t: 20, r: 20, b: 42, l: 44 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  const pts = series.map((s, i) => {
    const x = pad.l + (series.length === 1 ? cW / 2 : (i / (series.length - 1)) * cW);
    const y = pad.t + cH - (s.hours / maxHours) * cH;
    return { x, y, ...s };
  });

  const smoothPath = (points) => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const cpx = ((p0.x + p1.x) / 2).toFixed(1);
      d += ` C ${cpx},${p0.y.toFixed(1)} ${cpx},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }
    return d;
  };

  const linePath = smoothPath(pts);
  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x} ${H - pad.b} L ${pts[0].x} ${H - pad.b} Z`
    : '';

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Task Progress</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Hours logged on your assigned projects</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-neutral-200 p-0.5 dark:border-neutral-700">
          {['daily', 'monthly', 'custom'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition ${filter === f ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filter === 'custom' && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-white" />
          <span className="text-xs text-neutral-400">to</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-white" />
        </div>
      )}

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 300, maxHeight: 240 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = pad.t + cH * (1 - t);
            return (
              <g key={t}>
                <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" strokeDasharray={t > 0 ? '4 4' : '0'} />
                <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.45">
                  {Math.round(maxHours * t)}h
                </text>
              </g>
            );
          })}
          {/* Area fill */}
          {pts.length > 1 && <path d={areaPath} fill="url(#areaGrad)" />}
          {/* Smooth bezier line */}
          {pts.length > 1 && <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          {/* Dots + labels */}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="#6366f1" stroke="white" strokeWidth="2.5" />
              <text x={p.x} y={H - 10} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.5">{p.label}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Summary row */}
      <div className="mt-3 grid grid-cols-3 divide-x divide-neutral-100 dark:divide-neutral-800">
        <div className="px-3 text-center first:pl-0 last:pr-0">
          <p className="text-lg font-bold text-neutral-900 dark:text-white">{series.reduce((s, p) => s + p.hours, 0).toFixed(1)}h</p>
          <p className="text-[11px] text-neutral-400">Total Hours</p>
        </div>
        <div className="px-3 text-center">
          <p className="text-lg font-bold text-neutral-900 dark:text-white">{series.reduce((s, p) => s + p.tasks, 0)}</p>
          <p className="text-[11px] text-neutral-400">Tasks Done</p>
        </div>
        <div className="px-3 text-center">
          <p className="text-lg font-bold text-neutral-900 dark:text-white">{series.length > 0 ? (series.reduce((s, p) => s + p.hours, 0) / series.length).toFixed(1) : '0'}h</p>
          <p className="text-[11px] text-neutral-400">Avg / Period</p>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Mini Donut Chart
// ─────────────────────────────────────────────────────────────────────────────
const MiniDonut = ({ pct = 0, color = '#6366f1', size = 64 }) => {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(pct, 1)) * circ;
  const label = `${Math.round(pct * 100)}%`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="8" opacity="0.1" />
      {pct > 0 && (
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
        {label}
      </text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Stat Box
// ─────────────────────────────────────────────────────────────────────────────
const StatBox = ({ label, value, display, icon, accent = '#6366f1', pct = 0, loading }) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
    <div className="mb-3 flex items-center gap-2">
      <span className="material-symbols-outlined text-[18px]" style={{ color: accent }}>{icon}</span>
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</p>
    </div>
    <div className="flex items-end justify-between gap-2">
      <div>
        {loading ? (
          <div className="h-9 w-20 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        ) : (
          <p className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
            {display ?? String(value < 10 ? `0${value}` : value)}
          </p>
        )}
      </div>
      {!loading && <MiniDonut pct={pct} color={accent} />}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Default export — simplified dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function FreelancerDashboard({ token, user }) {
  const [jobs, setJobs] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [rawNotifs, setRawNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [j, c, l, n] = await Promise.allSettled([
        outsourcingApi.getJobs(token),
        outsourcingApi.getContracts(token),
        outsourcingApi.getTimeLogs(token),
        outsourcingApi.getNotifications(token)
      ]);
      setJobs(j.status === 'fulfilled' ? (j.value?.data || []) : []);
      setContracts(c.status === 'fulfilled' ? (c.value?.data || []) : []);
      setLogs(l.status === 'fulfilled' ? (l.value?.data || []) : []);
      setRawNotifs(n.status === 'fulfilled' ? (n.value?.data || []) : []);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Filter to this user's assigned jobs only
  const myJobs = useMemo(
    () => jobs.filter((j) => !j.assignedFreelancer || String(j.assignedFreelancer?._id || j.assignedFreelancer) === String(user?._id)),
    [jobs, user]
  );

  // 4 stat values
  const inProgress = useMemo(() => myJobs.filter((j) => j.status === 'in_progress').length, [myJobs]);
  const upcoming = useMemo(() => myJobs.filter((j) => j.status === 'pending' || j.status === 'accepted').length, [myJobs]);
  const completedProjects = useMemo(() => myJobs.filter((j) => j.status === 'completed').length, [myJobs]);
  const totalProjects = myJobs.length;

  const calcRevenue = useCallback((filterFn) => {
    const byContract = new Map(contracts.map((c) => [String(c._id), c]));
    return logs.filter(filterFn).reduce((sum, l) => {
      const c = byContract.get(String(l?.contract?._id || l?.contract));
      if (!c) return sum;
      const rate = Number(c.rate || 0);
      if (c.paymentType === 'hourly') return sum + Number(l.hours || 0) * rate;
      if (c.paymentType === 'daily') return sum + (Number(l.hours || 0) / 8) * rate;
      if (c.paymentType === 'weekly') return sum + (Number(l.hours || 0) / 40) * rate;
      return sum + rate;
    }, 0);
  }, [logs, contracts]);

  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const yyyyMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return calcRevenue((l) => l.verificationStatus === 'approved' && (l.logDate || '').startsWith(yyyyMM));
  }, [calcRevenue]);

  const totalRevenue = useMemo(() => calcRevenue((l) => l.verificationStatus === 'approved'), [calcRevenue]);

  // Synthetic notifications when API returns empty
  const notifications = useMemo(() => {
    if (rawNotifs.length > 0) return rawNotifs;
    const synth = [];
    myJobs.filter((j) => j.status === 'accepted').slice(-3).forEach((j) =>
      synth.push({ _id: `sn-j-${j._id}`, from: 'Admin', title: `New project assigned: ${j.title}`, type: 'Project assignment', createdAt: j.updatedAt || j.createdAt, read: false })
    );
    logs.filter((l) => l.verificationStatus === 'approved').slice(-3).forEach((l) =>
      synth.push({ _id: `sn-l-${l._id}`, from: 'Admin', title: `Time log approved: ${l.job?.title || 'project'}`, type: 'Approval', createdAt: l.updatedAt, read: true })
    );
    contracts.filter((c) => c.status === 'active').slice(-2).forEach((c) =>
      synth.push({ _id: `sn-c-${c._id}`, from: 'Admin', title: `Contract activated: ${c.job?.title || 'project'}`, type: 'Contract', createdAt: c.updatedAt, read: false })
    );
    return synth.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [rawNotifs, myJobs, logs, contracts]);

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Freelancer Dashboard"
          subtitle=""
          user={user}
          icon="work"
          showSearch={false}
          showThemeToggle
        >
          <NotificationPanel notifications={notifications} />
        </PortalHeader>

        {error && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <button onClick={load} className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40">Retry</button>
            </div>
          </div>
        )}

        {/* 4 Stat Boxes */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatBox
            label="In Progress"
            value={inProgress}
            icon="pending"
            accent="#3b82f6"
            pct={totalProjects > 0 ? inProgress / totalProjects : 0}
            loading={loading}
          />
          <StatBox
            label="Upcoming"
            value={upcoming}
            icon="upcoming"
            accent="#f59e0b"
            pct={totalProjects > 0 ? upcoming / totalProjects : 0}
            loading={loading}
          />
          <StatBox
            label="Total Projects"
            value={totalProjects}
            icon="folder_open"
            accent="#8b5cf6"
            pct={totalProjects > 0 ? completedProjects / totalProjects : 0}
            loading={loading}
          />
          <StatBox
            label="Monthly Revenue"
            value={monthlyRevenue}
            display={`₹${monthlyRevenue.toLocaleString('en-IN')}`}
            icon="currency_rupee"
            accent="#10b981"
            pct={totalRevenue > 0 ? Math.min(monthlyRevenue / totalRevenue, 1) : 0}
            loading={loading}
          />
        </div>

        {/* Task Progress Line Graph */}
        <div className="mt-4">
          <TaskProgressGraph jobs={myJobs} logs={logs} />
        </div>
      </div>
    </main>
  );
}
