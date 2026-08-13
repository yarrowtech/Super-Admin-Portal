import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { outsourcingApi } from '../../services/outsourcing';
import { useOutsourcingSocket } from '../../hooks/useOutsourcingSocket';
import FreelancerDashboard from './FreelancerDashboard';
import ThemeToggleButton from '../common/ThemeToggleButton';
import { computeProfileCompletion } from '../../utils/outsourcingProfile';

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

const OutsourcingPageHdr = ({ title, subtitle, icon = 'dashboard', accent = '#6366f1', action }) => (
  <header className="mb-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
    <div className="h-1 w-full" style={{ background: accent }} />
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm" style={{ background: accent }}>
          <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
        </div>
        <div>
          <h1 className="text-[17px] font-black leading-tight text-neutral-900 dark:text-neutral-100">{title}</h1>
          {subtitle && <p className="text-[12px] text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <ThemeToggleButton />
      </div>
    </div>
  </header>
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
      <OutsourcingPageHdr title="Outsourcing Dashboard" subtitle="Jobs, contracts, and work logs overview" icon="dashboard" accent="#6366f1" />
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
  const [confirmId, setConfirmId] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
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
  useOutsourcingSocket(token, user, useCallback(() => load({ silent: true }), [load]));

  const activeContractJobIds = useMemo(
    () => new Set(contracts.filter((c) => c.status === 'active').map((c) => String(c?.job?._id || c?.job || '')).filter(Boolean)),
    [contracts]
  );

  const jobRateMap = useMemo(() => {
    const map = new Map();
    contracts.forEach((c) => {
      const jId = String(c?.job?._id || c?.job || '');
      if (jId) map.set(jId, { rate: Number(c.rate || 0), paymentType: c.paymentType || 'fixed' });
    });
    return map;
  }, [contracts]);

  const filtered = useMemo(() => {
    const n = new Date();
    let r = rows;
    if (statusFilter === 'working')   r = r.filter((x) => x.status === 'in_progress');
    else if (statusFilter === 'submitted') r = r.filter((x) => x.status === 'completed');
    else if (statusFilter === 'following') r = r.filter((x) => x.acceptanceStatus === 'accepted' && x.status !== 'in_progress' && x.status !== 'completed');
    else if (statusFilter === 'overdue')   r = r.filter((x) => x.status === 'rejected' || (x.dueDate && new Date(x.dueDate) < n && x.status !== 'completed'));
    const q = query.trim().toLowerCase();
    if (q) r = r.filter((x) => `${x.title} ${x.description || ''}`.toLowerCase().includes(q));
    if (sortBy === 'due-asc') r = [...r].sort((a, b) => (a.dueDate ? new Date(a.dueDate) : Infinity) - (b.dueDate ? new Date(b.dueDate) : Infinity));
    else if (sortBy === 'due-desc') r = [...r].sort((a, b) => (b.dueDate ? new Date(b.dueDate) : -Infinity) - (a.dueDate ? new Date(a.dueDate) : -Infinity));
    else if (sortBy === 'newest') r = [...r].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sortBy === 'oldest') r = [...r].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return r;
  }, [rows, query, statusFilter, sortBy]);

  const doAccept = async (id) => {
    try { setBusyId(id); await outsourcingApi.acceptJob(token, id); await load({ silent: true }); } catch (e) { setError(e.message); } finally { setBusyId(''); }
  };
  const doStatus = async (id, s) => {
    try { setBusyId(id); await outsourcingApi.updateJobStatus(token, id, s); await load({ silent: true }); } catch (e) { setError(e.message); } finally { setBusyId(''); }
  };

  const tabCounts = useMemo(() => {
    const n = new Date();
    return {
      all: rows.length,
      working:   rows.filter((r) => r.status === 'in_progress').length,
      submitted: rows.filter((r) => r.status === 'completed').length,
      following: rows.filter((r) => r.acceptanceStatus === 'accepted' && r.status !== 'in_progress' && r.status !== 'completed').length,
      overdue:   rows.filter((r) => r.status === 'rejected' || (r.dueDate && new Date(r.dueDate) < n && r.status !== 'completed')).length,
    };
  }, [rows]);

  const idNum = (id) => { let h = 0; const s = String(id || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffff; return (h % 14) + 2; };

  const tabs = [
    { key: 'overdue', label: 'Overdue' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'following', label: 'Following' },
    { key: 'working', label: 'Working' },
    { key: 'all', label: 'All' },
  ];

  const jobStatCards = [
    { icon: 'work',        label: 'Total Jobs',  count: tabCounts.all,       accent: '#6366f1' },
    { icon: 'play_circle', label: 'Working',     count: tabCounts.working,   accent: '#3b82f6' },
    { icon: 'task_alt',    label: 'Submitted',   count: tabCounts.submitted, accent: '#10b981' },
    { icon: 'bookmark',    label: 'Following',   count: tabCounts.following, accent: '#8b5cf6' },
    { icon: 'warning',     label: 'Overdue',     count: tabCounts.overdue,   accent: '#ef4444' },
  ];

  return (
    <div className="space-y-4">
      <OutsourcingPageHdr title="Jobs" subtitle="View, accept, and track job assignments" icon="work" accent="#3b82f6" />
      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {jobStatCards.map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: s.accent }} />
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${s.accent}18` }}>
                <span className="material-symbols-outlined text-[19px]" style={{ color: s.accent }}>{s.icon}</span>
              </div>
              {loading
                ? <div className="h-7 w-10 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
                : <span className="text-2xl font-black text-neutral-900 dark:text-white">{s.count}</span>}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => {
            const active = statusFilter === t.key;
            const count = tabCounts[t.key] ?? 0;
            return (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'border-indigo-500 text-neutral-900 dark:border-indigo-400 dark:text-white'
                    : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-600'
                }`}
              >
                <span className={`text-xs font-bold tabular-nums ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 dark:text-neutral-500'}`}>{count}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <span className="material-symbols-outlined text-[18px] text-neutral-400">search</span>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs…"
              className="h-9 w-44 rounded-full border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 rounded-full border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 focus:border-indigo-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="due-asc">Due date ↑</option>
            <option value="due-desc">Due date ↓</option>
          </select>
          <button className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? <Skeleton rows={5} /> : filtered.length === 0 ? (
        <Card><Inner><EmptyState icon="work" title="No jobs found" subtitle="Try adjusting your filters." /></Inner></Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          {/* Column headers */}
          <div className="grid items-center border-b border-neutral-100 px-5 py-3 dark:border-neutral-800" style={{ gridTemplateColumns: '1fr 140px 260px' }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Client</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Price</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Status</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-neutral-50 dark:divide-neutral-900">
            {filtered.map((r) => {
              const contract = jobRateMap.get(String(r._id));
              const hasContract = activeContractJobIds.has(String(r._id));
              const isAssigned = r?.assignedFreelancer?._id === user?._id;
              const canAccept = user?.role !== 'admin' && r.acceptanceStatus !== 'accepted' && (!r?.assignedFreelancer || isAssigned);
              const canUpdate = user?.role !== 'admin' && isAssigned && r.acceptanceStatus === 'accepted';

              const statusLabel = r.status === 'in_progress' ? 'Working' : r.status === 'completed' ? 'Submitted' : r.status === 'rejected' ? 'Overdue' : r.status.replace(/_/g, ' ');
              const statusColor = r.status === 'in_progress' ? 'text-indigo-600 dark:text-indigo-400' : r.status === 'completed' ? 'text-amber-600 dark:text-amber-400' : r.status === 'rejected' ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-500 dark:text-neutral-400';

              const now = new Date();
              const dueDate = r.dueDate ? new Date(r.dueDate) : null;
              const isOverdue = dueDate && dueDate < now && r.status !== 'completed';
              const isDueSoon = dueDate && !isOverdue && dueDate < new Date(now.getTime() + 48 * 3600000) && r.status !== 'completed';
              const daysLeft = dueDate ? Math.ceil((dueDate - now) / 86400000) : null;

              return (
                <div key={r._id} className={`grid items-start px-5 py-4 transition hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40 ${isOverdue ? 'border-l-2 border-rose-500' : isDueSoon ? 'border-l-2 border-amber-400' : ''}`} style={{ gridTemplateColumns: '1fr 140px 260px' }}>
                  {/* Client / title */}
                  <div className="min-w-0 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => setSelectedJob(r)} className="text-left font-semibold text-neutral-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">{r.title}</button>
                      <span className="flex items-center gap-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                        <span className="material-symbols-outlined text-[14px]">chat_bubble_outline</span>
                        {idNum(r._id)}
                      </span>
                      {isOverdue && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                          <span className="material-symbols-outlined text-[10px]">warning</span>Overdue
                        </span>
                      )}
                      {isDueSoon && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                          <span className="material-symbols-outlined text-[10px]">alarm</span>Due in {daysLeft}d
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-neutral-400 dark:text-neutral-500">
                      {r.description || `Assigned by ${r?.createdBy?.email || 'Admin'}`}
                    </p>
                    {(canAccept || canUpdate) && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {canAccept && (
                          <button onClick={() => setConfirmId(r._id)} disabled={busyId === r._id} className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600">
                            Accept
                          </button>
                        )}
                        {canUpdate && !hasContract && <span className="text-[11px] text-amber-600 dark:text-amber-400">Awaiting contract</span>}
                        {canUpdate && hasContract && r.status !== 'in_progress' && r.status !== 'completed' && (
                          <button onClick={() => doStatus(r._id, 'in_progress')} disabled={busyId === r._id} className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                            Start Work
                          </button>
                        )}
                        {canUpdate && hasContract && r.status !== 'completed' && (
                          <button onClick={() => doStatus(r._id, 'completed')} disabled={busyId === r._id} className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300">
                            {busyId === r._id ? 'Updating…' : 'Mark Done'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="pt-0.5">
                    {contract?.rate ? (
                      <p className="flex items-center gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        <span className="text-neutral-400">₹</span>
                        {contract.rate.toLocaleString('en-IN')}
                      </p>
                    ) : (
                      <span className="text-sm text-neutral-300 dark:text-neutral-600">—</span>
                    )}
                  </div>

                  {/* Status pills */}
                  <div className="flex flex-wrap items-start gap-1.5 pt-0.5">
                    {r.acceptanceStatus && r.acceptanceStatus !== 'pending' && (
                      <span className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs font-medium capitalize text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
                        {r.acceptanceStatus.replace(/_/g, ' ')}
                      </span>
                    )}
                    {contract?.paymentType && (
                      <span className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs font-medium capitalize text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
                        {contract.paymentType}
                      </span>
                    )}
                    <span className={`text-xs font-semibold capitalize ${statusColor}`}>{statusLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Job detail slide-over */}
      {selectedJob && (() => {
        const j = selectedJob;
        const now = new Date();
        const dueDate = j.dueDate ? new Date(j.dueDate) : null;
        const isOverdue = dueDate && dueDate < now && j.status !== 'completed';
        const daysLeft = dueDate ? Math.ceil((dueDate - now) / 86400000) : null;
        const contract = jobRateMap.get(String(j._id));
        return (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setSelectedJob(null)}>
            <div className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl dark:bg-neutral-950" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className={`h-1 w-full ${isOverdue ? 'bg-rose-500' : daysLeft !== null && daysLeft <= 2 ? 'bg-amber-400' : 'bg-indigo-600'}`} />
              <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">{j.title}</h3>
                  <p className="text-xs text-neutral-400">Job #{String(j._id).slice(-8).toUpperCase()}</p>
                </div>
                <button onClick={() => setSelectedJob(null)} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <span className="material-symbols-outlined text-[20px] text-neutral-500">close</span>
                </button>
              </div>
              {/* Body */}
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {/* Status hero */}
                <div className="flex flex-wrap items-center gap-2">
                  <Pill value={j.status} />
                  {j.acceptanceStatus && <Pill value={j.acceptanceStatus} />}
                  {isOverdue && <Pill value="overdue" />}
                  {contract && <Pill value={contract.paymentType || 'fixed'} />}
                </div>

                {/* Description */}
                {j.description && (
                  <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400">Description</p>
                    <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{j.description}</p>
                  </div>
                )}

                {/* Details grid */}
                {[
                  { label: 'Assigned To', value: j?.assignedFreelancer?.email || 'Unassigned' },
                  { label: 'Created By', value: j?.createdBy?.email || 'Admin' },
                  contract && { label: 'Rate', value: `₹${Number(contract.rate || 0).toLocaleString('en-IN')} (${contract.paymentType})` },
                  { label: 'Due Date', value: dueDate ? dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                  dueDate && { label: 'Days Remaining', value: isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left` },
                  { label: 'Created', value: j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                ].filter(Boolean).map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-2.5 dark:bg-neutral-900">
                    <span className="text-xs text-neutral-400">{row.label}</span>
                    <span className={`text-sm font-semibold ${row.label === 'Days Remaining' && isOverdue ? 'text-rose-600 dark:text-rose-400' : row.label === 'Days Remaining' && daysLeft <= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-800 dark:text-neutral-100'}`}>{row.value}</span>
                  </div>
                ))}

                {/* Due date progress bar */}
                {j.createdAt && dueDate && (
                  <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Timeline</p>
                      <p className="text-xs text-neutral-400">{isOverdue ? 'Past deadline' : `${daysLeft}d remaining`}</p>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                      <div
                        className={`h-full rounded-full transition-all ${isOverdue ? 'bg-rose-500' : daysLeft <= 2 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(100, Math.max(0, isOverdue ? 100 : (1 - daysLeft / Math.max(1, Math.ceil((dueDate - new Date(j.createdAt)) / 86400000))) * 100))}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
                      <span>{new Date(j.createdAt).toLocaleDateString('en-IN')}</span>
                      <span>{dueDate.toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                )}
              </div>
              {/* Footer */}
              <div className="border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
                <button onClick={() => setSelectedJob(null)} className="w-full rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Accept confirmation dialog */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/30">
                <span className="material-symbols-outlined text-[22px] text-blue-600">work</span>
              </div>
              <h3 className="mb-1.5 text-base font-bold text-neutral-900 dark:text-white">Accept this job?</h3>
              <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                By accepting, you commit to taking on this assignment. You'll be expected to start working once a contract is issued.
              </p>
            </div>
            <div className="flex gap-2 border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
              <button onClick={() => setConfirmId(null)} className="flex-1 rounded-xl border border-neutral-200 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                Cancel
              </button>
              <button
                onClick={() => { doAccept(confirmId); setConfirmId(null); }}
                className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Yes, Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────────────────────────────────────
export const OutsourcingContractsPage = () => {
  const { token, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadContracts = useCallback(() =>
    outsourcingApi.getContracts(token).then((r) => setRows(r.data || [])).catch((e) => setError(e.message || 'Failed to load contracts')),
  [token]);

  useEffect(() => { loadContracts().finally(() => setLoading(false)); }, [loadContracts]);
  useOutsourcingSocket(token, user, useCallback(() => loadContracts(), [loadContracts]));

  const active = rows.filter((r) => r.status === 'active').length;
  const totalValue = rows.reduce((s, r) => s + Number(r.rate || 0), 0);

  return (
    <div className="space-y-5">
      <OutsourcingPageHdr title="Contracts" subtitle="Payment terms, rates, and resource assignments" icon="contract" accent="#10b981" />
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
                <button onClick={() => setSelected(r)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                  <span className="material-symbols-outlined text-[15px]">open_in_full</span>
                  View Full Details
                </button>
              </Inner>
            </Card>
          ))}
        </div>
      )}

      {/* Contract detail slide-over */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl dark:bg-neutral-950" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">{selected?.job?.title || 'Contract Details'}</h3>
                <p className="text-xs text-neutral-400">Contract #{String(selected._id).slice(-8).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined text-[20px] text-neutral-500">close</span>
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Status + rate hero */}
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-400">Contract Rate</p>
                    <p className="text-3xl font-black text-neutral-900 dark:text-white">₹{Number(selected.rate || 0).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{selected.currency || 'INR'} · {selected.paymentType || 'fixed'}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${selected.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : selected.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                    {(selected.status || 'unknown').charAt(0).toUpperCase() + selected.status.slice(1)}
                  </span>
                </div>
              </div>
              {/* Details */}
              {[
                { label: 'Job Title', value: selected?.job?.title || '—' },
                { label: 'Payment Type', value: selected.paymentType || '—' },
                { label: 'Created By', value: selected?.createdBy?.email || 'Admin' },
                { label: 'Assigned Worker', value: selected?.freelancer?.email || 'Not assigned' },
                { label: 'Law Status', value: selected.lawStatus || '—' },
                { label: 'Start Date', value: selected.startDate ? new Date(selected.startDate).toLocaleDateString('en-IN') : '—' },
                { label: 'End Date', value: selected.endDate ? new Date(selected.endDate).toLocaleDateString('en-IN') : '—' },
                { label: 'Created', value: selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-2.5 dark:bg-neutral-900">
                  <span className="text-xs text-neutral-400">{row.label}</span>
                  <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{row.value}</span>
                </div>
              ))}
              {selected.terms && (
                <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">Contract Terms</p>
                  <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{selected.terms}</p>
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
              <button onClick={() => setSelected(null)} className="w-full rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300">
                Close
              </button>
            </div>
          </div>
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
  const [editingLog, setEditingLog] = useState(null);
  const [logFilter, setLogFilter] = useState({ month: '', status: 'all' });
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
  useOutsourcingSocket(token, user, useCallback(() => { loadLogs(); loadSessions(); }, [loadLogs, loadSessions]));

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
      if (editingLog) {
        await outsourcingApi.updateTimeLog(token, editingLog._id, { ...form, hours: Number(form.hours) });
        setEditingLog(null);
      } else {
        await outsourcingApi.logTime(token, { ...form, hours: Number(form.hours) });
      }
      setForm({ contractId: '', logDate: '', hours: '', workSummary: '', deliverableUrl: '', note: '', workStatus: 'in_progress' });
      setShowForm(false);
      await loadLogs();
    } finally { setSubmitting(false); }
  };

  const startEdit = (log) => {
    setEditingLog(log);
    setForm({
      contractId: String(log.contract?._id || log.contract || ''),
      logDate: log.logDate ? new Date(log.logDate).toISOString().slice(0, 10) : '',
      hours: String(log.hours || ''),
      workSummary: log.workSummary || '',
      deliverableUrl: log.deliverableUrl || '',
      note: log.note || '',
      workStatus: log.workStatus || 'in_progress',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalHours = useMemo(() => rows.reduce((s, r) => s + Number(r.hours || 0), 0).toFixed(1), [rows]);
  const approvedCount = useMemo(() => rows.filter((r) => r.verificationStatus === 'approved').length, [rows]);

  const filteredRows = useMemo(() => {
    let r = rows;
    if (logFilter.status !== 'all') r = r.filter((x) => x.verificationStatus === logFilter.status);
    if (logFilter.month) {
      const [y, m] = logFilter.month.split('-').map(Number);
      r = r.filter((x) => { const d = new Date(x.logDate); return d.getFullYear() === y && d.getMonth() + 1 === m; });
    }
    return r;
  }, [rows, logFilter]);

  return (
    <div className="space-y-5">
      <OutsourcingPageHdr
        title="Time Logs"
        subtitle="Submit, review, and verify work effort records"
        icon="schedule"
        accent="#8b5cf6"
        action={isWorker && <BtnPrimary onClick={() => { setShowForm((v) => !v); if (showForm) { setEditingLog(null); setForm({ contractId: '', logDate: '', hours: '', workSummary: '', deliverableUrl: '', note: '', workStatus: 'in_progress' }); } }}>{showForm ? (editingLog ? 'Cancel Edit' : 'Cancel') : 'Log Time'}</BtnPrimary>}
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
            <SectionHdr title={editingLog ? 'Edit Time Log' : 'Submit Work Update'} />
            <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={submitLog}>
              <Sel value={form.contractId} onChange={(e) => setForm({ ...form, contractId: e.target.value })} required disabled={!!editingLog}>
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
              <BtnPrimary disabled={submitting} className="md:col-span-2 w-full">{submitting ? (editingLog ? 'Saving…' : 'Submitting…') : (editingLog ? 'Save Changes' : 'Submit Log')}</BtnPrimary>
            </form>
          </Inner>
        </Card>
      )}

      {/* Log history */}
      <Card>
        <Inner>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SectionHdr title="Time Log History" />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                value={logFilter.month}
                onChange={(e) => setLogFilter((f) => ({ ...f, month: e.target.value }))}
                className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs text-neutral-600 focus:border-indigo-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              />
              <select
                value={logFilter.status}
                onChange={(e) => setLogFilter((f) => ({ ...f, status: e.target.value }))}
                className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs text-neutral-600 focus:border-indigo-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              >
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              {(logFilter.month || logFilter.status !== 'all') && (
                <button onClick={() => setLogFilter({ month: '', status: 'all' })} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">Clear</button>
              )}
            </div>
          </div>
          {loading ? <Skeleton rows={4} /> : rows.length === 0 ? (
            <EmptyState icon="schedule" title="No time logs yet" subtitle="Submit a log entry once contracts are active." />
          ) : filteredRows.length === 0 ? (
            <EmptyState icon="filter_list" title="No logs match your filters" subtitle="Try changing the month or status filter." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800">
                    {['Date', 'Project', 'Hours', 'Status', 'Verification', ''].map((h) => (
                      <th key={h} className="pb-2.5 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-900">
                  {filteredRows.map((r) => (
                    <tr key={r._id} className="align-middle">
                      <td className="py-3 pr-6 text-neutral-600 dark:text-neutral-300">{r.logDate ? new Date(r.logDate).toLocaleDateString() : '—'}</td>
                      <td className="py-3 pr-6 font-medium text-neutral-900 dark:text-white">{r?.job?.title || 'Untitled'}</td>
                      <td className="py-3 pr-6 text-neutral-600 dark:text-neutral-300">{r.hours}h</td>
                      <td className="py-3 pr-6"><Pill value={r.workStatus || 'in_progress'} /></td>
                      <td className="py-3 pr-6"><Pill value={r.verificationStatus} /></td>
                      <td className="py-3">
                        {isWorker && r.verificationStatus === 'pending' && (
                          <button onClick={() => startEdit(r)} className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-semibold text-neutral-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-indigo-600 dark:hover:text-indigo-400">
                            <span className="material-symbols-outlined text-[13px]">edit</span>
                            Edit
                          </button>
                        )}
                      </td>
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
// Profile
// ─────────────────────────────────────────────────────────────────────────────
const defaultForm = () => ({
  firstName: '', lastName: '', phone: '', title: '', bio: '',
  city: '', country: '', timezone: '', hourlyRate: '', availability: '', skillsCsv: '',
  accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '', accountType: '',
  upiId: '', paypalEmail: '',
  entityType: 'individual', businessName: '', website: '', foundedYear: '', teamSize: '', teamMembers: [],
});

const DocUploadCard = ({ label, icon, docType, currentUrl, currentName, token, onDone }) => {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr('');
    try {
      const res = await outsourcingApi.uploadProfileDocument(token, file, docType);
      onDone(docType, res.data);
    } catch (ex) { setErr(ex.message || 'Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const accept = docType === 'avatar' ? 'image/*' : '.pdf,.jpg,.jpeg,.png,.doc,.docx';
  const uploaded = Boolean(currentUrl);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/30">
          <span className="material-symbols-outlined text-[20px] text-indigo-600">{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">{label}</p>
          {uploaded
            ? <p className="truncate text-xs text-emerald-600 dark:text-emerald-400">✓ {currentName || 'Uploaded'}</p>
            : <p className="text-xs text-neutral-400">No file uploaded</p>}
        </div>
        {uploaded && (
          <a href={currentUrl} target="_blank" rel="noreferrer"
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800">
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </a>
        )}
      </div>
      {err && <p className="mb-2 text-xs text-rose-500">{err}</p>}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 py-2.5 text-sm font-semibold text-indigo-600 transition hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/20"
      >
        <span className="material-symbols-outlined text-[17px]">{uploading ? 'hourglass_top' : uploaded ? 'upload' : 'cloud_upload'}</span>
        {uploading ? 'Uploading…' : uploaded ? 'Replace' : 'Upload'}
      </button>
    </div>
  );
};

export const OutsourcingProfilePage = () => {
  const { token, user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editTab, setEditTab] = useState('personal');
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [docs, setDocs] = useState({});

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
      setDocs(m.documents || {});
      setForm({
        firstName: prof.firstName || '', lastName: prof.lastName || '',
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
        entityType: m.entityType || 'individual',
        businessName: m.businessName || '',
        website: m.website || '',
        foundedYear: m.foundedYear || '',
        teamSize: m.teamSize || '',
        teamMembers: Array.isArray(m.teamMembers) ? m.teamMembers : [],
      });
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const fld = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveProfile = async () => {
    try {
      setSaving(true); setMsg('');
      await outsourcingApi.updateMyProfile(token, {
        firstName: form.firstName, lastName: form.lastName, phone: form.phone,
        title: form.title, bio: form.bio, city: form.city, country: form.country,
        timezone: form.timezone, hourlyRate: Number(form.hourlyRate) || 0,
        availability: form.availability,
        skills: form.skillsCsv.split(',').map((s) => s.trim()).filter(Boolean),
        bankDetails: { accountHolderName: form.accountHolderName, bankName: form.bankName, accountNumber: form.accountNumber, ifscCode: form.ifscCode, accountType: form.accountType },
        paymentInfo: { upiId: form.upiId, paypalEmail: form.paypalEmail },
        entityType: form.entityType,
        businessName: form.businessName,
        website: form.website,
        foundedYear: form.foundedYear === '' ? undefined : Number(form.foundedYear) || 0,
        teamSize: form.teamSize === '' ? undefined : Number(form.teamSize) || 0,
        teamMembers: form.teamMembers,
      });
      setMsg('Saved!');
      await load();
    } catch (e) { setMsg(e.message || 'Failed to save'); } finally { setSaving(false); }
  };

  const handleDocDone = (docType, data) => {
    if (docType === 'avatar') {
      setProfile((p) => ({ ...p, metadata: { ...(p?.metadata || {}), avatar: data.url } }));
    } else {
      setDocs((d) => ({ ...d, [docType]: { url: data.url, fileName: data.fileName } }));
    }
  };

  const m = profile?.metadata || {};
  const skills = m.skills || [];
  const totalHours = logs.reduce((s, l) => s + Number(l.hours || 0), 0).toFixed(0);
  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const activeContracts = contracts.filter((c) => c.status === 'active').length;
  const activeProjects = jobs.filter((j) => j.status === 'in_progress' || j.status === 'accepted').length;
  const teamMembers = Array.isArray(m.teamMembers) ? m.teamMembers : [];

  // entityType drives which flavor of the profile renders below. Missing/
  // unrecognized values fall back to 'individual' so every existing
  // freelancer account (which has never set this field) renders exactly
  // the same UI it always has.
  const entityType = m.entityType || 'individual';
  const isOrg = entityType === 'team' || entityType === 'agency';
  const isAgency = entityType === 'agency';

  const displayName = (isOrg && m.businessName)
    ? m.businessName
    : (`${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || authUser?.email || 'Freelancer');
  const bg = avatarBg(displayName);
  const avatarUrl = m.avatar;

  const completion = computeProfileCompletion(profile);

  // Tabs are derived from form.entityType (the in-progress edit value), not
  // the last-saved profile, so switching type in the modal immediately
  // reveals the right tabs before Save is clicked.
  const editEntityType = form.entityType || 'individual';
  const editIsOrg = editEntityType === 'team' || editEntityType === 'agency';
  const EDIT_TABS = editIsOrg
    ? [
        { id: 'personal', label: editEntityType === 'agency' ? 'Agency Info' : 'Team Info', icon: 'person' },
        { id: 'team',     label: 'Team Members',   icon: 'groups' },
        { id: 'bank',     label: 'Bank & Payment', icon: 'account_balance' },
        { id: 'docs',     label: 'Documents',      icon: 'folder_open' },
      ]
    : [
        { id: 'personal', label: 'Personal Info', icon: 'person' },
        { id: 'bank',     label: 'Bank & Payment', icon: 'account_balance' },
        { id: 'docs',     label: 'Documents',      icon: 'folder_open' },
      ];

  if (loading) return <Skeleton rows={6} />;

  return (
    <div className="space-y-5">
      <OutsourcingPageHdr title="Profile" subtitle="Your professional profile and payment details" icon="person" accent="#6366f1"
        action={<BtnPrimary onClick={() => { setEditTab('personal'); setEditOpen(true); }}><span className="flex items-center gap-2"><span className="material-symbols-outlined text-base">edit</span>Edit Profile</span></BtnPrimary>}
      />

      {/* Hero card */}
      <Card>
        <div className="h-28 rounded-t-2xl bg-linear-to-r from-violet-600 via-indigo-600 to-blue-500" />
        <Inner className="-mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              {/* Avatar */}
              <div className="relative">
                {avatarUrl
                  ? <img src={avatarUrl} alt={displayName} className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-lg dark:border-neutral-950" />
                  : <div className={`flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white text-3xl font-bold text-white shadow-lg dark:border-neutral-950 ${bg}`}>{initials(profile || authUser)}</div>
                }
                <button
                  onClick={() => { setEditTab('docs'); setEditOpen(true); }}
                  className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow dark:border-neutral-950"
                  title="Change photo"
                >
                  <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                </button>
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{displayName}</h2>
                  {isOrg && <Pill value={entityType} />}
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{m.title || (isAgency ? 'Agency' : isOrg ? 'Team' : 'Freelancer')}</p>
                {(m.city || m.country) && (
                  <p className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    {[m.city, m.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {isOrg ? (
          <>
            <StatCard icon="work" label="Total Projects" value={jobs.length} accentIcon="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
            <StatCard icon="bolt" label="Active Projects" value={activeProjects} accentIcon="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" />
            <StatCard icon="task_alt" label="Completed Projects" value={completedJobs} accentIcon="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
            <StatCard icon="handshake" label="Active Contracts" value={activeContracts} accentIcon="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
            <StatCard icon="groups" label="Team Members" value={teamMembers.length} accentIcon="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" />
          </>
        ) : (
          <>
            <StatCard icon="work" label="Total Jobs" value={jobs.length} accentIcon="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
            <StatCard icon="schedule" label="Hours Logged" value={`${totalHours}h`} accentIcon="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" />
            <StatCard icon="handshake" label="Active Contracts" value={activeContracts} accentIcon="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
            <StatCard icon="task_alt" label="Completed Jobs" value={completedJobs} accentIcon="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Contact */}
        <Card>
          <Inner>
            <SectionHdr title="Contact Info" />
            <div className="space-y-3 text-sm">
              {(isOrg ? [
                { icon: 'email', label: 'Email', value: profile?.email },
                { icon: 'phone', label: 'Phone', value: m.phone || '—' },
                { icon: 'location_on', label: 'Location', value: [m.city, m.country].filter(Boolean).join(', ') || '—' },
                { icon: 'language', label: 'Website', value: m.website || 'No website added' },
              ] : [
                { icon: 'email', label: 'Email', value: profile?.email },
                { icon: 'phone', label: 'Phone', value: m.phone || '—' },
                { icon: 'public', label: 'Timezone', value: m.timezone || '—' },
                { icon: 'schedule', label: 'Availability', value: m.availability || '—' },
                { icon: 'currency_rupee', label: 'Hourly Rate', value: m.hourlyRate ? `₹${m.hourlyRate}/hr` : '—' },
              ]).map((r) => (
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
            <SectionHdr title={isAgency ? 'About Agency' : isOrg ? 'About Team' : 'Skills & Bio'} />
            {m.bio && <p className="mb-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{m.bio}</p>}
            {skills.length > 0
              ? <div className="flex flex-wrap gap-2">{skills.map((s) => <span key={s} className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">{s}</span>)}</div>
              : <p className="text-sm text-neutral-400">{isOrg ? 'No services added.' : 'No skills listed.'}</p>}
          </Inner>
        </Card>

        {/* Payment */}
        <Card>
          <Inner>
            <SectionHdr title={isAgency ? 'Business & Payment Details' : isOrg ? 'Team Payment Details' : 'Payment Details'} />
            <div className="space-y-2 text-sm">
              {[
                { label: 'Account Holder', value: m.bankDetails?.accountHolderName || '—' },
                { label: 'Bank', value: m.bankDetails?.bankName || '—' },
                { label: 'Account No.', value: m.bankDetails?.accountNumber ? `••••${String(m.bankDetails.accountNumber).slice(-4)}` : '—' },
                { label: 'IFSC', value: m.bankDetails?.ifscCode || '—' },
                { label: 'UPI ID', value: m.paymentInfo?.upiId || '—' },
                { label: 'PayPal', value: m.paymentInfo?.paypalEmail || '—' },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
                  <span className="text-xs text-neutral-400">{r.label}</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">{r.value}</span>
                </div>
              ))}
            </div>
          </Inner>
        </Card>

        {isOrg && (
          <Card>
            <Inner>
              <SectionHdr title={isAgency ? 'Agency Details' : 'Team Details'} />
              <div className="space-y-2 text-sm">
                {[
                  { label: isAgency ? 'Agency Type' : 'Team Type', value: m.title || '—' },
                  { label: 'Team Size', value: m.teamSize || 'Size not specified' },
                  { label: 'Location', value: [m.city, m.country].filter(Boolean).join(', ') || '—' },
                  { label: 'Founded', value: m.foundedYear || 'Not specified' },
                  { label: 'Primary Contact', value: profile?.email || '—' },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
                    <span className="text-xs text-neutral-400">{r.label}</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-100">{r.value}</span>
                  </div>
                ))}
              </div>
            </Inner>
          </Card>
        )}

        {isOrg && (
          <Card>
            <Inner>
              <div className="mb-3 flex items-center justify-between">
                <SectionHdr title="Team Members" />
                <button onClick={() => { setEditTab('team'); setEditOpen(true); }} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Manage Team →</button>
              </div>
              {teamMembers.length === 0 ? (
                <p className="text-sm text-neutral-400">No team members added.</p>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map((tm, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5 dark:border-neutral-800">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarBg(tm.name || String(i))}`}>
                        {(tm.name || '?').trim().charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{tm.name || 'Unnamed'}</p>
                        <p className="truncate text-xs text-neutral-400">{tm.role || 'No role specified'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Inner>
          </Card>
        )}
      </div>

      {/* Documents section */}
      <Card>
        <Inner>
          <div className="mb-4 flex items-center justify-between">
            <SectionHdr title={isOrg ? 'Business Documents' : 'My Documents'} />
            <button onClick={() => { setEditTab('docs'); setEditOpen(true); }} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Manage →</button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(isOrg ? [
              { key: 'avatar', label: 'Logo', icon: 'account_circle' },
              { key: 'bankStatement', label: 'Bank Statement', icon: 'account_balance' },
              { key: 'companyRegistration', label: 'Company Registration', icon: 'gavel' },
              { key: 'gstDocument', label: 'GST / Tax Document', icon: 'receipt_long' },
              { key: 'businessCertificate', label: 'Business Certificate', icon: 'workspace_premium' },
              { key: 'portfolio', label: 'Portfolio', icon: 'photo_library' },
              { key: 'certifications', label: 'Certifications', icon: 'verified' },
            ] : [
              { key: 'avatar', label: 'Profile Photo', icon: 'account_circle' },
              { key: 'cv', label: 'CV / Resume', icon: 'description' },
              { key: 'bankStatement', label: 'Bank Statement', icon: 'account_balance' },
            ]).map((d) => {
              const docData = d.key === 'avatar' ? { url: m.avatar } : docs[d.key];
              return (
                <div key={d.key} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${docData?.url ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                    <span className={`material-symbols-outlined text-[18px] ${docData?.url ? 'text-emerald-600' : 'text-neutral-400'}`}>{d.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{d.label}</p>
                    {docData?.url
                      ? <a href={docData.url} target="_blank" rel="noreferrer" className="truncate text-[11px] text-emerald-600 hover:underline">View document</a>
                      : <p className="text-[11px] text-neutral-400">Not uploaded</p>}
                  </div>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${docData?.url ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                </div>
              );
            })}
          </div>
        </Inner>
      </Card>

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white dark:bg-neutral-950 sm:rounded-2xl">
            {/* Modal header */}
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/30">
                  <span className="material-symbols-outlined text-[18px] text-indigo-600">manage_accounts</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">Edit Profile</h3>
                  <p className="text-xs text-neutral-400">{displayName}</p>
                </div>
              </div>
              <button onClick={() => setEditOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined text-[20px] text-neutral-500">close</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0 gap-1 border-b border-neutral-100 px-6 dark:border-neutral-800">
              {EDIT_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setEditTab(t.id)}
                  className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold transition ${editTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {editTab === 'personal' && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Account Type</label>
                    <Sel value={form.entityType} onChange={fld('entityType')}>
                      <option value="individual">Individual</option>
                      <option value="team">Team</option>
                      <option value="agency">Agency</option>
                    </Sel>
                  </div>

                  {editIsOrg && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">{editEntityType === 'agency' ? 'Agency Name' : 'Team Name'}</label>
                      <Inp placeholder={editEntityType === 'agency' ? 'e.g. Acme Media Agency' : 'e.g. Acme Dev Team'} value={form.businessName} onChange={fld('businessName')} />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">{editIsOrg ? 'Primary Contact — First Name' : 'First Name'}</label>
                      <Inp placeholder="First name" value={form.firstName} onChange={fld('firstName')} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">{editIsOrg ? 'Primary Contact — Last Name' : 'Last Name'}</label>
                      <Inp placeholder="Last name" value={form.lastName} onChange={fld('lastName')} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      {editEntityType === 'agency' ? 'Agency Type' : editEntityType === 'team' ? 'Team Type' : 'Professional Title'}
                    </label>
                    <Inp
                      placeholder={editIsOrg ? 'e.g. Media & Marketing Agency' : 'e.g. Full Stack Developer'}
                      value={form.title} onChange={fld('title')}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">{editIsOrg ? 'Description' : 'Bio'}</label>
                    <Txa rows={3} placeholder={editIsOrg ? 'Tell us about your team/agency…' : 'Tell us about yourself…'} value={form.bio} onChange={fld('bio')} />
                  </div>

                  {editIsOrg ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Phone</label>
                        <Inp placeholder="+91 9000000000" value={form.phone} onChange={fld('phone')} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Website</label>
                        <Inp placeholder="https://example.com" value={form.website} onChange={fld('website')} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Phone</label>
                        <Inp placeholder="+91 9000000000" value={form.phone} onChange={fld('phone')} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Hourly Rate (₹)</label>
                        <Inp placeholder="500" value={form.hourlyRate} onChange={fld('hourlyRate')} />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">City</label>
                      <Inp placeholder="Mumbai" value={form.city} onChange={fld('city')} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Country</label>
                      <Inp placeholder="India" value={form.country} onChange={fld('country')} />
                    </div>
                  </div>

                  {editIsOrg ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Founded Year</label>
                        <Inp placeholder="2018" value={form.foundedYear} onChange={fld('foundedYear')} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Team Size</label>
                        <Inp placeholder="12" value={form.teamSize} onChange={fld('teamSize')} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Timezone</label>
                        <Inp placeholder="Asia/Kolkata" value={form.timezone} onChange={fld('timezone')} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Availability</label>
                        <Inp placeholder="Full-time / Part-time" value={form.availability} onChange={fld('availability')} />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      {editIsOrg ? 'Services' : 'Skills'} <span className="font-normal text-neutral-400">(comma-separated)</span>
                    </label>
                    <Inp placeholder={editIsOrg ? 'Media, Marketing, Branding…' : 'React, Node.js, Figma…'} value={form.skillsCsv} onChange={fld('skillsCsv')} />
                  </div>
                </div>
              )}

              {editTab === 'team' && (
                <div className="space-y-4">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Add the people on your team. This is a simple roster shown on your profile — not a login/invite system.</p>
                  {form.teamMembers.length === 0 && (
                    <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-400 dark:border-neutral-700">No team members yet. Add your first team member.</p>
                  )}
                  <div className="space-y-3">
                    {form.teamMembers.map((tm, i) => (
                      <div key={i} className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Name</label>
                          <Inp placeholder="Full name" value={tm.name} onChange={(e) => setForm((f) => ({ ...f, teamMembers: f.teamMembers.map((row, ri) => (ri === i ? { ...row, name: e.target.value } : row)) }))} />
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Role</label>
                          <Inp placeholder="e.g. Creative Director" value={tm.role} onChange={(e) => setForm((f) => ({ ...f, teamMembers: f.teamMembers.map((row, ri) => (ri === i ? { ...row, role: e.target.value } : row)) }))} />
                        </div>
                        <button
                          onClick={() => setForm((f) => ({ ...f, teamMembers: f.teamMembers.filter((_, ri) => ri !== i) }))}
                          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                          title="Remove"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <BtnSecondary
                    onClick={() => setForm((f) => (f.teamMembers.length >= 50 ? f : { ...f, teamMembers: [...f.teamMembers, { name: '', role: '' }] }))}
                    disabled={form.teamMembers.length >= 50}
                  >
                    + Add Team Member
                  </BtnSecondary>
                  {form.teamMembers.length >= 50 && <p className="text-xs text-neutral-400">Maximum of 50 team members.</p>}
                </div>
              )}

              {editTab === 'bank' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    <span className="material-symbols-outlined mr-1 align-middle text-sm">info</span>
                    Bank details are used for payment processing. Keep them accurate.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Account Holder Name</label>
                      <Inp placeholder="Full name as per bank" value={form.accountHolderName} onChange={fld('accountHolderName')} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Bank Name</label>
                      <Inp placeholder="e.g. HDFC Bank" value={form.bankName} onChange={fld('bankName')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Account Number</label>
                      <Inp placeholder="Account number" value={form.accountNumber} onChange={fld('accountNumber')} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">IFSC Code</label>
                      <Inp placeholder="HDFC0001234" value={form.ifscCode} onChange={fld('ifscCode')} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Account Type</label>
                    <Inp placeholder="Savings / Current" value={form.accountType} onChange={fld('accountType')} />
                  </div>
                  <div className="mt-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">Online Payment</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">UPI ID</label>
                        <Inp placeholder="name@upi" value={form.upiId} onChange={fld('upiId')} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">PayPal Email</label>
                        <Inp placeholder="paypal@email.com" value={form.paypalEmail} onChange={fld('paypalEmail')} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editTab === 'docs' && (
                <div className="space-y-4">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Upload your documents to Cloudinary. Files are securely stored and accessible only to you and your admin.</p>
                  <DocUploadCard
                    label={editIsOrg ? 'Logo' : 'Profile Photo'} icon="account_circle" docType="avatar"
                    currentUrl={m.avatar} currentName="Current photo"
                    token={token} onDone={handleDocDone}
                  />
                  {!editIsOrg && (
                    <DocUploadCard
                      label="CV / Resume" icon="description" docType="cv"
                      currentUrl={docs.cv?.url} currentName={docs.cv?.fileName}
                      token={token} onDone={handleDocDone}
                    />
                  )}
                  <DocUploadCard
                    label="Bank Statement" icon="account_balance" docType="bankStatement"
                    currentUrl={docs.bankStatement?.url} currentName={docs.bankStatement?.fileName}
                    token={token} onDone={handleDocDone}
                  />
                  {editIsOrg && (
                    <>
                      <DocUploadCard
                        label="Company Registration" icon="gavel" docType="companyRegistration"
                        currentUrl={docs.companyRegistration?.url} currentName={docs.companyRegistration?.fileName}
                        token={token} onDone={handleDocDone}
                      />
                      <DocUploadCard
                        label="GST / Tax Document" icon="receipt_long" docType="gstDocument"
                        currentUrl={docs.gstDocument?.url} currentName={docs.gstDocument?.fileName}
                        token={token} onDone={handleDocDone}
                      />
                      <DocUploadCard
                        label="Business Certificate" icon="workspace_premium" docType="businessCertificate"
                        currentUrl={docs.businessCertificate?.url} currentName={docs.businessCertificate?.fileName}
                        token={token} onDone={handleDocDone}
                      />
                      <DocUploadCard
                        label="Portfolio" icon="photo_library" docType="portfolio"
                        currentUrl={docs.portfolio?.url} currentName={docs.portfolio?.fileName}
                        token={token} onDone={handleDocDone}
                      />
                      <DocUploadCard
                        label="Certifications" icon="verified" docType="certifications"
                        currentUrl={docs.certifications?.url} currentName={docs.certifications?.fileName}
                        token={token} onDone={handleDocDone}
                      />
                    </>
                  )}
                </div>
              )}

              {msg && (
                <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${msg === 'Saved!' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'}`}>
                  {msg}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex shrink-0 items-center justify-between border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
              <BtnSecondary onClick={() => setEditOpen(false)}>Cancel</BtnSecondary>
              {editTab !== 'docs' && (
                <BtnPrimary onClick={saveProfile} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </BtnPrimary>
              )}
              {editTab === 'docs' && (
                <button onClick={() => setEditOpen(false)} className="rounded-xl bg-neutral-900 px-5 py-2 text-sm font-bold text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900">
                  Done
                </button>
              )}
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
      <OutsourcingPageHdr title="Payments" subtitle="Earnings, transactions, and payment methods" icon="payments" accent="#10b981" />
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
      <OutsourcingPageHdr title="Activity" subtitle="Session, job, and work log timeline" icon="timeline" accent="#f59e0b" />
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
        if (m.notifPrefs) setNotifPrefs((prev) => ({ ...prev, ...m.notifPrefs }));
        if (m.privacyPrefs) setPrivacyPrefs((prev) => ({ ...prev, ...m.privacyPrefs }));
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

  const savePreferences = async (type) => {
    try {
      setSaving(true); setMsg({ type: '', text: '' });
      await outsourcingApi.updatePreferences(token, type === 'notif' ? { notifPrefs } : { privacyPrefs });
      setMsg({ type: 'ok', text: 'Preferences saved!' });
    } catch (e) { setMsg({ type: 'err', text: e.message || 'Failed to save' }); } finally { setSaving(false); }
  };

  const changePassword = async () => {
    setMsg({ type: '', text: '' });
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { setMsg({ type: 'err', text: 'All fields are required.' }); return; }
    if (pwForm.next !== pwForm.confirm) { setMsg({ type: 'err', text: 'New passwords do not match.' }); return; }
    if (pwForm.next.length < 6) { setMsg({ type: 'err', text: 'New password must be at least 6 characters.' }); return; }
    try {
      setSaving(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to change password');
      setPwForm({ current: '', next: '', confirm: '' });
      setMsg({ type: 'ok', text: 'Password updated successfully!' });
    } catch (e) { setMsg({ type: 'err', text: e.message || 'Failed to change password' }); } finally { setSaving(false); }
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
      <OutsourcingPageHdr title="Settings" subtitle="Manage your account preferences and security" icon="settings" accent="#64748b" />
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
                  <BtnPrimary onClick={changePassword} disabled={saving}>{saving ? 'Updating…' : 'Update Password'}</BtnPrimary>
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
                <div className="mt-4 flex items-center justify-between">
                  {msg.text && tab === 'notifications' && <p className={`text-sm ${msg.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>}
                  <div className="ml-auto"><BtnPrimary onClick={() => savePreferences('notif')} disabled={saving}>{saving ? 'Saving…' : 'Save Preferences'}</BtnPrimary></div>
                </div>
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
                <div className="mt-4 flex items-center justify-between">
                  {msg.text && tab === 'privacy' && <p className={`text-sm ${msg.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>}
                  <div className="ml-auto"><BtnPrimary onClick={() => savePreferences('privacy')} disabled={saving}>{saving ? 'Saving…' : 'Save Preferences'}</BtnPrimary></div>
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
  const { token } = useAuth();
  const [tab, setTab] = useState('ticket');
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [form, setForm] = useState({ subject: '', category: 'general', priority: 'normal', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [err, setErr] = useState('');

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try { const r = await outsourcingApi.getMyTickets(token); setTickets(r.data || []); } catch {}
    finally { setTicketsLoading(false); }
  }, [token]);

  useEffect(() => { if (tab === 'my') loadTickets(); }, [tab, loadTickets]);

  const submitTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true); setErr('');
    try {
      await outsourcingApi.createSupportTicket(token, form);
      setSubmitted(true);
      setForm({ subject: '', category: 'general', priority: 'normal', description: '' });
    } catch (ex) { setErr(ex.message || 'Failed to submit ticket'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-5">
      <OutsourcingPageHdr title="Support" subtitle="Get help, report issues, and find answers" icon="support_agent" accent="#06b6d4" />

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
            <div className="mb-4 flex items-center justify-between">
              <SectionHdr title="My Support Tickets" />
              <button onClick={loadTickets} className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                <span className="material-symbols-outlined text-[14px]">refresh</span>Refresh
              </button>
            </div>
            {ticketsLoading ? <Skeleton rows={3} /> : tickets.length === 0 ? (
              <EmptyState icon="support_agent" title="No tickets yet" subtitle="Submit a ticket from the 'Open a Ticket' tab." />
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <button key={t._id} onClick={() => setSelectedTicket(t)} className="w-full rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 dark:text-white">{t.subject}</p>
                        <p className="mt-0.5 text-xs text-neutral-400 capitalize">{t.category} · {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Pill value={t.status} />
                        <Pill value={t.priority} />
                      </div>
                    </div>
                    {t.replies?.length > 0 && (
                      <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
                        <span className="material-symbols-outlined text-[12px] align-middle">chat</span> {t.replies.length} repl{t.replies.length === 1 ? 'y' : 'ies'}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Inner>
        </Card>
      )}

      {tab === 'faq' && (
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <Card key={i}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-4 p-5">
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

      {/* Ticket detail slide-over */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTicket(null)}>
          <div className="flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl dark:bg-neutral-950" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-400 mb-0.5">#{String(selectedTicket._id).slice(-8).toUpperCase()}</p>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">{selectedTicket.subject}</h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Pill value={selectedTicket.status} />
                  <Pill value={selectedTicket.priority} />
                  <span className="inline-flex items-center rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs font-medium capitalize text-neutral-500 dark:border-neutral-700">{selectedTicket.category}</span>
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined text-[20px] text-neutral-400">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Original description */}
              <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400">Your Request</p>
                <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{selectedTicket.description}</p>
                <p className="mt-2 text-xs text-neutral-400">{new Date(selectedTicket.createdAt).toLocaleString('en-IN')}</p>
              </div>

              {/* Reply thread */}
              {(selectedTicket.replies || []).length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Replies</p>
                  {selectedTicket.replies.map((r, i) => (
                    <div key={i} className={`rounded-xl p-4 ${r.isAdminReply ? 'border border-indigo-100 bg-indigo-50 dark:border-indigo-900/30 dark:bg-indigo-950/20' : 'border border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-900'}`}>
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className={`text-xs font-bold ${r.isAdminReply ? 'text-indigo-700 dark:text-indigo-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                          {r.isAdminReply ? `${r.authorName || 'Admin'} (Support)` : 'You'}
                        </span>
                        <span className="text-[10px] text-neutral-400">{new Date(r.createdAt).toLocaleString('en-IN')}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{r.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-200 p-6 text-center dark:border-neutral-700">
                  <span className="material-symbols-outlined text-3xl text-neutral-300 dark:text-neutral-600">forum</span>
                  <p className="mt-2 text-sm text-neutral-400">No replies yet. Our team will respond within 24 hours.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                Opened {new Date(selectedTicket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <button onClick={() => setSelectedTicket(null)} className="mt-3 w-full rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
