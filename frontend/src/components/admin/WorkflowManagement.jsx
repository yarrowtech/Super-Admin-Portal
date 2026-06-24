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
    <div className="h-1 w-full bg-violet-600" />
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 shadow-sm">
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

const StatCard = ({ icon, label, value, sub, color = 'bg-violet-600' }) => (
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

const STATUS_CFG = {
  Active:   { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',  dot: 'bg-emerald-500', icon: 'check_circle' },
  Paused:   { pill: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',             dot: 'bg-amber-500',   icon: 'pause_circle' },
  Error:    { pill: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',                   dot: 'bg-rose-500',    icon: 'error' },
  Disabled: { pill: 'bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',   dot: 'bg-neutral-400', icon: 'do_not_disturb_on' },
};

const TRIGGER_ICON = {
  'On new invoice':     'receipt_long',
  'On user signup':     'person_add',
  'Manual trigger':     'touch_app',
  'On content approval':'verified',
  'Scheduled (Weekly)': 'event_repeat',
};

const StatusPill = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.Disabled;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const INITIAL_WORKFLOWS = [
  { id: 1, name: 'Invoice Processing',      description: 'Automates invoice validation and approval.',            status: 'Active',   lastRun: '2024-05-20 14:30 UTC', trigger: 'On new invoice',      owner: 'Admin',      runs: 142 },
  { id: 2, name: 'User Onboarding',         description: 'Sends welcome emails and sets up new accounts.',        status: 'Active',   lastRun: '2024-05-20 11:15 UTC', trigger: 'On user signup',      owner: 'Jane Doe',   runs: 89  },
  { id: 3, name: 'Hiring Approvals',        description: 'Multi-step approval for new job requisitions.',         status: 'Paused',   lastRun: '2024-05-18 09:00 UTC', trigger: 'Manual trigger',      owner: 'Admin',      runs: 24  },
  { id: 4, name: 'Content Deployment',      description: 'Automates pushing new content to production.',          status: 'Error',    lastRun: '2024-05-19 16:45 UTC', trigger: 'On content approval', owner: 'System',     runs: 311 },
  { id: 5, name: 'Weekly Report Generation',description: 'Generates and emails weekly performance reports.',       status: 'Disabled', lastRun: '2024-05-17 08:00 UTC', trigger: 'Scheduled (Weekly)',  owner: 'John Smith', runs: 52  },
];

const WorkflowManagement = () => {
  const [rows, setRows]         = useState(INITIAL_WORKFLOWS);
  const [query, setQuery]       = useState('');
  const [statusFilter, setStatus] = useState('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const qOk = !q || `${r.name} ${r.description} ${r.owner} ${r.trigger}`.toLowerCase().includes(q);
      const sOk = statusFilter === 'All' || r.status === statusFilter;
      return qOk && sOk;
    });
  }, [rows, query, statusFilter]);

  const counts = useMemo(() => ({
    total:    rows.length,
    active:   rows.filter((r) => r.status === 'Active').length,
    error:    rows.filter((r) => r.status === 'Error').length,
    disabled: rows.filter((r) => r.status === 'Disabled' || r.status === 'Paused').length,
  }), [rows]);

  const togglePause = (id) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id !== id ? r : { ...r, status: r.status === 'Paused' ? 'Active' : 'Paused' }
      )
    );

  const removeRow = (id, name) => {
    if (!window.confirm(`Delete workflow "${name}"?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const addWorkflow = () =>
    setRows((prev) => [
      {
        id: Date.now(),
        name: `New Workflow ${prev.length + 1}`,
        description: 'Custom workflow — click to configure.',
        status: 'Disabled',
        lastRun: 'Never',
        trigger: 'Manual trigger',
        owner: 'Admin',
        runs: 0,
      },
      ...prev,
    ]);

  return (
    <main className="flex-1 overflow-y-auto bg-neutral-50 p-4 dark:bg-neutral-950 md:p-6">
      <div className="mx-auto w-full max-w-350">

        <PageHdr
          icon="account_tree"
          title="Workflow Management"
          subtitle="Monitor, create, and manage all automated workflows."
          action={
            <button
              onClick={addWorkflow}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 transition"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Create Workflow
            </button>
          }
        />

        {/* KPI Row */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon="account_tree"  label="Total Workflows" value={counts.total}    sub="All configured"        color="bg-violet-600" />
          <StatCard icon="check_circle"  label="Active"          value={counts.active}   sub="Running now"           color="bg-emerald-600" />
          <StatCard icon="error"         label="Errors"          value={counts.error}    sub="Needs attention"       color="bg-rose-600" />
          <StatCard icon="pause_circle"  label="Paused / Off"    value={counts.disabled} sub="Inactive workflows"    color="bg-amber-500" />
        </div>

        {/* Search + Filter */}
        <Card className="mb-6">
          <Inner className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-50">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-neutral-400">search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search workflows, owners, triggers…"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-4 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {['All', 'Active', 'Paused', 'Error', 'Disabled'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${statusFilter === s ? 'bg-violet-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Inner>
        </Card>

        {/* Workflow Cards */}
        {filtered.length === 0 ? (
          <Card>
            <Inner>
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-700">account_tree</span>
                <p className="font-semibold text-neutral-600 dark:text-neutral-300">No workflows found</p>
                <p className="text-sm text-neutral-400">Try adjusting your search or filter.</p>
              </div>
            </Inner>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((wf) => {
              const cfg = STATUS_CFG[wf.status] || STATUS_CFG.Disabled;
              const triggerIcon = TRIGGER_ICON[wf.trigger] || 'bolt';
              const isPausable  = wf.status === 'Active' || wf.status === 'Paused';
              return (
                <Card key={wf.id} className="group transition hover:shadow-md">
                  <Inner className="flex flex-wrap items-center gap-4 lg:flex-nowrap">

                    {/* Icon */}
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cfg.pill.split(' ').slice(0,2).join(' ')}`}>
                      <span className="material-symbols-outlined text-[22px]">{cfg.icon}</span>
                    </div>

                    {/* Name + desc */}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-neutral-900 dark:text-neutral-100">{wf.name}</p>
                      <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{wf.description}</p>
                    </div>

                    {/* Meta chips */}
                    <div className="flex flex-wrap items-center gap-3 lg:gap-5">
                      <StatusPill status={wf.status} />

                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="material-symbols-outlined text-[15px]">{triggerIcon}</span>
                        <span>{wf.trigger}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="material-symbols-outlined text-[15px]">schedule</span>
                        <span>{wf.lastRun}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="material-symbols-outlined text-[15px]">person</span>
                        <span>{wf.owner}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="material-symbols-outlined text-[15px]">repeat</span>
                        <span>{wf.runs} runs</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      {isPausable && (
                        <button
                          onClick={() => togglePause(wf.id)}
                          title={wf.status === 'Paused' ? 'Resume' : 'Pause'}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-violet-600 dark:hover:bg-neutral-800 dark:hover:text-violet-400"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {wf.status === 'Paused' ? 'play_arrow' : 'pause'}
                          </span>
                        </button>
                      )}
                      <button
                        title="Run history"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-violet-600 dark:hover:bg-neutral-800 dark:hover:text-violet-400"
                      >
                        <span className="material-symbols-outlined text-[18px]">history</span>
                      </button>
                      <button
                        title="Edit"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-violet-600 dark:hover:bg-neutral-800 dark:hover:text-violet-400"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => removeRow(wf.id, wf.name)}
                        title="Delete"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>

                  </Inner>
                </Card>
              );
            })}
          </div>
        )}

        {/* Footer count */}
        {filtered.length > 0 && (
          <p className="mt-4 text-center text-xs text-neutral-400">
            Showing {filtered.length} of {rows.length} workflows
          </p>
        )}

      </div>
    </main>
  );
};

export default WorkflowManagement;
