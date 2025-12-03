import React from 'react';

const roles = [
  {
    name: 'Administrator',
    description: 'Full access to all system features.',
    users: 5,
  },
  {
    name: 'Editor',
    description: 'Can create, edit, and publish content.',
    users: 22,
  },
  {
    name: 'Viewer',
    description: 'Read-only access to content and reports.',
    users: 150,
  },
  {
    name: 'Moderator',
    description: 'Can manage user-generated content.',
    users: 8,
  },
];

const toggles = [
  {
    title: 'Two-Factor Authentication (2FA)',
    description: 'Require all users to enable 2FA.',
    type: 'switch',
    defaultChecked: true,
  },
  {
    title: 'Password Policy',
    description: 'Enforce strong password rules.',
    type: 'button',
    action: 'Configure',
  },
  {
    title: 'Session Timeout',
    description: 'Auto-logout after inactivity.',
    type: 'button',
    action: 'Set Duration',
  },
];

const alerts = [
  {
    icon: 'warning',
    color: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
    text: "Multiple failed login attempts for 'admin'.",
    time: '15 minutes ago',
  },
  {
    icon: 'new_releases',
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400',
    text: "Unusual login location detected for 'john.doe'.",
    time: '2 hours ago',
  },
  {
    icon: 'verified_user',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
    text: "Administrator role granted to 'sara.c'.",
    time: '1 day ago',
  },
];

const tabs = ['Role-Based Access', 'Audit Logs', 'Security Alerts', 'Incident Management', 'Integrations'];

const SecurityMonitoring = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
            Security Settings &amp; Monitoring
          </h1>
          <div className="flex items-center gap-4">
            <button className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary"></span>
            </button>
            <div
              className="h-12 w-12 rounded-xl bg-cover bg-center"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDVludAUrmd8sd8fXodvEVKKlS_rxSh9WQfkfNba-0OlGwx8KvAgXeCL0TXiPbQ3hm98HdSKwBJv2zyIsnXSth4L_q4IK2rr2JDEoY7pFMJlHzKe6rZlXhBdw5IwvLlqnekZkv4mYGqlg26WMdVo8VkbjXyHRqNv6MDeyxFAb6Zs_OXXd8U6pr-IpgWmJe5qqWLgCfxPEFKaLQGO3Tj2sEtgt-UIsHh1LaaCd6AJKUecI7kABzmneS_sN-hkod2T3q2fKv8LytplLIB")',
              }}
            ></div>
          </div>
        </header>

        <div className="mb-6 border-b border-neutral-200 dark:border-neutral-800">
          <nav className="-mb-px flex space-x-6 text-sm">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                className={`border-b-2 px-1 py-4 ${
                  index === 0
                    ? 'border-primary font-semibold text-primary'
                    : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Role-Based Access Control</h2>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    Manage user roles and their permissions across the platform.
                  </p>
                </div>
                <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
                  <span className="material-symbols-outlined text-base">add</span>
                  New Role
                </button>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
                  <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                    <tr>
                      <th className="px-6 py-3 text-left">Role Name</th>
                      <th className="px-6 py-3 text-left">Description</th>
                      <th className="px-6 py-3 text-left">Users</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
                    {roles.map((role) => (
                      <tr key={role.name}>
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-neutral-900 dark:text-neutral-100">
                          {role.name}
                        </td>
                        <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">{role.description}</td>
                        <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">{role.users}</td>
                        <td className="px-6 py-4 text-right">
                          <button className="font-medium text-primary hover:text-primary/80">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

            <aside className="flex flex-col gap-6">
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">General Settings</h2>
              <div className="mt-6 space-y-6">
                {toggles.map((item) => (
                  <div key={item.title} className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-neutral-800 dark:text-neutral-200">{item.title}</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{item.description}</p>
                    </div>
                    {item.type === 'switch' ? (
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" defaultChecked={item.defaultChecked} className="peer sr-only" />
                        <span className="peer h-6 w-11 rounded-full bg-neutral-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white"></span>
                      </label>
                    ) : (
                      <button className="text-sm font-semibold text-primary hover:text-primary/80">{item.action}</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Recent Security Alerts</h2>
              <div className="mt-4 space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.text} className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${alert.color}`}>
                      <span className="material-symbols-outlined text-base">{alert.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{alert.text}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{alert.time}</p>
                    </div>
                  </div>
                ))}
                <button className="mt-2 w-full text-sm font-semibold text-primary hover:underline">View All Alerts</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default SecurityMonitoring;
