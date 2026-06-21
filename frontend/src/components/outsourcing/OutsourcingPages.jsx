import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { outsourcingApi } from '../../services/outsourcing';
import FreelancerDashboard from './FreelancerDashboard';

// ─────────────────────────────────────────────────────────────────────────────
// Design System
// ─────────────────────────────────────────────────────────────────────────────
const tone = {
  pending:     'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  accepted:    'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:ring-cyan-700',
  in_progress: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  completed:   'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  active:      'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  approved:    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  rejected:    'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  draft:       'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  paid:        'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  unpaid:      'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  overdue:     'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  expired:     'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  open:        'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  closed:      'bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  resolved:    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
};

const Pill = ({ value, className = '' }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone[value] || tone.draft} ${className}`}>
    {String(value || 'unknown').replace(/_/g, ' ')}
  </span>
);

const Card = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 ${className}`}>
    {children}
  </section>
);

const Inner = ({ children, className = '' }) => (
  <div className={`p-5 lg:p-6 ${className}`}>{children}</div>
);

const PageHdr = ({ title, subtitle, action }) => (
  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

const SectionHdr = ({ title, action }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h3>
    {action}
  </div>
);

const StatCard = ({ icon, label, value, accentIcon = 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300', loading }) => (
  <Card>
    <Inner className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</p>
        <span className={`material-symbols-outlined rounded-xl p-2 text-base ${accentIcon}`}>{icon}</span>
      </div>
      {loading ? (
        <div className="h-8 w-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
      ) : (
        <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{value}</p>
      )}
    </Inner>
  </Card>
);

const EmptyState = ({ icon = 'inbox', title, subtitle }) => (
  <div className="flex flex-col items-center gap-2 py-12 text-center">
    <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-700">{icon}</span>
    <p className="font-semibold text-neutral-600 dark:text-neutral-300">{title}</p>
    {subtitle && <p className="text-sm text-neutral-400 dark:text-neutral-500">{subtitle}</p>}
  </div>
);

const ErrorBanner = ({ message, onRetry }) => (
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm dark:border-rose-900/50 dark:bg-rose-950/20">
    <span className="text-rose-700 dark:text-rose-300">{message || 'Failed to load data.'}</span>
    {onRetry && <button onClick={onRetry} className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700">Retry</button>}
  </div>
);

const Skeleton = ({ rows = 4, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="animate-pulse rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-2 h-4 w-1/3 rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-3 w-2/3 rounded bg-neutral-100 dark:bg-neutral-800" />
      </div>
    ))}
  </div>
);

const Inp = ({ className = '', ...p }) => (
  <input className={`w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-600 ${className}`} {...p} />
);

const Sel = ({ children, className = '', ...p }) => (
  <select className={`w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white ${className}`} {...p}>{children}</select>
);

const Txa = ({ className = '', ...p }) => (
  <textarea className={`w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white ${className}`} {...p} />
);

const BtnPrimary = ({ children, className = '', ...p }) => (
  <button className={`rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-100 ${className}`} {...p}>{children}</button>
);

const BtnSecondary = ({ children, className = '', ...p }) => (
  <button className={`rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 ${className}`} {...p}>{children}</button>
);

const avatarBg = (s = '') => {
  const p = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xfffffff;
  return p[h % p.length];
};

const initials = (u) =>
  `${(u?.firstName || '')[0] || ''}${(u?.lastName || '')[0] || ''}`.toUpperCase() || (u?.email || 'U')[0].toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export const OutsourcingDashboardPage = () => {
  const { token, user } = useAuth();
  const isWorker =
    user?.role === 'freelancer' ||
    user?.department?.toLowerCase().includes('outsourc') ||
    String(user?.metadata?.outsourcingType || '').toLowerCase().includes('worker') ||
    String(user?.metadata?.outsourcingType || '').toLowerCase().includes('freelan');

  if (isWorker) return <FreelancerDashboard token={token} user={user} />;

  const [data, setData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [d, j, c, l] = await Promise.allSettled([
        outsourcingApi.getDashboard(token),
        outsourcingApi.getJobs(token),
        outsourcingApi.getContracts(token),
        outsourcingApi.getTimeLogs(token)
      ]);
      setData(d.status === 'fulfilled' ? d.value?.data : null);
      setJobs(j.status === 'fulfilled' ? j.value?.data || [] : []);
      setContracts(c.status === 'fulfilled' ? c.value?.data || [] : []);
      setLogs(l.status === 'fulfilled' ? l.value?.data || [] : []);
      setLoading(false);
    })();
  }, [token]);

  const kpis = [
    { label: 'Total Jobs', value: jobs.length, icon: 'work', accent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    { label: 'Active Contracts', value: contracts.filter((c) => c.status === 'active').length, icon: 'contract', accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    { label: 'Pending Logs', value: logs.filter((l) => l.verificationStatus === 'pending').length, icon: 'pending_actions', accent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    { label: 'Freelancers', value: data?.users?.freelancers || data?.users?.workers || 0, icon: 'group', accent: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  ];

  return (
    <div className="space-y-5">
      <PageHdr title="Outsourcing Dashboard" subtitle="Jobs, contracts, and work logs overview" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => <StatCard key={k.label} icon={k.icon} label={k.label} value={k.value} accentIcon={k.accent} loading={loading} />)}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <Inner>
            <SectionHdr title="Recent Jobs" />
            {loading ? <Skeleton rows={3} /> : jobs.length === 0 ? (
              <EmptyState icon="work" title="No jobs yet" subtitle="Create jobs from the admin panel." />
            ) : (
              <div className="space-y-2">
                {jobs.slice(0, 5).map((j) => (
                  <div key={j._id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{j.title}</p>
                      <p className="text-xs text-neutral-500">{j?.assignedFreelancer?.email || 'Unassigned'}</p>
                    </div>
                    <Pill value={j.status} />
                  </div>
                ))}
              </div>
            )}
          </Inner>
        </Card>
        <Card>
          <Inner>
            <SectionHdr title="Log Health" />
            {loading ? <Skeleton rows={3} /> : (
              <div className="space-y-2">
                {[
                  { label: 'Pending Verification', value: logs.filter((l) => l.verificationStatus === 'pending').length, color: 'text-amber-600' },
                  { label: 'Approved Logs', value: logs.filter((l) => l.verificationStatus === 'approved').length, color: 'text-emerald-600' },
                  { label: 'Total Contracts', value: contracts.length, color: 'text-neutral-800 dark:text-neutral-100' },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3 text-sm dark:border-neutral-800">
                    <span className="text-neutral-600 dark:text-neutral-300">{r.label}</span>
                    <span className={`text-base font-bold ${r.color}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            )}
          </Inner>
        </Card>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Jobs
// ─────────────────────────────────────────────────────────────────────────────
export const OutsourcingJobsPage = () => {
  const { token, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const [j, c] = await Promise.all([outsourcingApi.getJobs(token), outsourcingApi.getContracts(token)]);
      setRows(j.data || []);
      setContracts(c.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const activeContractJobIds = useMemo(
    () => new Set(contracts.filter((c) => c.status === 'active').map((c) => String(c?.job?._id || c?.job || '')).filter(Boolean)),
    [contracts]
  );

  const filtered = useMemo(() => {
    let r = rows;
    if (statusFilter !== 'all') r = r.filter((x) => x.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) r = r.filter((x) => `${x.title} ${x.description || ''}`.toLowerCase().includes(q));
    return r;
  }, [rows, query, statusFilter]);

  const doAccept = async (id) => {
    try { setBusyId(id); await outsourcingApi.acceptJob(token, id); await load({ silent: true }); } catch (e) { setError(e.message); } finally { setBusyId(''); }
  };
  const doStatus = async (id, s) => {
    try { setBusyId(id); await outsourcingApi.updateJobStatus(token, id, s); await load({ silent: true }); } catch (e) { setError(e.message); } finally { setBusyId(''); }
  };

  const statusCounts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    in_progress: rows.filter((r) => r.status === 'in_progress').length,
    completed: rows.filter((r) => r.status === 'completed').length,
  }), [rows]);

  return (
    <div className="space-y-5">
      <PageHdr
        title="Jobs"
        subtitle="View, accept, and track job assignments"
        action={<Inp className="w-64" placeholder="Search jobs…" value={query} onChange={(e) => setQuery(e.target.value)} />}
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.entries({ all: 'All', pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' }).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setStatusFilter(k)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${statusFilter === k ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'}`}
          >
            {label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${statusFilter === k ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
              {statusCounts[k]}
            </span>
          </button>
        ))}
      </div>

      {loading ? <Skeleton rows={5} /> : (
        filtered.length === 0 ? (
          <Card><Inner><EmptyState icon="work" title="No jobs found" subtitle="Try adjusting your filters." /></Inner></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const hasContract = activeContractJobIds.has(String(r._id));
              const isAssigned = r?.assignedFreelancer?._id === user?._id;
              const canAccept = user?.role !== 'admin' && r.acceptanceStatus !== 'accepted' && (!r?.assignedFreelancer || isAssigned);
              const canUpdate = user?.role !== 'admin' && isAssigned && r.acceptanceStatus === 'accepted';
              return (
                <Card key={r._id}>
                  <Inner>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{r.title}</h3>
                          <Pill value={r.status} />
                          <Pill value={r.acceptanceStatus || 'pending'} />
                        </div>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{r.description || 'No description provided.'}</p>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-400 dark:text-neutral-500">
                          <span><span className="font-medium text-neutral-600 dark:text-neutral-300">Created by:</span> {r?.createdBy?.email || 'Admin'}</span>
                          <span><span className="font-medium text-neutral-600 dark:text-neutral-300">Assigned:</span> {r?.assignedFreelancer?.email || 'Unassigned'}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {canAccept && (
                          <BtnPrimary onClick={() => doAccept(r._id)} disabled={busyId === r._id} className="text-xs py-2 px-3">
                            {busyId === r._id ? 'Accepting…' : 'Accept Job'}
                          </BtnPrimary>
                        )}
                        {canUpdate && !hasContract && (
                          <span className="self-center text-xs text-amber-600 dark:text-amber-400">Waiting for contract</span>
                        )}
                        {canUpdate && hasContract && r.status !== 'in_progress' && r.status !== 'completed' && (
                          <BtnPrimary onClick={() => doStatus(r._id, 'in_progress')} disabled={busyId === r._id} className="bg-blue-600 hover:bg-blue-700 text-xs py-2 px-3 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700">
                            Start Work
                          </BtnPrimary>
                        )}
                        {canUpdate && hasContract && r.status !== 'completed' && (
                          <BtnSecondary onClick={() => doStatus(r._id, 'completed')} disabled={busyId === r._id} className="text-xs py-2 px-3">
                            {busyId === r._id ? 'Updating…' : 'Mark Done'}
                          </BtnSecondary>
                        )}
                      </div>
                    </div>
                  </Inner>
                </Card>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────────────────────────────────────
export const OutsourcingContractsPage = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    outsourcingApi.getContracts(token)
      .then((r) => setRows(r.data || []))
      .catch((e) => setError(e.message || 'Failed to load contracts'))
      .finally(() => setLoading(false));
  }, [token]);

  const active = rows.filter((r) => r.status === 'active').length;
  const totalValue = rows.reduce((s, r) => s + Number(r.rate || 0), 0);

  return (
    <div className="space-y-5">
      <PageHdr title="Contracts" subtitle="Payment terms, rates, and resource assignments" />
      {error && <ErrorBanner message={error} />}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon="contract" label="Total" value={rows.length} loading={loading} accentIcon="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
        <StatCard icon="check_circle" label="Active" value={active} loading={loading} accentIcon="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
        <StatCard icon="pending" label="Pending" value={rows.filter((r) => r.status === 'pending').length} loading={loading} accentIcon="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
        <StatCard icon="currency_rupee" label="Total Rate" value={`₹${totalValue.toLocaleString('en-IN')}`} loading={loading} accentIcon="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" />
      </div>
      {loading ? <Skeleton rows={4} /> : rows.length === 0 ? (
        <Card><Inner><EmptyState icon="contract" title="No contracts yet" subtitle="Create contracts after jobs are assigned." /></Inner></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {rows.map((r) => (
            <Card key={r._id}>
              <Inner>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-neutral-900 dark:text-white">{r?.job?.title || 'Untitled Job'}</h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Pill value={r.status} />
                      <Pill value={r.paymentType || 'fixed'} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-neutral-900 dark:text-white">₹{Number(r.rate || 0).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-neutral-400">{r.currency || 'INR'} / {r.paymentType || 'fixed'}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                  <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
                    <p className="font-semibold text-neutral-700 dark:text-neutral-200">Created By</p>
                    <p className="mt-0.5 truncate">{r?.createdBy?.email || 'Super Admin'}</p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
                    <p className="font-semibold text-neutral-700 dark:text-neutral-200">Worker</p>
                    <p className="mt-0.5 truncate">{r?.freelancer?.email || 'Not assigned'}</p>
                  </div>
                </div>
              </Inner>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Time Logs
// ─────────────────────────────────────────────────────────────────────────────
export const OutsourcingTimeLogsPage = () => {
  const { token, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [sessionData, setSessionData] = useState({ isCheckedIn: false, activeSession: null, sessions: [] });
  const [form, setForm] = useState({ contractId: '', logDate: '', hours: '', workSummary: '', deliverableUrl: '', note: '', workStatus: 'in_progress' });
  const [submitting, setSubmitting] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionMsg, setSessionMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [contracts, setContracts] = useState([]);

  const isWorker = user?.role === 'freelancer' || String(user?.metadata?.outsourcingType || '').toLowerCase().includes('worker') || String(user?.metadata?.outsourcingType || '').toLowerCase().includes('freelan');

  const loadLogs = useCallback(() =>
    outsourcingApi.getTimeLogs(token).then((r) => setRows(r.data || [])).catch(() => {}), [token]);
  const loadSessions = useCallback(() =>
    outsourcingApi.getMySessions(token).then((r) => setSessionData(r.data || { isCheckedIn: false, activeSession: null, sessions: [] })).catch(() => {}), [token]);
  const loadContracts = useCallback(() =>
    outsourcingApi.getContracts(token).then((r) => setContracts(r.data || [])).catch(() => {}), [token]);

  useEffect(() => {
    Promise.all([loadLogs(), loadSessions(), loadContracts()]).finally(() => setLoading(false));
  }, [loadLogs, loadSessions, loadContracts]);

  const onCheckIn = async () => {
    try { setSessionBusy(true); setSessionMsg(''); await outsourcingApi.checkIn(token, {}); setSessionMsg('Checked in.'); await loadSessions(); } catch (e) { setSessionMsg(e.message || 'Failed'); } finally { setSessionBusy(false); }
  };
  const onCheckOut = async () => {
    try { setSessionBusy(true); setSessionMsg(''); const r = await outsourcingApi.checkOut(token, {}); setSessionMsg(`Checked out. ${r?.data?.durationHours || 0}h`); await loadSessions(); } catch (e) { setSessionMsg(e.message || 'Failed'); } finally { setSessionBusy(false); }
  };
  const submitLog = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await outsourcingApi.logTime(token, { ...form, hours: Number(form.hours) });
      setForm({ contractId: '', logDate: '', hours: '', workSummary: '', deliverableUrl: '', note: '', workStatus: 'in_progress' });
      setShowForm(false);
      await loadLogs();
    } finally { setSubmitting(false); }
  };

  const totalHours = useMemo(() => rows.reduce((s, r) => s + Number(r.hours || 0), 0).toFixed(1), [rows]);
  const approvedCount = useMemo(() => rows.filter((r) => r.verificationStatus === 'approved').length, [rows]);

  return (
    <div className="space-y-5">
      <PageHdr
        title="Time Logs"
        subtitle="Submit, review, and verify work effort records"
        action={isWorker && <BtnPrimary onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'Log Time'}</BtnPrimary>}
      />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon="schedule" label="Total Hours" value={`${totalHours}h`} loading={loading} accentIcon="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
        <StatCard icon="check_circle" label="Approved" value={approvedCount} loading={loading} accentIcon="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
        <StatCard icon="pending_actions" label="Pending" value={rows.filter((r) => r.verificationStatus === 'pending').length} loading={loading} accentIcon="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
        <StatCard icon="cancel" label="Rejected" value={rows.filter((r) => r.verificationStatus === 'rejected').length} loading={loading} accentIcon="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" />
      </div>

      {/* Check-in bar */}
      {isWorker && (
        <Card>
          <Inner>
            <SectionHdr title="Session Tracker" />
            <div className="flex flex-wrap items-center gap-3">
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${sessionData.isCheckedIn ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                <span className={`h-2 w-2 rounded-full ${sessionData.isCheckedIn ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                {sessionData.isCheckedIn ? `Active since ${new Date(sessionData.activeSession?.checkInAt).toLocaleTimeString()}` : 'Checked Out'}
              </div>
              <BtnPrimary onClick={onCheckIn} disabled={sessionBusy || sessionData.isCheckedIn} className="bg-emerald-600 hover:bg-emerald-700 text-xs py-2 px-3 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700">Check In</BtnPrimary>
              <BtnPrimary onClick={onCheckOut} disabled={sessionBusy || !sessionData.isCheckedIn} className="bg-rose-600 hover:bg-rose-700 text-xs py-2 px-3 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-700">Check Out</BtnPrimary>
              {sessionMsg && <p className="text-xs text-neutral-500 dark:text-neutral-400">{sessionMsg}</p>}
            </div>
          </Inner>
        </Card>
      )}

      {/* Log Time form */}
      {isWorker && showForm && (
        <Card>
          <Inner>
            <SectionHdr title="Submit Work Update" />
            <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={submitLog}>
              <Sel value={form.contractId} onChange={(e) => setForm({ ...form, contractId: e.target.value })} required>
                <option value="">Select contract</option>
                {contracts.filter((c) => c.status === 'active').map((c) => (
                  <option key={c._id} value={c._id}>{c?.job?.title || 'Contract'} ({c.paymentType})</option>
                ))}
              </Sel>
              <Inp type="date" value={form.logDate} onChange={(e) => setForm({ ...form, logDate: e.target.value })} required />
              <Inp placeholder="Hours worked" type="number" min="0.5" step="0.5" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} required />
              <Sel value={form.workStatus} onChange={(e) => setForm({ ...form, workStatus: e.target.value })}>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </Sel>
              <Inp className="md:col-span-2" placeholder="Work summary" value={form.workSummary} onChange={(e) => setForm({ ...form, workSummary: e.target.value })} />
              <Inp className="md:col-span-2" placeholder="Deliverable URL (Drive / GitHub / Figma)" value={form.deliverableUrl} onChange={(e) => setForm({ ...form, deliverableUrl: e.target.value })} />
              <Txa className="md:col-span-2" rows={3} placeholder="Daily note / update" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              <BtnPrimary disabled={submitting} className="md:col-span-2 w-full">{submitting ? 'Submitting…' : 'Submit Log'}</BtnPrimary>
            </form>
          </Inner>
        </Card>
      )}

      {/* Log history */}
      <Card>
        <Inner>
          <SectionHdr title="Time Log History" />
          {loading ? <Skeleton rows={4} /> : rows.length === 0 ? (
            <EmptyState icon="schedule" title="No time logs yet" subtitle="Submit a log entry once contracts are active." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800">
                    {['Date', 'Project', 'Hours', 'Status', 'Verification'].map((h) => (
                      <th key={h} className="pb-2.5 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-900">
                  {rows.map((r) => (
                    <tr key={r._id} className="align-middle">
                      <td className="py-3 pr-6 text-neutral-600 dark:text-neutral-300">{r.logDate ? new Date(r.logDate).toLocaleDateString() : '—'}</td>
                      <td className="py-3 pr-6 font-medium text-neutral-900 dark:text-white">{r?.job?.title || 'Untitled'}</td>
                      <td className="py-3 pr-6 text-neutral-600 dark:text-neutral-300">{r.hours}h</td>
                      <td className="py-3 pr-6"><Pill value={r.workStatus || 'in_progress'} /></td>
                      <td className="py-3 pr-6"><Pill value={r.verificationStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Inner>
      </Card>

      {/* Session history */}
      {isWorker && (sessionData.sessions || []).length > 0 && (
        <Card>
          <Inner>
            <SectionHdr title="Check-in History" />
            <div className="space-y-2">
              {(sessionData.sessions || []).map((s) => (
                <div key={s._id} className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3 text-sm dark:border-neutral-800">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">{new Date(s.checkInAt).toLocaleString()}</p>
                    <p className="text-xs text-neutral-400">{s.checkOutAt ? `Out: ${new Date(s.checkOutAt).toLocaleString()}` : 'Active'}</p>
                  </div>
                  <div className="text-right">
                    <Pill value={s.status} />
                    <p className="mt-1 text-xs text-neutral-400">{(Number(s.durationMinutes || 0) / 60).toFixed(2)}h</p>
                  </div>
                </div>
              ))}
            </div>
          </Inner>
        </Card>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Profile  (premium layout)
// ─────────────────────────────────────────────────────────────────────────────
const defaultForm = () => ({
  firstName: '', lastName: '', email: '', phone: '', title: '', bio: '',
  city: '', country: '', timezone: '', hourlyRate: '', availability: '', skillsCsv: '',
  accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '', accountType: '', upiId: '', paypalEmail: ''
});

export const OutsourcingProfilePage = () => {
  const { token, user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [p, j, c, l] = await Promise.allSettled([
      outsourcingApi.getMyProfile(token),
      outsourcingApi.getJobs(token),
      outsourcingApi.getContracts(token),
      outsourcingApi.getTimeLogs(token)
    ]);
    const prof = p.status === 'fulfilled' ? p.value?.data : null;
    setProfile(prof);
    setJobs(j.status === 'fulfilled' ? j.value?.data || [] : []);
    setContracts(c.status === 'fulfilled' ? c.value?.data || [] : []);
    setLogs(l.status === 'fulfilled' ? l.value?.data || [] : []);
    if (prof) {
      const m = prof.metadata || {};
      setForm({
        firstName: prof.firstName || '', lastName: prof.lastName || '', email: prof.email || '',
        phone: m.phone || '', title: m.title || '', bio: m.bio || '',
        city: m.city || '', country: m.country || '', timezone: m.timezone || '',
        hourlyRate: m.hourlyRate || '', availability: m.availability || '',
        skillsCsv: (m.skills || []).join(', '),
        accountHolderName: m.bankDetails?.accountHolderName || '',
        bankName: m.bankDetails?.bankName || '',
        accountNumber: m.bankDetails?.accountNumber || '',
        ifscCode: m.bankDetails?.ifscCode || '',
        accountType: m.bankDetails?.accountType || '',
        upiId: m.paymentInfo?.upiId || '',
        paypalEmail: m.paymentInfo?.paypalEmail || '',
      });
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    try {
      setSaving(true); setMsg('');
      await outsourcingApi.updateMyProfile(token, {
        firstName: form.firstName, lastName: form.lastName, phone: form.phone,
        title: form.title, bio: form.bio, city: form.city, country: form.country,
        timezone: form.timezone, hourlyRate: Number(form.hourlyRate) || 0,
        availability: form.availability, skills: form.skillsCsv.split(',').map((s) => s.trim()).filter(Boolean),
        bankDetails: { accountHolderName: form.accountHolderName, bankName: form.bankName, accountNumber: form.accountNumber, ifscCode: form.ifscCode, accountType: form.accountType },
        paymentInfo: { upiId: form.upiId, paypalEmail: form.paypalEmail }
      });
      setMsg('Profile updated!');
      await load();
    } catch (e) { setMsg(e.message || 'Failed to save'); } finally { setSaving(false); }
  };

  const m = profile?.metadata || {};
  const skills = m.skills || [];
  const totalHours = logs.reduce((s, l) => s + Number(l.hours || 0), 0).toFixed(0);
  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const activeContracts = contracts.filter((c) => c.status === 'active').length;
  const displayName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || authUser?.email || 'Freelancer';
  const bg = avatarBg(displayName);

  // Profile completion %
  const completion = (() => {
    const fields = [profile?.firstName, profile?.lastName, profile?.email, m.phone, m.title, m.bio, m.city, m.country, m.hourlyRate, skills.length > 0];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  })();

  if (loading) return <Skeleton rows={6} />;

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <Card>
        <div className="h-28 rounded-t-2xl bg-linear-to-r from-violet-600 via-indigo-600 to-blue-500" />
        <Inner className="-mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className={`flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white text-3xl font-bold text-white shadow-lg dark:border-neutral-950 ${bg}`}>
                {initials(profile || authUser)}
              </div>
              <div className="pb-1">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{displayName}</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{m.title || 'Freelancer'}</p>
                {(m.city || m.country) && (
                  <p className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    {[m.city, m.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <BtnPrimary onClick={() => setEditOpen(true)} className="shrink-0">
              <span className="flex items-center gap-2"><span className="material-symbols-outlined text-base">edit</span>Edit Profile</span>
            </BtnPrimary>
          </div>

          {/* Completion bar */}
          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">Profile completeness</span>
              <span className="font-semibold text-neutral-700 dark:text-neutral-200">{completion}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-linear-to-r from-violet-500 to-blue-500 transition-all" style={{ width: `${completion}%` }} />
            </div>
          </div>
        </Inner>
      </Card>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon="work" label="Total Jobs" value={jobs.length} accentIcon="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
        <StatCard icon="schedule" label="Hours Logged" value={`${totalHours}h`} accentIcon="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" />
        <StatCard icon="handshake" label="Active Contracts" value={activeContracts} accentIcon="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
        <StatCard icon="task_alt" label="Completed Jobs" value={completedJobs} accentIcon="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Contact */}
        <Card>
          <Inner>
            <SectionHdr title="Contact Info" />
            <div className="space-y-3 text-sm">
              {[
                { icon: 'email', label: 'Email', value: profile?.email },
                { icon: 'phone', label: 'Phone', value: m.phone || '—' },
                { icon: 'public', label: 'Timezone', value: m.timezone || '—' },
                { icon: 'schedule', label: 'Availability', value: m.availability || '—' },
                { icon: 'currency_rupee', label: 'Hourly Rate', value: m.hourlyRate ? `₹${m.hourlyRate}/hr` : '—' },
              ].map((r) => (
                <div key={r.label} className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-base text-neutral-400">{r.icon}</span>
                  <div>
                    <p className="text-xs text-neutral-400">{r.label}</p>
                    <p className="font-medium text-neutral-900 dark:text-white">{r.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Inner>
        </Card>

        {/* Skills & bio */}
        <Card>
          <Inner>
            <SectionHdr title="Skills & Bio" />
            {m.bio && <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">{m.bio}</p>}
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">{s}</span>
                ))}
              </div>
            ) : <p className="text-sm text-neutral-400">No skills listed.</p>}
          </Inner>
        </Card>

        {/* Payment info */}
        <Card>
          <Inner>
            <SectionHdr title="Payment Details" />
            <div className="space-y-3 text-sm">
              {[
                { label: 'Account Holder', value: m.bankDetails?.accountHolderName || '—' },
                { label: 'Bank', value: m.bankDetails?.bankName || '—' },
                { label: 'IFSC', value: m.bankDetails?.ifscCode || '—' },
                { label: 'UPI', value: m.paymentInfo?.upiId || '—' },
                { label: 'PayPal', value: m.paymentInfo?.paypalEmail || '—' },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
                  <span className="text-xs text-neutral-400">{r.label}</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">{r.value}</span>
                </div>
              ))}
            </div>
          </Inner>
        </Card>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 dark:bg-neutral-950 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Edit Profile</h3>
              <button onClick={() => setEditOpen(false)} className="rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined text-xl text-neutral-500">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Inp placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                <Inp placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <Inp placeholder="Professional title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Txa rows={3} placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Inp placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Inp placeholder="Hourly rate (₹)" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Inp placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <Inp placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Inp placeholder="Timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
                <Inp placeholder="Availability" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
              </div>
              <Inp placeholder="Skills (comma-separated)" value={form.skillsCsv} onChange={(e) => setForm({ ...form, skillsCsv: e.target.value })} />
              <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Bank Details</p>
              <div className="grid grid-cols-2 gap-3">
                <Inp placeholder="Account holder name" value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} />
                <Inp placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Inp placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
                <Inp placeholder="IFSC code" value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Inp placeholder="Account type" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })} />
                <Inp placeholder="UPI ID" value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} />
              </div>
              <Inp placeholder="PayPal email" value={form.paypalEmail} onChange={(e) => setForm({ ...form, paypalEmail: e.target.value })} />
              {msg && <p className={`text-sm ${msg.includes('!') ? 'text-emerald-600' : 'text-rose-600'}`}>{msg}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <BtnSecondary onClick={() => setEditOpen(false)}>Cancel</BtnSecondary>
                <BtnPrimary onClick={saveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</BtnPrimary>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────
export const OutsourcingPaymentsPage = () => {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [p, l, c, pr] = await Promise.allSettled([
        outsourcingApi.getPayments(token),
        outsourcingApi.getTimeLogs(token),
        outsourcingApi.getContracts(token),
        outsourcingApi.getMyProfile(token)
      ]);
      setPayments(p.status === 'fulfilled' ? p.value?.data || [] : []);
      setLogs(l.status === 'fulfilled' ? l.value?.data || [] : []);
      setContracts(c.status === 'fulfilled' ? c.value?.data || [] : []);
      setProfile(pr.status === 'fulfilled' ? pr.value?.data : null);
      if ([p, l, c].every((r) => r.status === 'rejected')) setError('Failed to load payment data.');
      setLoading(false);
    })();
  }, [token]);

  const byContract = useMemo(() => new Map(contracts.map((c) => [String(c._id), c])), [contracts]);

  const estimateValue = (log) => {
    const c = byContract.get(String(log?.contract?._id || log?.contract));
    if (!c) return 0;
    const rate = Number(c.rate || 0);
    if (c.paymentType === 'hourly') return Number(log.hours || 0) * rate;
    if (c.paymentType === 'daily') return (Number(log.hours || 0) / 8) * rate;
    if (c.paymentType === 'weekly') return (Number(log.hours || 0) / 40) * rate;
    return rate;
  };

  const totalEarned = useMemo(() => logs.filter((l) => l.verificationStatus === 'approved').reduce((s, l) => s + estimateValue(l), 0), [logs, byContract]);
  const pendingAmt = useMemo(() => logs.filter((l) => l.verificationStatus === 'pending').reduce((s, l) => s + estimateValue(l), 0), [logs, byContract]);

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyEarned = useMemo(() => logs.filter((l) => l.verificationStatus === 'approved' && (l.logDate || '').startsWith(monthPrefix)).reduce((s, l) => s + estimateValue(l), 0), [logs, byContract, monthPrefix]);

  // Monthly series for chart (last 6 months)
  const chartSeries = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const val = logs.filter((l) => l.verificationStatus === 'approved' && (l.logDate || '').startsWith(prefix)).reduce((s, l) => s + estimateValue(l), 0);
    return { label: d.toLocaleDateString('en-US', { month: 'short' }), value: Math.round(val) };
  }), [logs, byContract]);

  const maxVal = Math.max(...chartSeries.map((s) => s.value), 1);
  const W = 500; const H = 140; const pad = { t: 12, r: 12, b: 32, l: 48 };
  const cW = W - pad.l - pad.r; const cH = H - pad.t - pad.b;
  const pts = chartSeries.map((s, i) => ({
    x: pad.l + (i / (chartSeries.length - 1)) * cW,
    y: pad.t + cH - (s.value / maxVal) * cH,
    ...s
  }));
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `M ${pts[0]?.x ?? 0} ${H - pad.b} ${pts.map((p) => `L ${p.x} ${p.y}`).join(' ')} L ${pts[pts.length - 1]?.x ?? 0} ${H - pad.b} Z`;

  return (
    <div className="space-y-5">
      <PageHdr title="Payments" subtitle="Earnings, transactions, and payment methods" />
      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon="payments" label="Total Earned" value={`₹${totalEarned.toLocaleString('en-IN')}`} loading={loading} accentIcon="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
        <StatCard icon="calendar_month" label="This Month" value={`₹${monthlyEarned.toLocaleString('en-IN')}`} loading={loading} accentIcon="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
        <StatCard icon="pending_actions" label="Pending Approval" value={`₹${pendingAmt.toLocaleString('en-IN')}`} loading={loading} accentIcon="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
        <StatCard icon="account_balance_wallet" label="Transactions" value={payments.length} loading={loading} accentIcon="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" />
      </div>

      {/* Earnings chart */}
      <Card>
        <Inner>
          <SectionHdr title="Earnings Trend (6 months)" />
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 280, maxHeight: 160 }}>
              <defs>
                <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 0.5, 1].map((t) => {
                const y = pad.t + cH * (1 - t);
                return (
                  <g key={t}>
                    <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
                    <text x={pad.l - 4} y={y + 4} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.4">₹{Math.round(maxVal * t / 1000)}k</text>
                  </g>
                );
              })}
              <path d={area} fill="url(#payGrad)" />
              <polyline points={polyline} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="4" fill="#10b981" stroke="white" strokeWidth="2" />
                  <text x={p.x} y={H - 8} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5">{p.label}</text>
                </g>
              ))}
            </svg>
          </div>
        </Inner>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Recent payments */}
        <Card>
          <Inner>
            <SectionHdr title="Recent Transactions" />
            {loading ? <Skeleton rows={3} /> : payments.length === 0 ? (
              <EmptyState icon="payments" title="No transactions yet" subtitle="Approved work logs will generate payment records." />
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 8).map((p, i) => (
                  <div key={p._id || i} className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3 text-sm dark:border-neutral-800">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{p?.job?.title || p.description || 'Payment'}</p>
                      <p className="text-xs text-neutral-400">{p.paymentType || 'Transfer'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-neutral-900 dark:text-white">₹{Number(p.amount || 0).toLocaleString('en-IN')}</p>
                      <Pill value={p.status || 'paid'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Inner>
        </Card>

        {/* Payment methods */}
        <Card>
          <Inner>
            <SectionHdr title="Payment Methods" />
            <div className="space-y-3">
              {[
                { icon: 'account_balance', label: 'Bank Account', value: profile?.metadata?.bankDetails?.accountNumber ? `••••${String(profile.metadata.bankDetails.accountNumber).slice(-4)}` : 'Not configured', active: Boolean(profile?.metadata?.bankDetails?.accountNumber) },
                { icon: 'qr_code', label: 'UPI', value: profile?.metadata?.paymentInfo?.upiId || 'Not configured', active: Boolean(profile?.metadata?.paymentInfo?.upiId) },
                { icon: 'credit_card', label: 'PayPal', value: profile?.metadata?.paymentInfo?.paypalEmail || 'Not configured', active: Boolean(profile?.metadata?.paymentInfo?.paypalEmail) },
              ].map((m) => (
                <div key={m.label} className={`flex items-center gap-3 rounded-xl border p-3 ${m.active ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20' : 'border-neutral-200 dark:border-neutral-800'}`}>
                  <span className={`material-symbols-outlined rounded-xl p-2 text-base ${m.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'}`}>{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{m.label}</p>
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{m.value}</p>
                  </div>
                  {m.active && <span className="material-symbols-outlined text-base text-emerald-500">check_circle</span>}
                </div>
              ))}
            </div>
          </Inner>
        </Card>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────
export const OutsourcingNotificationsPage = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [items, setItems] = useState([]);

  useEffect(() => {
    outsourcingApi.getNotifications(token)
      .then((r) => { setRows(r.data || []); setItems(r.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { setItems(rows); }, [rows]);

  const markAll = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const unread = items.filter((n) => !n.read).length;

  const tabs = [
    { key: 'all', label: 'All', filter: () => true },
    { key: 'unread', label: 'Unread', filter: (n) => !n.read },
    { key: 'project', label: 'Projects', filter: (n) => n.type === 'Project assignment' },
    { key: 'contract', label: 'Contracts', filter: (n) => n.type === 'Contract' },
  ];
  const displayed = items.filter(tabs.find((t) => t.key === tab)?.filter || (() => true));

  const typeIcon = (type) => ({
    'Project assignment': 'work',
    'Contract': 'contract',
    'Approval': 'check_circle',
  }[type] || 'notifications');

  const relTime = (d) => {
    const m = Math.floor((Date.now() - new Date(d || 0)) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="space-y-5">
      <PageHdr
        title="Notifications"
        subtitle="Project, contract, and work activity alerts"
        action={unread > 0 && <BtnSecondary onClick={markAll} className="text-xs py-2 px-3">Mark all read ({unread})</BtnSecondary>}
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${tab === t.key ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <Inner className="p-0">
          {loading ? <div className="p-5"><Skeleton rows={5} /></div> : displayed.length === 0 ? (
            <EmptyState icon="notifications" title="No notifications" subtitle="You're all caught up." />
          ) : (
            <div className="divide-y divide-neutral-50 dark:divide-neutral-900">
              {displayed.map((n) => (
                <div key={n._id} onClick={() => setItems((prev) => prev.map((x) => x._id === n._id ? { ...x, read: true } : x))}
                  className={`flex cursor-pointer items-start gap-4 px-5 py-4 transition hover:bg-neutral-50 dark:hover:bg-neutral-900 ${!n.read ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800`}>
                    <span className="material-symbols-outlined text-base text-neutral-500 dark:text-neutral-400">{typeIcon(n.type)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                      {n.title || 'Notification'}
                    </p>
                    {n.message && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{n.message}</p>}
                    <p className="mt-1 text-[11px] text-neutral-400">{relTime(n.createdAt)} · {n.type || 'General'}</p>
                  </div>
                  {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                </div>
              ))}
            </div>
          )}
        </Inner>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Activity
// ─────────────────────────────────────────────────────────────────────────────
export const OutsourcingActivityPage = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.allSettled([outsourcingApi.getActivityFeed(token), outsourcingApi.getMyAnalytics(token)])
      .then(([a, an]) => {
        setEvents(a.status === 'fulfilled' ? a.value?.data || [] : []);
        setAnalytics(an.status === 'fulfilled' ? an.value?.data : null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const typeIcon = (type) => ({ job: 'work', contract: 'contract', timelog: 'schedule', session: 'login', payment: 'payments' }[type] || 'timeline');
  const typeColor = (type) => ({ job: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300', contract: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300', timelog: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300', session: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300', payment: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' }[type] || 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400');

  const now = new Date();
  const filtered = useMemo(() => {
    if (filter === 'today') return events.filter((e) => new Date(e.at).toDateString() === now.toDateString());
    if (filter === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); return events.filter((e) => new Date(e.at) >= w); }
    return events;
  }, [events, filter, now]);

  return (
    <div className="space-y-5">
      <PageHdr title="Activity" subtitle="Session, job, and work log timeline" />
      {analytics && (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard icon="handshake" label="Active Contracts" value={analytics?.contracts?.active || 0} loading={loading} accentIcon="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
          <StatCard icon="check_circle" label="Approved Logs" value={analytics?.timeLogs?.approved || 0} loading={loading} accentIcon="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
          <StatCard icon="schedule" label="Total Hours" value={`${analytics?.work?.totalHours || 0}h`} loading={loading} accentIcon="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" />
          <StatCard icon="currency_rupee" label="Est. Earnings" value={`₹${Number(analytics?.earnings?.estimatedApproved || 0).toLocaleString('en-IN')}`} loading={loading} accentIcon="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
        </div>
      )}

      <div className="flex gap-2">
        {['all', 'today', 'week'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${filter === f ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'}`}>
            {f === 'all' ? 'All Time' : f === 'today' ? 'Today' : 'This Week'}
          </button>
        ))}
      </div>

      <Card>
        <Inner>
          {loading ? <Skeleton rows={5} /> : filtered.length === 0 ? (
            <EmptyState icon="timeline" title="No activity" subtitle="Actions will appear here as you work." />
          ) : (
            <div className="relative space-y-0">
              {/* Timeline line */}
              <div className="absolute left-4.5 top-4 bottom-4 w-px bg-neutral-200 dark:bg-neutral-800" />
              {filtered.map((e, idx) => (
                <div key={`${e.type}-${idx}`} className="relative flex gap-4 pb-5 last:pb-0">
                  <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${typeColor(e.type)}`}>
                    <span className="material-symbols-outlined text-base">{typeIcon(e.type)}</span>
                  </div>
                  <div className="pt-1.5">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">{e.title}</p>
                    <p className="text-xs text-neutral-400">{e.at ? new Date(e.at).toLocaleString() : '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Inner>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Invoices
// ─────────────────────────────────────────────────────────────────────────────
export const OutsourcingInvoicesPage = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedLog, setSelectedLog] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [l, i] = await Promise.allSettled([outsourcingApi.getTimeLogs(token), outsourcingApi.getInvoices(token)]);
    const all = l.status === 'fulfilled' ? l.value?.data || [] : [];
    setLogs(all.filter((x) => x.verificationStatus === 'approved'));
    setInvoices(i.status === 'fulfilled' ? i.value?.data || [] : []);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (!selectedLog) return;
    try {
      setBusy(true); setMsg('');
      await outsourcingApi.generateInvoice(token, { timeLogId: selectedLog });
      setMsg('Invoice generated!');
      setSelectedLog('');
      await load();
    } catch (e) { setMsg(e.message || 'Failed'); } finally { setBusy(false); }
  };

  const totalAmt = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const paidAmt = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div className="space-y-5">
      <PageHdr title="Invoices" subtitle="Generate and review invoices for approved work" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon="receipt_long" label="Total Invoices" value={invoices.length} loading={loading} accentIcon="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
        <StatCard icon="paid" label="Paid" value={invoices.filter((i) => i.status === 'paid').length} loading={loading} accentIcon="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
        <StatCard icon="currency_rupee" label="Total Amount" value={`₹${totalAmt.toLocaleString('en-IN')}`} loading={loading} accentIcon="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" />
        <StatCard icon="account_balance_wallet" label="Amount Paid" value={`₹${paidAmt.toLocaleString('en-IN')}`} loading={loading} accentIcon="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
      </div>

      <Card>
        <Inner>
          <SectionHdr title="Generate Invoice" />
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-48">
              <Sel value={selectedLog} onChange={(e) => setSelectedLog(e.target.value)}>
                <option value="">Select approved time log</option>
                {logs.map((l) => (
                  <option key={l._id} value={l._id}>
                    {`${new Date(l.logDate).toLocaleDateString()} — ${l?.job?.title || 'Job'} (${l.hours}h)`}
                  </option>
                ))}
              </Sel>
            </div>
            <BtnPrimary onClick={generate} disabled={!selectedLog || busy}>{busy ? 'Generating…' : 'Generate Invoice'}</BtnPrimary>
          </div>
          {msg && <p className={`mt-2 text-sm ${msg.includes('!') ? 'text-emerald-600' : 'text-rose-600'}`}>{msg}</p>}
        </Inner>
      </Card>

      <Card>
        <Inner>
          <SectionHdr title="Invoice History" />
          {loading ? <Skeleton rows={4} /> : invoices.length === 0 ? (
            <EmptyState icon="receipt_long" title="No invoices yet" subtitle="Generate an invoice from approved time logs above." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800">
                    {['Invoice ID', 'Project', 'Amount', 'Status', 'Date'].map((h) => (
                      <th key={h} className="pb-2.5 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-900">
                  {invoices.map((r) => (
                    <tr key={r.invoiceId || r._id}>
                      <td className="py-3 pr-6 font-mono text-xs text-neutral-500">{r.invoiceId || r._id?.slice(0, 8)}</td>
                      <td className="py-3 pr-6 font-medium text-neutral-900 dark:text-white">{r.jobTitle || '—'}</td>
                      <td className="py-3 pr-6 font-semibold text-neutral-900 dark:text-white">₹{Number(r.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3 pr-6"><Pill value={r.status || 'unpaid'} /></td>
                      <td className="py-3 pr-6 text-neutral-500">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Inner>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Settings  (new)
// ─────────────────────────────────────────────────────────────────────────────
export const OutsourcingSettingsPage = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState('account');
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', timezone: 'Asia/Kolkata', language: 'English' });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [notifPrefs, setNotifPrefs] = useState({ emailJobs: true, emailContracts: true, emailPayments: true, emailSystem: false });
  const [privacyPrefs, setPrivacyPrefs] = useState({ showProfile: true, showEarnings: false, showOnline: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    outsourcingApi.getMyProfile(token)
      .then((r) => {
        const p = r.data;
        setProfile(p);
        const m = p?.metadata || {};
        setForm({ firstName: p?.firstName || '', lastName: p?.lastName || '', email: p?.email || '', phone: m.phone || '', timezone: m.timezone || 'Asia/Kolkata', language: m.language || 'English' });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const saveAccount = async () => {
    try {
      setSaving(true); setMsg({ type: '', text: '' });
      await outsourcingApi.updateMyProfile(token, { firstName: form.firstName, lastName: form.lastName, phone: form.phone, timezone: form.timezone, language: form.language });
      setMsg({ type: 'ok', text: 'Account settings saved!' });
    } catch (e) { setMsg({ type: 'err', text: e.message || 'Failed to save' }); } finally { setSaving(false); }
  };

  const tabs = [
    { key: 'account', icon: 'person', label: 'Account' },
    { key: 'security', icon: 'lock', label: 'Security' },
    { key: 'notifications', icon: 'notifications', label: 'Notifications' },
    { key: 'privacy', icon: 'visibility', label: 'Privacy' },
  ];

  const Toggle = ({ value, onChange }) => (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${value ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition dark:bg-neutral-950 ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  return (
    <div className="space-y-5">
      <PageHdr title="Settings" subtitle="Manage your account preferences and security" />
      <div className="flex flex-col gap-5 xl:flex-row">
        {/* Sidebar nav */}
        <aside className="shrink-0 xl:w-52">
          <Card>
            <Inner className="p-2">
              <nav className="space-y-0.5">
                {tabs.map((t) => (
                  <button key={t.key} onClick={() => { setTab(t.key); setMsg({ type: '', text: '' }); }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${tab === t.key ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900'}`}>
                    <span className="material-symbols-outlined text-base">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </nav>
            </Inner>
          </Card>
        </aside>

        {/* Panel */}
        <div className="flex-1">
          {tab === 'account' && (
            <Card>
              <Inner>
                <SectionHdr title="Account Information" />
                {loading ? <Skeleton rows={4} /> : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="mb-1 block text-xs font-semibold text-neutral-500">First Name</label><Inp value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                      <div><label className="mb-1 block text-xs font-semibold text-neutral-500">Last Name</label><Inp value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                    </div>
                    <div><label className="mb-1 block text-xs font-semibold text-neutral-500">Email (read-only)</label><Inp value={form.email} readOnly className="bg-neutral-50 text-neutral-400 dark:bg-neutral-900 cursor-not-allowed" /></div>
                    <div><label className="mb-1 block text-xs font-semibold text-neutral-500">Phone</label><Inp value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="mb-1 block text-xs font-semibold text-neutral-500">Timezone</label>
                        <Sel value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                          {['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'UTC'].map((tz) => <option key={tz}>{tz}</option>)}
                        </Sel>
                      </div>
                      <div><label className="mb-1 block text-xs font-semibold text-neutral-500">Language</label>
                        <Sel value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                          {['English', 'Hindi', 'Tamil', 'Telugu'].map((l) => <option key={l}>{l}</option>)}
                        </Sel>
                      </div>
                    </div>
                    {msg.text && <p className={`text-sm ${msg.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>}
                    <div className="flex justify-end"><BtnPrimary onClick={saveAccount} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</BtnPrimary></div>
                  </div>
                )}
              </Inner>
            </Card>
          )}

          {tab === 'security' && (
            <Card>
              <Inner>
                <SectionHdr title="Change Password" />
                <div className="space-y-4 max-w-sm">
                  <div><label className="mb-1 block text-xs font-semibold text-neutral-500">Current Password</label><Inp type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} placeholder="••••••••" /></div>
                  <div><label className="mb-1 block text-xs font-semibold text-neutral-500">New Password</label><Inp type="password" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} placeholder="••••••••" /></div>
                  <div><label className="mb-1 block text-xs font-semibold text-neutral-500">Confirm New Password</label><Inp type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="••••••••" /></div>
                  <BtnPrimary onClick={() => setMsg({ type: 'ok', text: 'Password change is handled by the admin portal.' })}>Update Password</BtnPrimary>
                  {msg.text && <p className={`text-sm ${msg.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>}
                </div>
                <div className="mt-6 border-t border-neutral-100 pt-5 dark:border-neutral-800">
                  <SectionHdr title="Two-Factor Authentication" />
                  <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">Authenticator App</p>
                      <p className="text-xs text-neutral-400">Add an extra layer of security with TOTP</p>
                    </div>
                    <Pill value="draft" className="text-[11px]">Coming soon</Pill>
                  </div>
                </div>
              </Inner>
            </Card>
          )}

          {tab === 'notifications' && (
            <Card>
              <Inner>
                <SectionHdr title="Email Notifications" />
                <div className="space-y-4">
                  {[
                    { key: 'emailJobs', label: 'Job Assignments', sub: 'Get notified when a new job is assigned to you' },
                    { key: 'emailContracts', label: 'Contract Updates', sub: 'Receive updates on contract status changes' },
                    { key: 'emailPayments', label: 'Payment Alerts', sub: 'Be notified when payments are processed' },
                    { key: 'emailSystem', label: 'System Announcements', sub: 'Platform updates and maintenance notices' },
                  ].map((n) => (
                    <div key={n.key} className="flex items-center justify-between rounded-xl border border-neutral-100 p-4 dark:border-neutral-800">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">{n.label}</p>
                        <p className="text-xs text-neutral-400">{n.sub}</p>
                      </div>
                      <Toggle value={notifPrefs[n.key]} onChange={(v) => setNotifPrefs({ ...notifPrefs, [n.key]: v })} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end"><BtnPrimary onClick={() => setMsg({ type: 'ok', text: 'Preferences saved!' })}>{saving ? 'Saving…' : 'Save Preferences'}</BtnPrimary></div>
                {msg.text && <p className={`mt-2 text-sm ${msg.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>}
              </Inner>
            </Card>
          )}

          {tab === 'privacy' && (
            <Card>
              <Inner>
                <SectionHdr title="Privacy & Visibility" />
                <div className="space-y-4">
                  {[
                    { key: 'showProfile',  label: 'Show Profile to Admins',   sub: 'Allow admin team to view your full profile' },
                    { key: 'showEarnings', label: 'Show Earnings on Profile',  sub: 'Display estimated earnings on your profile card' },
                    { key: 'showOnline',   label: 'Show Online Status',        sub: 'Let others see when you are active' },
                  ].map((p) => (
                    <div key={p.key} className="flex items-center justify-between rounded-xl border border-neutral-100 p-4 dark:border-neutral-800">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">{p.label}</p>
                        <p className="text-xs text-neutral-400">{p.sub}</p>
                      </div>
                      <Toggle value={privacyPrefs[p.key]} onChange={(v) => setPrivacyPrefs({ ...privacyPrefs, [p.key]: v })} />
                    </div>
                  ))}
                </div>
              </Inner>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Support  (new)
// ─────────────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'How do I accept a job?', a: 'Go to the Jobs page, find the job assigned to you, and click "Accept Job". A contract must be created by admin before you can begin work.' },
  { q: 'When can I log time?', a: 'You can log time once you have an active contract. Go to Time Logs and submit your hours, work summary, and deliverable link.' },
  { q: 'How is my payment calculated?', a: 'Payment is calculated from approved time logs multiplied by your contract rate (hourly, daily, or weekly). Visit Payments for a detailed breakdown.' },
  { q: 'How do I generate an invoice?', a: 'Go to Invoices, select an approved time log from the dropdown, and click "Generate Invoice". The invoice will be sent to admin for processing.' },
  { q: 'What is the check-in/check-out system?', a: 'Use Check In when you start your work session and Check Out when you finish. This creates a session record used alongside time logs for verification.' },
  { q: 'How do I update my payment details?', a: 'Go to Profile → Edit Profile → scroll to the Bank Details section and fill in your account information.' },
];

export const OutsourcingSupportPage = () => {
  const [tab, setTab] = useState('ticket');
  const [tickets] = useState([]);
  const [form, setForm] = useState({ subject: '', category: 'general', priority: 'normal', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const submitTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
    setForm({ subject: '', category: 'general', priority: 'normal', description: '' });
  };

  return (
    <div className="space-y-5">
      <PageHdr title="Support" subtitle="Get help, report issues, and find answers" />

      <div className="flex flex-wrap gap-2">
        {[{ key: 'ticket', label: 'Open a Ticket' }, { key: 'my', label: 'My Tickets' }, { key: 'faq', label: 'FAQ' }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === t.key ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ticket' && (
        <Card>
          <Inner>
            <SectionHdr title="Submit a Support Request" />
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="material-symbols-outlined text-5xl text-emerald-500">check_circle</span>
                <p className="text-lg font-semibold text-neutral-900 dark:text-white">Ticket Submitted!</p>
                <p className="text-sm text-neutral-400">Our team will respond within 24 hours.</p>
                <BtnSecondary onClick={() => setSubmitted(false)}>Submit Another</BtnSecondary>
              </div>
            ) : (
              <form className="space-y-4 max-w-lg" onSubmit={submitTicket}>
                <div><label className="mb-1 block text-xs font-semibold text-neutral-500">Subject</label><Inp placeholder="Brief description of your issue" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="mb-1 block text-xs font-semibold text-neutral-500">Category</label>
                    <Sel value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      <option value="general">General</option>
                      <option value="payment">Payment Issue</option>
                      <option value="job">Job / Contract</option>
                      <option value="technical">Technical Problem</option>
                      <option value="account">Account Access</option>
                    </Sel>
                  </div>
                  <div><label className="mb-1 block text-xs font-semibold text-neutral-500">Priority</label>
                    <Sel value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </Sel>
                  </div>
                </div>
                <div><label className="mb-1 block text-xs font-semibold text-neutral-500">Description</label><Txa rows={5} placeholder="Describe your issue in detail…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
                <BtnPrimary type="submit" disabled={submitting} className="w-full">{submitting ? 'Submitting…' : 'Submit Ticket'}</BtnPrimary>
              </form>
            )}
          </Inner>
        </Card>
      )}

      {tab === 'my' && (
        <Card>
          <Inner>
            <SectionHdr title="My Support Tickets" />
            {tickets.length === 0 ? (
              <EmptyState icon="support_agent" title="No tickets yet" subtitle="Submit a ticket from the 'Open a Ticket' tab." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                      {['Ticket ID', 'Subject', 'Category', 'Status', 'Created'].map((h) => (
                        <th key={h} className="pb-2.5 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t.id} className="border-b border-neutral-50 dark:border-neutral-900">
                        <td className="py-3 pr-6 font-mono text-xs">{t.id}</td>
                        <td className="py-3 pr-6 font-medium">{t.subject}</td>
                        <td className="py-3 pr-6">{t.category}</td>
                        <td className="py-3 pr-6"><Pill value={t.status} /></td>
                        <td className="py-3 pr-6 text-neutral-400">{t.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Inner>
        </Card>
      )}

      {tab === 'faq' && (
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <Card key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-5"
              >
                <p className="text-left text-sm font-semibold text-neutral-900 dark:text-white">{item.q}</p>
                <span className={`material-symbols-outlined shrink-0 text-xl text-neutral-400 transition ${openFaq === i ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              {openFaq === i && (
                <div className="border-t border-neutral-100 px-5 pb-5 pt-3 dark:border-neutral-800">
                  <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{item.a}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
