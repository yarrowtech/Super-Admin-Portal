import React, { useMemo, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import IconButton from '../common/IconButton';
import Button from '../common/Button';

const STATUS_TONE = { Active: 'success', Paused: 'warning', Error: 'danger', Disabled: 'neutral' };
const STATUS_ICON = { Active: 'check_circle', Paused: 'pause_circle', Error: 'error', Disabled: 'do_not_disturb_on' };

const TRIGGER_ICON = {
  'On new invoice':     'receipt_long',
  'On user signup':     'person_add',
  'Manual trigger':     'touch_app',
  'On content approval':'verified',
  'Scheduled (Weekly)': 'event_repeat',
};

// ─── Data (no backend endpoint exists yet — UI-only pass, data stays local) ──────
const INITIAL_WORKFLOWS = [
  { id: 1, name: 'Invoice Processing',      description: 'Automates invoice validation and approval.',            status: 'Active',   lastRun: '2024-05-20 14:30 UTC', trigger: 'On new invoice',      owner: 'Admin',      runs: 142 },
  { id: 2, name: 'User Onboarding',         description: 'Sends welcome emails and sets up new accounts.',        status: 'Active',   lastRun: '2024-05-20 11:15 UTC', trigger: 'On user signup',      owner: 'Jane Doe',   runs: 89  },
  { id: 3, name: 'Hiring Approvals',        description: 'Multi-step approval for new job requisitions.',         status: 'Paused',   lastRun: '2024-05-18 09:00 UTC', trigger: 'Manual trigger',      owner: 'Admin',      runs: 24  },
  { id: 4, name: 'Content Deployment',      description: 'Automates pushing new content to production.',          status: 'Error',    lastRun: '2024-05-19 16:45 UTC', trigger: 'On content approval', owner: 'System',     runs: 311 },
  { id: 5, name: 'Weekly Report Generation',description: 'Generates and emails weekly performance reports.',       status: 'Disabled', lastRun: '2024-05-17 08:00 UTC', trigger: 'Scheduled (Weekly)',  owner: 'John Smith', runs: 52  },
];

const WorkflowManagement = () => {
  const toast = useToast();
  const { confirm } = useConfirmDialog();
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

  const togglePause = (wf) => {
    const nextStatus = wf.status === 'Paused' ? 'Active' : 'Paused';
    setRows((prev) =>
      prev.map((r) => (r.id !== wf.id ? r : { ...r, status: nextStatus }))
    );
    toast.success(`"${wf.name}" ${nextStatus === 'Active' ? 'resumed' : 'paused'}.`);
  };

  const removeRow = async (wf) => {
    const shouldProceed = await confirm({
      title: 'Delete workflow?',
      message: `This will permanently delete "${wf.name}". This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!shouldProceed) return;
    setRows((prev) => prev.filter((r) => r.id !== wf.id));
    toast.success(`"${wf.name}" deleted.`);
  };

  const addWorkflow = () => {
    const name = `New Workflow ${rows.length + 1}`;
    setRows((prev) => [
      {
        id: Date.now(),
        name,
        description: 'Custom workflow — click to configure.',
        status: 'Disabled',
        lastRun: 'Never',
        trigger: 'Manual trigger',
        owner: 'Admin',
        runs: 0,
      },
      ...prev,
    ]);
    toast.success(`"${name}" created.`);
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Workflow Management"
          subtitle="Monitor, create, and manage all automated workflows"
          icon="account_tree"
          showSearch={false}
          showNotifications={false}
          showThemeToggle={false}
        >
          <Button variant="primary" size="md" className="min-h-11" onClick={addWorkflow} icon={<span className="material-symbols-outlined text-lg">add</span>}>
            Create Workflow
          </Button>
        </PortalHeader>

        {/* KPI Row */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KPICard title="Total Workflows" value={counts.total} subtitle="All configured" icon="account_tree" compact />
          <KPICard title="Active" value={counts.active} subtitle="Running now" icon="check_circle" compact />
          <KPICard title="Errors" value={counts.error} subtitle="Needs attention" icon="error" compact />
          <KPICard title="Paused / Off" value={counts.disabled} subtitle="Inactive workflows" icon="pause_circle" compact />
        </div>

        {/* Search + Filter */}
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-4">
          <div className="relative min-w-50 flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-neutral-400">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workflows, owners, triggers…"
              className="app-input pl-10 pr-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-700"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Active', 'Paused', 'Error', 'Disabled'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Workflow Cards */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white py-16 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-700">account_tree</span>
            <p className="font-semibold text-neutral-600 dark:text-neutral-300">No workflows found</p>
            <p className="text-sm text-neutral-400">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((wf) => {
              const isPausable = wf.status === 'Active' || wf.status === 'Paused';
              return (
                <div key={wf.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    {/* Icon */}
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <span className="material-symbols-outlined text-[22px]">{STATUS_ICON[wf.status]}</span>
                    </span>

                    {/* Name + desc */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-neutral-900 dark:text-neutral-100">{wf.name}</p>
                        <StatusBadge tone={STATUS_TONE[wf.status]} label={wf.status} />
                      </div>
                      <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{wf.description}</p>

                      {/* Meta chips */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="material-symbols-outlined text-sm">{TRIGGER_ICON[wf.trigger] || 'bolt'}</span>
                          {wf.trigger}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          {wf.lastRun}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="material-symbols-outlined text-sm">person</span>
                          {wf.owner}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="material-symbols-outlined text-sm">repeat</span>
                          {wf.runs} runs
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
                      {isPausable && (
                        <IconButton
                          icon={wf.status === 'Paused' ? 'play_arrow' : 'pause'}
                          tone="primary"
                          tooltip={wf.status === 'Paused' ? 'Resume workflow' : 'Pause workflow'}
                          onClick={() => togglePause(wf)}
                        />
                      )}
                      <IconButton icon="history" tooltip="Run history" />
                      <IconButton icon="edit" tooltip="Edit workflow" />
                      <IconButton icon="delete" tone="danger" tooltip="Delete workflow" onClick={() => removeRow(wf)} />
                    </div>
                  </div>
                </div>
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
