import React from 'react';

const AdminDashboard = () => {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-8">
        {/* Header Bar */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
            Dashboard
          </h1>
          <div className="flex flex-grow items-center justify-end gap-4 md:flex-grow-0">
            {/* SearchBar */}
            <div className="w-full max-w-sm">
              <label className="flex h-12 min-w-40 w-full flex-col">
                <div className="flex h-full w-full flex-1 items-stretch rounded-xl">
                  <div className="flex items-center justify-center rounded-l-xl border border-r-0 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-4 text-neutral-500 dark:text-neutral-400">
                    <span className="material-symbols-outlined">search</span>
                  </div>
                  <input
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-xl border border-l-0 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 text-base font-normal leading-normal text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:border-primary focus:outline-0 focus:ring-0"
                    placeholder="Search users, content..."
                    value=""
                  />
                </div>
              </label>
            </div>
            <button className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary"></span>
            </button>
            <div
              className="h-12 w-12 rounded-xl bg-cover bg-center"
              data-alt="Super admin user avatar"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB_HFSbNHCmNgTeKZAiFk2MqdSEqd36bsfGVXM1jMm4u-rmgBnoBDcVJpkRH2VlN__XL8gTeUCSNaWwJKRI1aQWTzEJFlZwOsBOty_vqThHZd_iMdGC6uv-at2zgu8HswCT2SKDxAFdEANBncCJPPnVF1JdJE9LC2WD9x9fHsLvY8x4J6_F_lwFafZnDp-dxW2kdcZUMybmvUNwjVpPxdbp4V3asAgzpdG_97qVGZe72iXV5Qth5NM66WFVrkCjZS88_sYOYcCBphv1")',
              }}
            ></div>
          </div>
        </header>

        {/* Stats Cards */}
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
            <p className="text-base font-medium text-neutral-800 dark:text-neutral-300">Total Users</p>
            <p className="text-3xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">1,482</p>
            <p className="text-sm font-medium text-green-600 dark:text-green-500">+5.4% this month</p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
            <p className="text-base font-medium text-neutral-800 dark:text-neutral-300">Active Projects</p>
            <p className="text-3xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">256</p>
            <p className="text-sm font-medium text-green-600 dark:text-green-500">+1.2% this month</p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
            <p className="text-base font-medium text-neutral-800 dark:text-neutral-300">Pending Approvals</p>
            <p className="text-3xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">12</p>
            <p className="text-sm font-medium text-orange-600 dark:text-orange-500">+2.0% this week</p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
            <p className="text-base font-medium text-neutral-800 dark:text-neutral-300">System Health</p>
            <p className="text-3xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">99.9%</p>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">All systems operational</p>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Chart and Recent Activity */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Chart */}
            <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-base font-medium text-neutral-800 dark:text-neutral-300">User Growth Overview</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-[32px] font-bold tracking-tight text-neutral-800 dark:text-neutral-100">8,421</p>
                    <p className="text-sm font-medium text-green-600 dark:text-green-500">+12.5% This Month</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1">
                  <button className="rounded-md px-3 py-1 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:bg-white dark:hover:bg-neutral-700">
                    Week
                  </button>
                  <button className="rounded-md bg-white dark:bg-neutral-700 px-3 py-1 text-sm font-medium text-primary shadow-sm dark:text-neutral-100">
                    Month
                  </button>
                  <button className="rounded-md px-3 py-1 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:bg-white dark:hover:bg-neutral-700">
                    Year
                  </button>
                </div>
              </div>
              <div className="mt-4 flex min-h-[220px] flex-1 flex-col gap-8 py-4">
                <svg
                  fill="none"
                  height="100%"
                  preserveAspectRatio="none"
                  viewBox="0 0 472 150"
                  width="100%"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient
                      gradientUnits="userSpaceOnUse"
                      id="chartGradient"
                      x1="236"
                      x2="236"
                      y1="1"
                      y2="149"
                    >
                      <stop stopColor="#135bec" stopOpacity="0.2"></stop>
                      <stop offset="1" stopColor="#135bec" stopOpacity="0"></stop>
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H0V109Z"
                    fill="url(#chartGradient)"
                  ></path>
                  <path
                    d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25"
                    stroke="#135bec"
                    strokeLinecap="round"
                    strokeWidth="3"
                  ></path>
                </svg>
              </div>
              <div className="flex justify-around">
                <p className="text-[13px] font-bold leading-normal tracking-[0.015em] text-neutral-600 dark:text-neutral-400">
                  Week 1
                </p>
                <p className="text-[13px] font-bold leading-normal tracking-[0.015em] text-neutral-600 dark:text-neutral-400">
                  Week 2
                </p>
                <p className="text-[13px] font-bold leading-normal tracking-[0.015em] text-neutral-600 dark:text-neutral-400">
                  Week 3
                </p>
                <p className="text-[13px] font-bold leading-normal tracking-[0.015em] text-neutral-600 dark:text-neutral-400">
                  Week 4
                </p>
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <h2 className="mb-4 text-xl font-bold text-neutral-800 dark:text-neutral-100">Recent Activities</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                    <span className="material-symbols-outlined">person_add</span>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">
                      New user 'alex.doe' has signed up.
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                    <span className="material-symbols-outlined">edit_document</span>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">
                      Article "Getting Started with Tailwind" was published.
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">1 hour ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                    <span className="material-symbols-outlined">delete</span>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">
                      User 'jane.smith' was removed from the 'Editors' group.
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">3 hours ago</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Quick Links */}
          <aside className="flex flex-col gap-6 lg:col-span-1">
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Quick Links</h2>
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                  <span className="material-symbols-outlined text-3xl">manage_accounts</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">User Management</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Add, remove, or edit user permissions and roles.
                </p>
                <button className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
                  Go to Users
                </button>
              </div>
              <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                  <span className="material-symbols-outlined text-3xl">rate_review</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Content Moderation</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Review and approve new articles, comments, and posts.
                </p>
                <button className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  Manage Content
                </button>
              </div>
              <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                  <span className="material-symbols-outlined text-3xl">tune</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">System Settings</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Configure global application settings and integrations.
                </p>
                <button className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  Configure Settings
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default AdminDashboard;