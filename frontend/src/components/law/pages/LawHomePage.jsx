import React from 'react';

const trendBars = [62, 71, 68, 76, 84, 79, 91];

const getCount = (records, matcher) => records.filter(matcher).length;

const LawHomePage = ({ records = [], onSectionChange }) => {
  const totalAgreements = getCount(records, (r) => r.section === 'agreements');
  const activeContracts = getCount(records, (r) => r.section === 'agreements' && r.status === 'Active');
  const pendingApprovals = getCount(records, (r) => r.status === 'Pending' || r.status === 'In Review');
  const fraudAlerts = getCount(records, (r) => r.section === 'disputes-fraud' && (r.metadata?.severity === 'High' || r.metadata?.severity === 'Critical'));
  const disputesOpen = getCount(records, (r) => r.section === 'disputes-fraud' && r.status !== 'Archived');
  const disputesResolved = getCount(records, (r) => r.section === 'disputes-fraud' && (r.status === 'Ready' || r.status === 'Archived'));

  const cards = [
    ['Total Agreements', totalAgreements, 'contract'],
    ['Active Contracts', activeContracts, 'verified'],
    ['Pending Approvals', pendingApprovals, 'pending_actions'],
    ['Fraud Alerts', fraudAlerts, 'warning'],
    ['Disputes Open / Resolved', `${disputesOpen} / ${disputesResolved}`, 'balance'],
  ];

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Legal Intelligence</p>
          <h1 className="mt-2 text-3xl font-black text-neutral-900 dark:text-white">LAW Management Dashboard</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Central legal brain for agreements, disputes, fraud, compliance, third-party risk, and AI insights.
          </p>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {cards.map(([title, value, icon]) => (
            <article key={title} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <span className="material-symbols-outlined text-primary">{icon}</span>
              <p className="mt-3 text-2xl font-black text-neutral-900 dark:text-white">{value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <article className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 xl:col-span-2">
            <h2 className="font-bold text-neutral-900 dark:text-white">Agreement Growth (Monthly)</h2>
            <div className="mt-4 flex h-40 items-end gap-2">
              {trendBars.map((value, index) => (
                <div key={index} className="flex-1 rounded-t bg-primary/80" style={{ height: `${value}%` }} />
              ))}
            </div>
          </article>
          <article className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="font-bold text-neutral-900 dark:text-white">Priority Workflow</h2>
            <div className="mt-4 space-y-3 text-sm">
              <button onClick={() => onSectionChange?.('agreements')} className="w-full rounded-lg bg-neutral-100 px-3 py-2 text-left dark:bg-neutral-800">1. Agreement Created -&gt; Admin Approval -&gt; Active</button>
              <button onClick={() => onSectionChange?.('work-hire')} className="w-full rounded-lg bg-neutral-100 px-3 py-2 text-left dark:bg-neutral-800">2. Work on Hire -&gt; Contract -&gt; Payment -&gt; Work Start</button>
              <button onClick={() => onSectionChange?.('disputes-fraud')} className="w-full rounded-lg bg-neutral-100 px-3 py-2 text-left dark:bg-neutral-800">3. Fraud Detected -&gt; Alert -&gt; Investigation -&gt; Resolution</button>
              <button onClick={() => onSectionChange?.('privacy-policy')} className="w-full rounded-lg bg-neutral-100 px-3 py-2 text-left dark:bg-neutral-800">4. Policy Updated -&gt; User Notification</button>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
};

export default LawHomePage;
