import React from 'react';

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
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              Workflows Management
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Monitor, create, and manage all automated workflows.
            </p>
          </div>
          <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90">
            <span className="material-symbols-outlined">add</span>
            Create Workflow
          </button>
        </header>

        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
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
              {workflows.map((workflow) => (
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
                      <button className="hover:text-primary dark:text-neutral-400 dark:hover:text-primary">
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button className="hover:text-primary dark:text-neutral-400 dark:hover:text-primary">
                        <span className="material-symbols-outlined text-xl">history</span>
                      </button>
                      <button className="hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-500">
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
