import React, { useMemo, useState } from 'react';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 ${className}`}>
    {children}
  </section>
);

const Inner = ({ children, className = '' }) => (
  <div className={`p-5 lg:p-6 ${className}`}>{children}</div>
);

const PageHdr = ({ title, subtitle, icon, action }) => (
  <header className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
    <div className="h-1 w-full bg-rose-600" />
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 shadow-sm">
          <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
        </div>
        <div>
          <h1 className="text-[17px] font-black leading-tight text-neutral-900 dark:text-neutral-100">{title}</h1>
          {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  </header>
);

const StatCard = ({ icon, label, value, sub, color = 'bg-rose-600' }) => (
  <Card>
    <Inner className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</p>
        <span className={`material-symbols-outlined rounded-xl p-2 text-[18px] text-white ${color}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-neutral-500 dark:text-neutral-400">{sub}</p>}
    </Inner>
  </Card>
);

const Toggle = ({ checked, onChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${checked ? 'bg-rose-600' : 'bg-neutral-200 dark:bg-neutral-700'}`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

const severityConfig = {
  critical: { color: 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700', icon: 'error', dot: 'bg-rose-500' },
  high:     { color: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700', icon: 'warning', dot: 'bg-amber-500' },
  medium:   { color: 'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700', icon: 'info', dot: 'bg-blue-500' },
  low:      { color: 'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700', icon: 'flag', dot: 'bg-neutral-400' },
};

const SeverityPill = ({ level }) => {
  const cfg = severityConfig[level] || severityConfig.low;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset capitalize ${cfg.color}`}>
      <span className="material-symbols-outlined text-[13px]">{cfg.icon}</span>
      {level}
    </span>
  );
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
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
  info:    'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
};

// ─── Component ────────────────────────────────────────────────────────────────
const SecurityMonitoring = () => {
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

  const resolveIssue = (id) =>
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, resolved: true } : i)));

  return (
    <main className="flex-1 overflow-y-auto bg-neutral-50 p-4 dark:bg-neutral-950 md:p-6">
      <div className="mx-auto w-full max-w-5xl">

        <PageHdr
          icon="security"
          title="Security"
          subtitle="Monitor threats, manage policies, and review security activity."
          action={
            <button className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 transition">
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Run Scan
            </button>
          }
        />

        {/* KPI Row */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon="gpp_bad"       label="Open Issues"      value={openCount}  sub="Needs attention"   color="bg-rose-600" />
          <StatCard icon="login"         label="Logins Today"     value="142"        sub="+12 from yesterday" color="bg-indigo-600" />
          <StatCard icon="block"         label="Blocked Attempts" value="37"         sub="Last 24 hours"     color="bg-amber-500" />
          <StatCard icon="verified_user" label="Security Score"   value="84 / 100"   sub="Good standing"     color="bg-emerald-600" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left Column ─ Policies + Issues */}
          <div className="space-y-6 lg:col-span-2">

            {/* Policy Controls */}
            <Card>
              <Inner>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Security Policies</h2>
                <div className="space-y-4">

                  <div className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined rounded-lg bg-rose-100 p-2 text-[18px] text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">phonelink_lock</span>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Two-Factor Authentication</p>
                        <p className="text-xs text-neutral-500">Enforce 2FA for all user accounts</p>
                      </div>
                    </div>
                    <Toggle checked={enforce2FA} onChange={setEnforce2FA} />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined rounded-lg bg-rose-100 p-2 text-[18px] text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">password</span>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Strong Password Policy</p>
                        <p className="text-xs text-neutral-500">Min 8 chars, uppercase, number, symbol</p>
                      </div>
                    </div>
                    <Toggle checked={enforceStrongPassword} onChange={setEnforceStrongPassword} />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined rounded-lg bg-rose-100 p-2 text-[18px] text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">timer</span>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Session Timeout</p>
                        <p className="text-xs text-neutral-500">Auto-logout after inactivity</p>
                      </div>
                    </div>
                    <select
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(Number(e.target.value))}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                    >
                      {[15, 30, 60, 120].map((m) => (
                        <option key={m} value={m}>{m} min</option>
                      ))}
                    </select>
                  </div>

                </div>
              </Inner>
            </Card>

            {/* Active Issues */}
            <Card>
              <Inner>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Active Threats</h2>
                    {openCount > 0 && (
                      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                        {openCount} open
                      </span>
                    )}
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    {['all', 'critical', 'high', 'medium', 'low'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSeverityFilter(s)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${severityFilter === s ? 'bg-rose-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-neutral-400">search</span>
                  <input
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-4 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                    placeholder="Search issues, users, categories…"
                    value={issuesQuery}
                    onChange={(e) => setIssuesQuery(e.target.value)}
                  />
                </div>

                {visibleIssues.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-700">shield_check</span>
                    <p className="font-semibold text-neutral-600 dark:text-neutral-300">No issues found</p>
                    <p className="text-sm text-neutral-400">All clear or no matches for this filter.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleIssues.map((issue) => {
                      const cfg = severityConfig[issue.severity] || severityConfig.low;
                      return (
                        <div key={issue.id} className="group flex items-start gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 transition hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.color.split(' ').slice(0,2).join(' ')}`}>
                            <span className="material-symbols-outlined text-[18px]">{cfg.icon}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <SeverityPill level={issue.severity} />
                              <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">{issue.category}</span>
                            </div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{issue.text}</p>
                            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{issue.time}</p>
                          </div>
                          <button
                            onClick={() => resolveIssue(issue.id)}
                            className="shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 opacity-0 transition hover:bg-neutral-50 group-hover:opacity-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                          >
                            Resolve
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Inner>
            </Card>

          </div>

          {/* Right Column ─ Activity Log + Quick Status */}
          <div className="space-y-6">

            {/* Quick Status */}
            <Card>
              <Inner>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Policy Status</h2>
                <div className="space-y-3">
                  {[
                    { label: '2FA Enforcement',   active: enforce2FA,            icon: 'phonelink_lock' },
                    { label: 'Strong Passwords',  active: enforceStrongPassword, icon: 'password' },
                    { label: 'Session Timeout',   active: true,                  icon: 'timer', sub: `${sessionTimeout} min` },
                    { label: 'Audit Logging',     active: true,                  icon: 'article' },
                    { label: 'IP Allowlist',      active: false,                 icon: 'lan' },
                  ].map((p) => (
                    <div key={p.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-neutral-400">{p.icon}</span>
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">{p.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {p.sub && <span className="text-xs text-neutral-400">{p.sub}</span>}
                        <span className={`inline-flex h-2 w-2 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                        <span className={`text-xs font-medium ${p.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}`}>
                          {p.active ? 'On' : 'Off'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Inner>
            </Card>

            {/* Activity Log */}
            <Card>
              <Inner>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Recent Activity</h2>
                <div className="space-y-1">
                  {ACTIVITY_LOG.map((entry, i) => (
                    <div key={i} className="flex items-start gap-3 py-2.5 border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${logTypeStyle[entry.type]}`}>
                        <span className="material-symbols-outlined text-[14px]">{entry.icon}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-snug text-neutral-800 dark:text-neutral-200">{entry.text}</p>
                        <p className="mt-0.5 text-[11px] text-neutral-400">{entry.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-3 w-full rounded-xl border border-neutral-200 py-2 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                  View Full Audit Log
                </button>
              </Inner>
            </Card>

          </div>
        </div>

      </div>
    </main>
  );
};

export default SecurityMonitoring;
