import React, { useMemo, useState } from 'react';

const workflows = [
  {
    name: 'Invoice Processing',
    description: 'Automates invoice validation and approval.',
    status: 'Active',
    statusColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    statusDot: 'bg-green-500',
    lastRun: '2024-05-20 14:30 UTC',
    trigger: 'On new invoice',
    owner: 'Admin',
  },
  {
    name: 'User Onboarding',
    description: 'Sends welcome emails and sets up new accounts.',
    status: 'Active',
    statusColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    statusDot: 'bg-green-500',
    lastRun: '2024-05-20 11:15 UTC',
    trigger: 'On user signup',
    owner: 'Jane Doe',
  },
  {
    name: 'Hiring Approvals',
    description: 'Multi-step approval for new job requisitions.',
    status: 'Paused',
    statusColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    statusDot: 'bg-yellow-500',
    lastRun: '2024-05-18 09:00 UTC',
    trigger: 'Manual trigger',
    owner: 'Admin',
  },
  {
    name: 'Content Deployment',
    description: 'Automates pushing new content to production.',
    status: 'Error',
    statusColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    statusDot: 'bg-red-500',
    lastRun: '2024-05-19 16:45 UTC',
    trigger: 'On content approval',
    owner: 'System',
  },
  {
    name: 'Weekly Report Generation',
    description: 'Generates and emails weekly performance reports.',
    status: 'Disabled',
    statusColor: 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300',
    statusDot: 'bg-neutral-500',
    lastRun: '2024-05-17 08:00 UTC',
    trigger: 'Scheduled (Weekly)',
    owner: 'John Smith',
  },
];

const WorkflowManagement = () => {
  const [rows, setRows] = useState(workflows);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const qOk = !q || `${r.name} ${r.description} ${r.owner}`.toLowerCase().includes(q);
      const sOk = status === 'All' || r.status === status;
      return qOk && sOk;
    });
  }, [rows, query, status]);

  const togglePauseResume = (name) => {
    setRows((prev) =>
      prev.map((r) =>
        r.name !== name
          ? r
          : {
              ...r,
              status: r.status === 'Paused' ? 'Active' : 'Paused',
              statusColor:
                r.status === 'Paused'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
              statusDot: r.status === 'Paused' ? 'bg-green-500' : 'bg-yellow-500',
            }
      )
    );
  };

  const removeWorkflow = (name) => {
    if (!window.confirm(`Delete workflow: ${name}?`)) return;
    setRows((prev) => prev.filter((r) => r.name !== name));
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-5">
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black leading-tight tracking-[-0.02em] text-neutral-800 dark:text-neutral-100 lg:text-4xl">
              Workflows Management
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Monitor, create, and manage all automated workflows.
            </p>
          </div>
          <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90" onClick={() => setRows((prev) => [{ name: `New Workflow ${prev.length + 1}`, description: 'Custom workflow', status: 'Active', statusColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', statusDot: 'bg-green-500', lastRun: 'Not run', trigger: 'Manual trigger', owner: 'Admin' }, ...prev])}>
            <span className="material-symbols-outlined">add</span>
            Create Workflow
          </button>
        </header>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workflows" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            <option>All</option>
            <option>Active</option>
            <option>Paused</option>
            <option>Error</option>
            <option>Disabled</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-6 py-3 text-left">Workflow</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Last Run</th>
                <th className="px-6 py-3 text-left">Trigger</th>
                <th className="px-6 py-3 text-left">Owner</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
              {filtered.map((workflow) => (
                <tr key={workflow.name}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{workflow.name}</div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">{workflow.description}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${workflow.statusColor}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${workflow.statusDot}`}></span>
                      {workflow.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-neutral-600 dark:text-neutral-400">{workflow.lastRun}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-neutral-600 dark:text-neutral-400">{workflow.trigger}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-neutral-600 dark:text-neutral-400">{workflow.owner}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-4 text-neutral-500">
                      <button onClick={() => togglePauseResume(workflow.name)} className="hover:text-primary dark:text-neutral-400 dark:hover:text-primary" title="Pause / Resume">
                        <span className="material-symbols-outlined text-xl">{workflow.status === 'Paused' ? 'play_arrow' : 'pause'}</span>
                      </button>
                      <button className="hover:text-primary dark:text-neutral-400 dark:hover:text-primary">
                        <span className="material-symbols-outlined text-xl">history</span>
                      </button>
                      <button onClick={() => removeWorkflow(workflow.name)} className="hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-500">
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default WorkflowManagement;
