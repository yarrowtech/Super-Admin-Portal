import React, { useMemo, useState } from 'react';

const baseIssues = [
  { text: "Multiple failed login attempts for 'admin'.", time: '15 minutes ago' },
  { text: "Unusual login location detected for 'john.doe'.", time: '2 hours ago' },
  { text: "Administrator role granted to 'sara.c'.", time: '1 day ago' },
];

const SecurityMonitoring = () => {
  const [enforce2FA, setEnforce2FA] = useState(true);
  const [enforceStrongPassword, setEnforceStrongPassword] = useState(true);
  const [issuesQuery, setIssuesQuery] = useState('');
  const [sessionTimeoutMins] = useState(30);

  const visibleIssues = useMemo(() => {
    const q = issuesQuery.trim().toLowerCase();
    if (!q) return baseIssues;
    return baseIssues.filter((a) => `${a.text} ${a.time}`.toLowerCase().includes(q));
  }, [issuesQuery]);

  const hasIssues = baseIssues.length > 0;

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-5">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-5">
          <h1 className="text-3xl font-black tracking-[-0.02em] text-neutral-800 dark:text-neutral-100">Security</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Only essential security controls and active issues.</p>
        </header>

        <section className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">2FA Policy</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">Enforce for all users</p>
              <input type="checkbox" checked={enforce2FA} onChange={(e) => setEnforce2FA(e.target.checked)} />
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">Password Policy</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">Require strong password</p>
              <input type="checkbox" checked={enforceStrongPassword} onChange={(e) => setEnforceStrongPassword(e.target.checked)} />
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">Session Timeout</p>
            <p className="mt-2 font-semibold text-neutral-900 dark:text-neutral-100">{sessionTimeoutMins} minutes inactivity</p>
          </div>
        </section>

        {hasIssues ? (
          <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-800 dark:bg-neutral-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Active Security Issues</h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {baseIssues.length} open
              </span>
            </div>
            <input
              className="w-full rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              placeholder="Search issues"
              value={issuesQuery}
              onChange={(e) => setIssuesQuery(e.target.value)}
            />
            <div className="mt-3 space-y-3">
              {visibleIssues.map((issue) => (
                <div key={issue.text} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{issue.text}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{issue.time}</p>
                </div>
              ))}
              {visibleIssues.length === 0 ? <p className="text-sm text-neutral-500">No issues match this search.</p> : null}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            No active security issues.
          </section>
        )}
      </div>
    </main>
  );
};

export default SecurityMonitoring;
