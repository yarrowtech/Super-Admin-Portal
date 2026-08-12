import React, { useMemo, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${checked ? 'bg-primary' : 'bg-neutral-200 dark:bg-neutral-700'}`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

const SEVERITY_TONE = { critical: 'danger', high: 'warning', medium: 'info', low: 'neutral' };
const SEVERITY_ICON = { critical: 'error', high: 'warning', medium: 'info', low: 'flag' };

// ─── Mock Data (no backend endpoint exists yet — UI-only pass, data stays local) ──
const ISSUES = [
  { id: 1, severity: 'critical', text: "Multiple failed login attempts for 'admin'.", time: '15 minutes ago', category: 'Brute Force', user: 'admin', resolved: false },
  { id: 2, severity: 'high',     text: "Unusual login location detected for 'john.doe'.", time: '2 hours ago', category: 'Anomaly', user: 'john.doe', resolved: false },
  { id: 3, severity: 'medium',   text: "Administrator role granted to 'sara.c'.", time: '1 day ago', category: 'Privilege', user: 'sara.c', resolved: false },
];

const ACTIVITY_LOG = [
  { icon: 'lock',         text: "2FA enabled for 'maria.k'", time: '5 min ago',  type: 'success' },
  { icon: 'person_off',   text: "Account locked: 'temp.user'", time: '22 min ago', type: 'warn' },
  { icon: 'vpn_key',      text: "Password reset by 'james.w'", time: '1 hr ago',  type: 'info' },
  { icon: 'shield_check',  text: "Security scan completed — 0 threats", time: '3 hr ago',  type: 'success' },
  { icon: 'manage_accounts', text: "Role change: 'bob.t' → Viewer", time: '6 hr ago',  type: 'info' },
];

const logTypeStyle = {
  success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  warn:    'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  info:    'bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
};

// ─── Component ────────────────────────────────────────────────────────────────
const SecurityMonitoring = () => {
  const toast = useToast();
  const [enforce2FA, setEnforce2FA]                       = useState(true);
  const [enforceStrongPassword, setEnforceStrongPassword] = useState(true);
  const [sessionTimeout, setSessionTimeout]               = useState(30);
  const [issuesQuery, setIssuesQuery]                     = useState('');
  const [severityFilter, setSeverityFilter]               = useState('all');
  const [issues, setIssues]                               = useState(ISSUES);

  const visibleIssues = useMemo(() => {
    const q = issuesQuery.trim().toLowerCase();
    return issues.filter((i) => {
      const matchesQ    = !q || `${i.text} ${i.category} ${i.user}`.toLowerCase().includes(q);
      const matchesSev  = severityFilter === 'all' || i.severity === severityFilter;
      return matchesQ && matchesSev && !i.resolved;
    });
  }, [issues, issuesQuery, severityFilter]);

  const openCount = issues.filter((i) => !i.resolved).length;

  const resolveIssue = (issue) => {
    setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, resolved: true } : i)));
    toast.success(`Marked "${issue.category}" issue as resolved.`);
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Security"
          subtitle="Monitor threats, manage policies, and review security activity"
          icon="security"
          showSearch={false}
          showNotifications={false}
          showThemeToggle
        >
          <Button variant="primary" size="md" className="min-h-11" icon={<span className="material-symbols-outlined text-lg">refresh</span>}>
            Run Scan
          </Button>
        </PortalHeader>

        {/* KPI Row */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KPICard title="Open Issues" value={openCount} subtitle="Needs attention" icon="gpp_bad" compact />
          <KPICard title="Logins Today" value="142" subtitle="+12 from yesterday" icon="login" compact />
          <KPICard title="Blocked Attempts" value="37" subtitle="Last 24 hours" icon="block" compact />
          <KPICard title="Security Score" value="84 / 100" subtitle="Good standing" icon="verified_user" compact />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 2xl:gap-6">

          {/* Left Column ─ Policies + Issues */}
          <div className="space-y-4 lg:col-span-2 2xl:space-y-6">

            {/* Policy Controls */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Security Policies</h2>
              <div className="space-y-3">

                <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <span className="material-symbols-outlined text-lg">phonelink_lock</span>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">Two-Factor Authentication</p>
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">Enforce 2FA for all user accounts</p>
                    </div>
                  </div>
                  <Toggle checked={enforce2FA} onChange={setEnforce2FA} />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <span className="material-symbols-outlined text-lg">password</span>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">Strong Password Policy</p>
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">Min 8 chars, uppercase, number, symbol</p>
                    </div>
                  </div>
                  <Toggle checked={enforceStrongPassword} onChange={setEnforceStrongPassword} />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <span className="material-symbols-outlined text-lg">timer</span>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">Session Timeout</p>
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">Auto-logout after inactivity</p>
                    </div>
                  </div>
                  <select
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(Number(e.target.value))}
                    className="min-h-9 shrink-0 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                  >
                    {[15, 30, 60, 120].map((m) => (
                      <option key={m} value={m}>{m} min</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Active Issues */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Active Threats</h2>
                  {openCount > 0 && <StatusBadge tone="danger" label={`${openCount} open`} />}
                </div>

                {/* Severity filter chips */}
                <div className="flex flex-wrap items-center gap-2">
                  {['all', 'critical', 'high', 'medium', 'low'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverityFilter(s)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ${severityFilter === s ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-neutral-400">search</span>
                <input
                  className="app-input pl-10 pr-9"
                  placeholder="Search issues, users, categories…"
                  value={issuesQuery}
                  onChange={(e) => setIssuesQuery(e.target.value)}
                />
                {issuesQuery && (
                  <button
                    type="button"
                    onClick={() => setIssuesQuery('')}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-700"
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                )}
              </div>

              {visibleIssues.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-700">shield_check</span>
                  <p className="font-semibold text-neutral-600 dark:text-neutral-300">No issues found</p>
                  <p className="text-sm text-neutral-400">All clear or no matches for this filter.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleIssues.map((issue) => (
                    <div key={issue.id} className="group flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 transition hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950/40 dark:hover:border-neutral-700 sm:flex-row sm:items-start">
                      <div className="flex items-start gap-3 sm:flex-1 sm:min-w-0">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-neutral-900">
                          <span className="material-symbols-outlined text-lg text-neutral-500">{SEVERITY_ICON[issue.severity]}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <StatusBadge tone={SEVERITY_TONE[issue.severity]} label={issue.severity} />
                            <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">{issue.category}</span>
                          </div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{issue.text}</p>
                          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{issue.time}</p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" className="shrink-0 self-start" onClick={() => resolveIssue(issue)}>
                        Resolve
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column ─ Activity Log + Quick Status */}
          <div className="space-y-4 2xl:space-y-6">

            {/* Quick Status */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Policy Status</h2>
              <div className="space-y-3">
                {[
                  { label: '2FA Enforcement',   active: enforce2FA,            icon: 'phonelink_lock' },
                  { label: 'Strong Passwords',  active: enforceStrongPassword, icon: 'password' },
                  { label: 'Session Timeout',   active: true,                  icon: 'timer', sub: `${sessionTimeout} min` },
                  { label: 'Audit Logging',     active: true,                  icon: 'article' },
                  { label: 'IP Allowlist',      active: false,                 icon: 'lan' },
                ].map((p) => (
                  <div key={p.label} className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="material-symbols-outlined text-base text-neutral-400">{p.icon}</span>
                      <span className="truncate text-sm text-neutral-700 dark:text-neutral-300">{p.label}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {p.sub && <span className="text-xs text-neutral-400">{p.sub}</span>}
                      <span className={`inline-flex h-2 w-2 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                      <span className={`text-xs font-medium ${p.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}`}>
                        {p.active ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Log */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Recent Activity</h2>
              <div className="space-y-1">
                {ACTIVITY_LOG.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 border-b border-neutral-100 py-2.5 last:border-0 dark:border-neutral-800">
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${logTypeStyle[entry.type]}`}>
                      <span className="material-symbols-outlined text-sm">{entry.icon}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium leading-snug text-neutral-800 dark:text-neutral-200">{entry.text}</p>
                      <p className="mt-0.5 text-[11px] text-neutral-400">{entry.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 w-full rounded-xl border border-neutral-200 py-2 text-xs font-semibold text-neutral-500 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                View Full Audit Log
              </button>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
};

export default SecurityMonitoring;
