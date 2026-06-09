import React, { useEffect, useMemo, useState } from 'react';
import { outsourcingApi } from '../../services/outsourcing';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import Button from '../common/Button';

const wrap = 'rounded-xl border border-neutral-200 bg-white p-4 shadow-sm min-h-[170px] dark:border-neutral-800 dark:bg-neutral-900 lg:p-5';

const normalizeOutsourcingType = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const isFreelancerWorker = (user) => {
  const type = normalizeOutsourcingType(user?.metadata?.outsourcingType);
  const department = String(user?.department || '')
    .trim()
    .toLowerCase()
    .replace(/[\s&-]+/g, '_');
  return (
    user?.role === 'freelancer' ||
    department === 'outsourcing' ||
    department === 'outsource' ||
    department === 'external_workforce' ||
    type === 'third_party_worker' ||
    type === '3rd_party_worker' ||
    type === 'thirdpartyworker' ||
    type === 'freelancer' ||
    type === 'freelaner'
  );
};

export const FreelancerStatsCards = ({ stats }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <KPICard title="Total Earnings" value={`INR ${stats.totalEarnings}`} icon="payments" colorScheme="green" subtitle="LIFETIME" compact className="min-h-[150px]" />
    <KPICard title="This Week" value={`INR ${stats.weekEarnings}`} icon="calendar_month" colorScheme="blue" subtitle={`${stats.weekHours} HRS`} compact className="min-h-[150px]" />
    <KPICard title="Active Jobs" value={stats.activeTasks} icon="work" colorScheme="purple" subtitle="ASSIGNED" compact className="min-h-[150px]" />
    <KPICard title="Pending Logs" value={stats.pendingLogs} icon="pending_actions" colorScheme="orange" subtitle="REVIEW" compact className="min-h-[150px]" />
  </div>
);

const Card = ({ label, value, icon }) => (
  <section className={wrap}>
    <div className="flex items-center justify-between">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <span className="material-symbols-outlined rounded-lg bg-neutral-100 p-1.5 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{icon}</span>
    </div>
    <p className="mt-2 text-2xl font-bold leading-tight break-words text-neutral-900 dark:text-white">{value}</p>
  </section>
);

export const EarningsSummary = ({ current, pending }) => (
  <section className={wrap}>
    <h3 className="mb-2 font-semibold text-neutral-900 dark:text-white">Earnings Summary</h3>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between"><span>Released</span><strong>INR {current}</strong></div>
      <div className="flex justify-between"><span>Pending Approval</span><strong>INR {pending}</strong></div>
    </div>
  </section>
);

export const WeeklyEarningsChart = ({ series }) => {
  const max = Math.max(...series.map((x) => x.value), 1);
  return (
    <section className={`${wrap} min-h-[280px]`}>
      <h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Weekly Earnings</h3>
      <div className="grid grid-cols-7 gap-2">
        {series.map((d) => (
          <div key={d.day} className="flex flex-col items-center gap-1">
            <div className="h-24 w-full rounded bg-neutral-100 p-1 dark:bg-neutral-900">
              <div className="w-full rounded bg-neutral-900 dark:bg-white" style={{ height: `${Math.max(8, Math.round((d.value / max) * 100))}%`, marginTop: 'auto' }} />
            </div>
            <span className="text-xs text-neutral-500">{d.day}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export const TaskCard = ({ task, onOpen }) => (
  <button onClick={() => onOpen(task)} className="min-h-20 w-full rounded-xl border border-neutral-200 p-3 text-left transition hover:border-primary/50 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-neutral-800 dark:hover:bg-neutral-800">
    <p className="font-semibold text-neutral-900 dark:text-white">{task.title}</p>
    <p className="text-xs text-neutral-500">Status: {task.status}</p>
    <p className="text-xs text-neutral-500">Deadline: {task?.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}</p>
  </button>
);

export const MyTasksList = ({ tasks, onOpen }) => (
  <section className={`${wrap} min-h-[340px]`}>
    <h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">My Tasks</h3>
    {tasks.length === 0 ? (
      <p className="text-sm text-neutral-500">No tasks assigned yet.</p>
    ) : (
      <div className="space-y-2">{tasks.map((t) => <TaskCard key={t._id} task={t} onOpen={onOpen} />)}</div>
    )}
  </section>
);

export const TaskDetailsView = ({ task }) => (
  <section className={`${wrap} min-h-[340px]`}>
    <h3 className="mb-2 font-semibold text-neutral-900 dark:text-white">Task Details</h3>
    {task ? (
      <div className="text-sm text-neutral-600 dark:text-neutral-300">
        <p className="font-semibold text-neutral-900 dark:text-white">{task.title}</p>
        <p className="mt-1">{task.description || 'No description'}</p>
      </div>
    ) : <p className="text-sm text-neutral-500">Select a task to view details.</p>}
  </section>
);

export const TimeTracker = ({ session, onCheckIn, onPause, onResume, onStop }) => (
  <section className={`${wrap} min-h-[130px]`}>
    <h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Time Tracker</h3>
    <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center">
      <span className={`rounded-full px-2 py-1 text-xs ${session?.status === 'active' ? 'bg-emerald-100 text-emerald-800' : session?.status === 'paused' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'}`}>
        {session?.status === 'active' ? 'Checked In' : session?.status === 'paused' ? 'Paused' : 'Checked Out'}
      </span>
      <button onClick={onCheckIn} disabled={Boolean(session)} className="min-h-11 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Check In</button>
      <button onClick={onPause} disabled={session?.status !== 'active'} className="min-h-11 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Pause</button>
      <button onClick={onResume} disabled={session?.status !== 'paused'} className="min-h-11 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Resume</button>
      <button onClick={onStop} disabled={!session} className="min-h-11 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Stop</button>
    </div>
  </section>
);

const WorkflowGuide = ({ workflow, onAction }) => {
  const labels = {
    accept_job: 'Accept an assigned job',
    legal_agreement: 'Complete legal agreement setup',
    work_execution: 'Work can begin after legal approval',
    check_in: 'Check in to start work session',
    pause_work: 'Pause the current work session',
    resume_work: 'Resume the paused work session',
    stop_work: 'Stop the current work session',
    await_verification: 'Await admin verification of submitted log',
    generate_invoice: 'Generate invoice for approved logs'
  };
  const actionLabel = {
    accept_job: 'Go to Jobs',
    legal_agreement: 'View Contracts',
    work_execution: 'View Contracts',
    check_in: 'Check In Now',
    pause_work: 'Pause Now',
    resume_work: 'Resume Now',
    stop_work: 'Stop Now',
    await_verification: 'View Time Logs',
    generate_invoice: 'Go to Invoices'
  };
  if (!workflow) return null;
  const currentStep = workflow.currentStep || 'accept_job';
  return (
    <section className={`${wrap} min-h-[130px]`}>
      <h3 className="mb-2 font-semibold text-neutral-900 dark:text-white">Workflow Status</h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{labels[currentStep] || labels.accept_job}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          Step: {currentStep}
        </span>
        <button onClick={() => onAction(currentStep)} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-black">
          {actionLabel[currentStep] || 'Continue'}
        </button>
      </div>
    </section>
  );
};

export const WorkLogTable = ({ logs }) => (
  <section className={`${wrap} min-h-[280px]`}>
    <h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Work Logs</h3>
    {logs.length === 0 ? <p className="text-sm text-neutral-500">No work logs submitted yet.</p> : (
      <div className="space-y-2">
        {logs.slice(0, 6).map((r) => (
          <div key={r._id} className="flex items-center justify-between rounded border border-neutral-200 p-2 text-sm dark:border-neutral-800">
            <span>{r?.job?.title || 'Job'} • {r.hours}h</span>
            <span>{r.verificationStatus}</span>
          </div>
        ))}
      </div>
    )}
  </section>
);

export const SubmitWorkModal = ({ open, onClose, onSubmit, contracts = [] }) => {
  const [contractId, setContractId] = useState('');
  const [logDate, setLogDate] = useState('');
  const [hours, setHours] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[96dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-neutral-950 sm:rounded-2xl">
        <h3 className="mb-3 font-semibold">Submit Work</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ contractId, logDate, hours: Number(hours) }); onClose(); }} className="space-y-2">
          <select className="min-h-11 w-full rounded border p-2 dark:border-neutral-700 dark:bg-neutral-900" value={contractId} onChange={(e) => setContractId(e.target.value)} required>
            <option value="">Select active contract</option>
            {contracts.map((c) => (
              <option key={c._id} value={c._id}>{`${c?.job?.title || 'Contract'} (${c.paymentType})`}</option>
            ))}
          </select>
          <input className="min-h-11 w-full rounded border p-2 dark:border-neutral-700 dark:bg-neutral-900" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required />
          <input className="min-h-11 w-full rounded border p-2 dark:border-neutral-700 dark:bg-neutral-900" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} required />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="min-h-11 rounded border px-3 py-1.5 dark:border-neutral-700">Cancel</button>
            <button type="submit" className="min-h-11 rounded bg-neutral-900 px-3 py-1.5 text-white dark:bg-white dark:text-black">Submit</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const PaymentHistory = ({ payments }) => (
  <section className={`${wrap} min-h-[160px]`}>
    <h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Payment History</h3>
    {payments.length === 0 ? <p className="text-sm text-neutral-500">No payment records yet.</p> : (
      <div className="space-y-2 text-sm">{payments.map((p) => <div key={p.id} className="flex justify-between rounded border p-2"><span>{p.label}</span><strong>INR {p.amount}</strong></div>)}</div>
    )}
  </section>
);

export const PaymentStatus = ({ paid, pending }) => (
  <section className={`${wrap} min-h-[220px]`}>
    <h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Payment Status</h3>
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50 p-2 dark:border-emerald-900 dark:bg-emerald-900/20">
        <span>Paid</span>
        <strong>INR {paid}</strong>
      </div>
      <div className="flex items-center justify-between rounded border border-amber-200 bg-amber-50 p-2 dark:border-amber-900 dark:bg-amber-900/20">
        <span>Pending</span>
        <strong>INR {pending}</strong>
      </div>
    </div>
  </section>
);

export const InvoiceList = ({ invoices }) => (
  <section className={`${wrap} min-h-[220px]`}>
    <h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Invoice List</h3>
    {invoices.length === 0 ? <p className="text-sm text-neutral-500">No invoices generated.</p> : (
      <div className="space-y-2 text-sm">{invoices.map((i) => <div key={i.id} className="rounded border p-2">{i.label}</div>)}</div>
    )}
  </section>
);

export const FreelancerProfileCard = ({ user }) => (
  <section className={`${wrap} min-h-[210px]`}>
    <h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Profile Summary</h3>
    <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
    <p className="text-sm text-neutral-500">{user?.email}</p>
    <div className="mt-3 space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
      <p><span className="font-medium">Skills:</span> {(user?.metadata?.skills || []).join(', ') || 'Not set'}</p>
      <p><span className="font-medium">Hourly Rate:</span> {user?.metadata?.hourlyRate || 0} INR</p>
      <p><span className="font-medium">Availability:</span> {user?.metadata?.availability || 'Available'}</p>
      <p><span className="font-medium">Location:</span> {[user?.metadata?.city, user?.metadata?.country].filter(Boolean).join(', ') || 'Not set'}</p>
    </div>
  </section>
);

export const EditProfileForm = ({ form, setForm, onSave, saving, message }) => (
  <section className={`${wrap} min-h-[210px]`}>
    <h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Edit Profile</h3>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="space-y-2 text-sm"
    >
      <input className="w-full rounded border p-2" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
      <input className="w-full rounded border p-2" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
      <input className="w-full rounded border p-2 bg-neutral-100" placeholder="Email / User ID (locked)" value={form.email} readOnly />
      <input className="w-full rounded border p-2" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <input className="w-full rounded border p-2" placeholder="Professional title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea className="w-full rounded border p-2" placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input className="rounded border p-2" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="Timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
        <input className="rounded border p-2" placeholder="Hourly rate (INR)" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
      </div>
      <input className="w-full rounded border p-2" placeholder="Availability (e.g. Full-time, Part-time)" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
      <input className="w-full rounded border p-2" placeholder="Skills (comma separated)" value={form.skillsCsv} onChange={(e) => setForm({ ...form, skillsCsv: e.target.value })} />

      <h4 className="pt-2 font-semibold">Payment / Bank Details</h4>
      <input className="w-full rounded border p-2" placeholder="Account holder name" value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} />
      <input className="w-full rounded border p-2" placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
        <input className="rounded border p-2" placeholder="IFSC code" value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="Account type" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })} />
        <input className="rounded border p-2" placeholder="UPI ID" value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} />
      </div>
      <input className="w-full rounded border p-2" placeholder="PayPal email" value={form.paypalEmail} onChange={(e) => setForm({ ...form, paypalEmail: e.target.value })} />
      {message ? <p className="text-xs text-emerald-600">{message}</p> : null}
      <button disabled={saving} className="rounded bg-neutral-900 px-3 py-1.5 text-white disabled:opacity-60 dark:bg-white dark:text-black">
        {saving ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  </section>
);

export const FreelancerNotifications = ({ notifications }) => (
  <section className={`${wrap} min-h-[210px]`}>
    <h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Notifications</h3>
    {notifications.length === 0 ? <p className="text-sm text-neutral-500">No notifications.</p> : (
      <div className="space-y-2 text-sm">{notifications.map((n) => <div key={n._id || n.id} className="rounded border p-2">{n.title || n.message || 'Notification'}</div>)}</div>
    )}
  </section>
);

export const FreelancerActivityFeed = ({ sessions }) => (
  <section className={`${wrap} min-h-[220px]`}>
    <h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Activity Feed</h3>
    {sessions.length === 0 ? <p className="text-sm text-neutral-500">No activity yet.</p> : (
      <div className="space-y-2 text-sm">
        {sessions.slice(0, 6).map((s) => (
          <div key={s._id} className="rounded border p-2">
            {new Date(s.checkInAt).toLocaleString()} {s.checkOutAt ? `-> ${new Date(s.checkOutAt).toLocaleString()}` : '(Active)'}
          </div>
        ))}
      </div>
    )}
  </section>
);

const buildWeekSeries = (logs) => {
  const map = new Map(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => [d, 0]));
  logs.forEach((l) => {
    const day = new Date(l.logDate).toLocaleDateString('en-US', { weekday: 'short' });
    if (map.has(day)) map.set(day, map.get(day) + Number(l.hours || 0));
  });
  return Array.from(map.entries()).map(([day, value]) => ({ day, value }));
};

export default function FreelancerDashboard({ token, user }) {
  const [jobs, setJobs] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sessions, setSessions] = useState({ isCheckedIn: false, activeSession: null, sessions: [] });
  const [workspace, setWorkspace] = useState(null);
  const [openSubmit, setOpenSubmit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workflow, setWorkflow] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [j, c, l, s, w] = await Promise.allSettled([
        outsourcingApi.getJobs(token),
        outsourcingApi.getContracts(token),
        outsourcingApi.getTimeLogs(token),
        outsourcingApi.getMySessions(token),
        outsourcingApi.getMyWorkflow(token)
      ]);
      const workspaceResult = await Promise.allSettled([
        outsourcingApi.getMyWorkspace(token)
      ]);

      const jobsData = j.status === 'fulfilled' ? j.value?.data || [] : [];
      const contractsData = c.status === 'fulfilled' ? c.value?.data || [] : [];
      const logsData = l.status === 'fulfilled' ? l.value?.data || [] : [];
      const sessionsData = s.status === 'fulfilled' ? s.value?.data || { isCheckedIn: false, activeSession: null, sessions: [] } : { isCheckedIn: false, activeSession: null, sessions: [] };
      const workflowData = w.status === 'fulfilled' ? w.value?.data || null : null;
      const workspaceData = workspaceResult[0]?.status === 'fulfilled' ? workspaceResult[0].value?.data || null : null;

      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setContracts(Array.isArray(contractsData) ? contractsData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
      setSessions(sessionsData);
      setWorkflow(workflowData);
      setWorkspace(workspaceData);

      const failures = [j, c, l, s, w].filter((result) => result.status === 'rejected');
      if (failures.length === [j, c, l, s, w].length) {
        throw new Error('Failed to load freelancer dashboard data.');
      }
      if (failures.length > 0) {
        setError('Some dashboard data could not be loaded. Showing available information.');
      }
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const activeContracts = useMemo(() => contracts.filter((c) => c.status === 'active'), [contracts]);
  const handleWorkflowAction = async (step) => {
    if (step === 'check_in') {
      await outsourcingApi.checkIn(token, {});
      await load();
      return;
    }
    if (step === 'pause_work') {
      await outsourcingApi.pauseSession(token, {});
      await load();
      return;
    }
    if (step === 'resume_work') {
      await outsourcingApi.resumeSession(token, {});
      await load();
      return;
    }
    if (step === 'stop_work') {
      await outsourcingApi.stopSession(token, {});
      await load();
      return;
    }
    if (step === 'accept_job') {
      setError('Open Jobs page and accept an available assigned job.');
      return;
    }
    if (step === 'legal_agreement' || step === 'work_execution') {
      setError('Open Contracts page to complete and activate the agreement before work can begin.');
      return;
    }
    if (step === 'generate_invoice') {
      setError('Open Invoices page and generate invoice from approved log.');
    }
  };

  const stats = useMemo(() => {
    const byContract = new Map(contracts.map((c) => [String(c._id), c]));
    const estimateLogValue = (log) => {
      const c = byContract.get(String(log?.contract?._id || log?.contract));
      if (!c) return 0;
      const rate = Number(c.rate || 0);
      if (c.paymentType === 'hourly') return Number(log.hours || 0) * rate;
      if (c.paymentType === 'daily') return (Number(log.hours || 0) / 8) * rate;
      if (c.paymentType === 'weekly') return (Number(log.hours || 0) / 40) * rate;
      return rate;
    };
    const activeTasks = jobs.filter((x) => x.status !== 'completed').length;
    const pendingLogs = logs.filter((x) => x.verificationStatus === 'pending').length;
    const weekHours = logs.slice(0, 7).reduce((a, b) => a + Number(b.hours || 0), 0);
    const released = logs.filter((x) => x.verificationStatus === 'approved').reduce((a, b) => a + estimateLogValue(b), 0);
    const pending = logs.filter((x) => x.verificationStatus === 'pending').reduce((a, b) => a + estimateLogValue(b), 0);
    const totalEarnings = released + pending;
    const weekEarnings = logs.slice(0, 7).reduce((a, b) => a + estimateLogValue(b), 0);
    return {
      activeTasks,
      pendingLogs,
      weekHours: Number(weekHours.toFixed(2)),
      totalEarnings: Number(totalEarnings.toFixed(2)),
      weekEarnings: Number(weekEarnings.toFixed(2)),
      released: Number(released.toFixed(2)),
      pendingAmount: Number(pending.toFixed(2))
    };
  }, [jobs, logs, contracts]);

  const workspaceStats = useMemo(() => ({
    projects: workspace?.projectAccess?.summary?.accessible ?? workspace?.summary?.projects ?? jobs.length,
    contracts: workspace?.summary?.contracts ?? contracts.length,
    notifications: workspace?.summary?.notifications ?? 0,
    pendingLogs: workspace?.summary?.pendingLogs ?? logs.filter((x) => x.verificationStatus === 'pending').length,
  }), [contracts.length, jobs.length, logs, workspace]);

  return (
    <main className="min-h-screen flex-1 overflow-y-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
      <div className="mx-auto w-full max-w-[1680px] p-3 sm:p-4 lg:p-6 2xl:p-8">
      <PortalHeader
        title="Freelancer Dashboard"
        subtitle=""
        user={user}
        icon="work"
        showSearch={false}
        showNotifications
        showThemeToggle
      >
        <Button
          variant="primary"
          size="md"
          className="min-h-11"
          onClick={() => setOpenSubmit(true)}
          icon={<span className="material-symbols-outlined text-lg">post_add</span>}
        >
          Submit Work
        </Button>
      </PortalHeader>

      {error ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="secondary" size="sm" onClick={load}>
              Retry
            </Button>
          </div>
        </div>
      ) : null}
      {loading ? (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />)}
        </div>
      ) : null}
      <section className={`${wrap} mb-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Workspace</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <p className="text-xs uppercase text-neutral-500 dark:text-neutral-400">Assigned Projects</p>
            <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{workspaceStats.projects}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <p className="text-xs uppercase text-neutral-500 dark:text-neutral-400">Active Contracts</p>
            <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{workspaceStats.contracts}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <p className="text-xs uppercase text-neutral-500 dark:text-neutral-400">Notifications</p>
            <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{workspaceStats.notifications}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <p className="text-xs uppercase text-neutral-500 dark:text-neutral-400">Pending Logs</p>
            <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{workspaceStats.pendingLogs}</p>
          </div>
        </div>
      </section>
      <FreelancerStatsCards stats={stats} />
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2 items-stretch">
        <WorkflowGuide workflow={workflow} onAction={handleWorkflowAction} />
        <TimeTracker
          session={sessions.currentSession || sessions.activeSession || null}
          onCheckIn={async () => { await outsourcingApi.checkIn(token, {}); load(); }}
          onPause={async () => { await outsourcingApi.pauseSession(token, {}); load(); }}
          onResume={async () => { await outsourcingApi.resumeSession(token, {}); load(); }}
          onStop={async () => { await outsourcingApi.stopSession(token, {}); load(); }}
        />
        <EarningsSummary current={stats.released} pending={stats.pendingAmount} />
      </div>
      <section className={`${wrap} mt-4`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-neutral-900 dark:text-white">Essential Tasks</h3>
          <button onClick={() => setOpenSubmit(true)} className="min-h-10 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-black">Submit Work</button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-neutral-500">No assigned jobs yet.</p>
        ) : (
          <div className="space-y-2">
            {jobs.slice(0, 3).map((j) => (
              <div key={j._id} className="rounded-lg border border-neutral-200 p-2.5 text-sm dark:border-neutral-800">
                <p className="font-semibold text-neutral-900 dark:text-white">{j.title}</p>
                <p className="text-neutral-500 dark:text-neutral-400">{j.status}</p>
              </div>
            ))}
          </div>
        )}
      </section>
      <SubmitWorkModal
        open={openSubmit}
        onClose={() => setOpenSubmit(false)}
        contracts={activeContracts}
        onSubmit={async (payload) => { await outsourcingApi.logTime(token, payload); load(); }}
      />
      </div>
    </main>
  );
}
