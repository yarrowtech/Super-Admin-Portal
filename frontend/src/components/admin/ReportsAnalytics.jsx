import React from 'react';

const predefinedReports = [
  { icon: 'monitoring', title: 'User Activity', description: 'Logins, signups, and feature usage.' },
  { icon: 'article', title: 'Content Statistics', description: 'Views, shares, and engagement rates.' },
  { icon: 'payments', title: 'Financial Summaries', description: 'Revenue, expenses, and profit margins.' },
  { icon: 'dns', title: 'System Performance', description: 'Uptime, response times, and errors.' },
];

const customReports = [
  { name: 'Q4 Financial Summary', date: '2024-01-15', status: 'Completed', statusColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { name: 'Monthly User Signup', date: '2024-02-01', status: 'Completed', statusColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { name: 'Content Performance Q1', date: '2024-03-05', status: 'Processing', statusColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
];

const ReportsAnalytics = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
            Reports &amp; Analytics Center
          </h1>
          <div className="flex items-center gap-4">
            <button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
              <span className="material-symbols-outlined">download</span>
              Export
            </button>
            <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90">
              <span className="material-symbols-outlined">add</span>
              Generate Report
            </button>
          </div>
        </header>

        <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300" htmlFor="report-type">
                Report Type
              </label>
              <select
                id="report-type"
                className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary focus:ring-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option>User Activity</option>
                <option>Content Statistics</option>
                <option>Financial Summary</option>
                <option>System Performance</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300" htmlFor="date-range">
                Date Range
              </label>
              <input
                id="date-range"
                type="date"
                defaultValue="2024-01-01"
                className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary focus:ring-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300" htmlFor="department">
                Department
              </label>
              <select
                id="department"
                className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary focus:ring-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option>All Departments</option>
                <option>Engineering</option>
                <option>Marketing</option>
                <option>Sales</option>
              </select>
            </div>
            <div className="flex items-end">
              <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-neutral-800 px-4 text-sm font-semibold text-white hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600">
                <span className="material-symbols-outlined">filter_alt</span>
                Apply Filters
              </button>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-neutral-900 dark:text-neutral-100">Predefined Reports</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {predefinedReports.map((report) => (
              <div key={report.title} className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                  <span className="material-symbols-outlined text-3xl">{report.icon}</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{report.title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{report.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-neutral-900 dark:text-neutral-100">Analytics Dashboard</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-base font-medium text-neutral-900 dark:text-neutral-300">Content Engagement Rate</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-[32px] font-bold tracking-tight text-neutral-900 dark:text-neutral-100">72.3%</p>
                    <p className="text-sm font-medium text-green-600 dark:text-green-500">+3.1% This Month</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
                  {['Week', 'Month', 'Year'].map((period, idx) => (
                    <button
                      key={period}
                      className={`rounded-md px-3 py-1 text-sm font-medium ${
                        idx === 1
                          ? 'bg-white text-primary shadow-sm dark:bg-neutral-700 dark:text-white'
                          : 'text-neutral-500 hover:bg-white dark:text-neutral-400 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
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
                    <linearGradient gradientUnits="userSpaceOnUse" id="reportsChartGradient" x1="236" x2="236" y1="1" y2="149">
                      <stop stopColor="#135bec" stopOpacity="0.2"></stop>
                      <stop offset="1" stopColor="#135bec" stopOpacity="0"></stop>
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 83C18.1538 83 18.1538 127 36.3077 127C54.4615 127 54.4615 107 72.6154 107C90.7692 107 90.7692 55 108.923 55C127.077 55 127.077 115 145.231 115C163.385 115 163.385 47 181.538 47C199.692 47 199.692 87 217.846 87C236 87 236 103 254.154 103C272.308 103 272.308 27 290.462 27C308.615 27 308.615 1 326.769 1C344.923 1 344.923 147 363.077 147C381.231 147 381.231 67 399.385 67C417.538 67 417.538 19 435.692 19C453.846 19 453.846 123 472 123V149H0V83Z"
                    fill="url(#reportsChartGradient)"
                  ></path>
                  <path
                    d="M0 83C18.1538 83 18.1538 127 36.3077 127C54.4615 127 54.4615 107 72.6154 107C90.7692 107 90.7692 55 108.923 55C127.077 55 127.077 115 145.231 115C163.385 115 163.385 47 181.538 47C199.692 47 199.692 87 217.846 87C236 87 236 103 254.154 103C272.308 103 272.308 27 290.462 27C308.615 27 308.615 1 326.769 1C344.923 1 344.923 147 363.077 147C381.231 147 381.231 67 399.385 67C417.538 67 417.538 19 435.692 19C453.846 19 453.846 123 472 123"
                    stroke="#135bec"
                    strokeLinecap="round"
                    strokeWidth="3"
                  ></path>
                </svg>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="mb-4 text-lg font-bold text-neutral-900 dark:text-neutral-100">Recent Custom Reports</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                    <tr>
                      <th className="px-4 py-3">Report Name</th>
                      <th className="px-4 py-3">Date Generated</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customReports.map((report) => (
                      <tr key={report.name} className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
                        <td className="whitespace-nowrap px-4 py-4 font-medium text-neutral-900 dark:text-neutral-100">
                          {report.name}
                        </td>
                        <td className="px-4 py-4 text-neutral-600 dark:text-neutral-400">{report.date}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${report.statusColor}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            className={`font-medium ${report.status === 'Processing' ? 'text-neutral-400' : 'text-primary hover:underline'}`}
                            disabled={report.status === 'Processing'}
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ReportsAnalytics;
