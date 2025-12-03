import React from 'react';

const reportStats = [
  { label: 'Weekly Reports', value: '12', change: '+4 new' },
  { label: 'Financial Summaries', value: '8', change: 'Quarterly' },
  { label: 'Project Status', value: '5', change: '3 pending' },
  { label: 'Team Insights', value: '10', change: 'Updated daily' },
];

const quickReports = [
  { title: 'Q3 Sales Performance', category: 'Financial', date: '2023-10-01' },
  { title: 'Alpha Project Sprint #5 Summary', category: 'Project Status', date: '2023-10-25' },
  { title: 'Weekly Team Productivity Analysis', category: 'Team Performance', date: '2023-10-27' },
  { title: 'Marketing Campaign ROI', category: 'Financial', date: '2023-09-30' },
];

const ManagerReports = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-900 dark:text-white">
              Reports Dashboard
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Monitor performance analytics and export on-demand reports.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">
              <span className="material-symbols-outlined text-base">download</span>
              Export All
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
              <span className="material-symbols-outlined text-base">add</span>
              New Report
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reportStats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{stat.label}</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
              <p className="text-xs font-semibold text-primary">{stat.change}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Revenue vs Target</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-[32px] font-bold text-neutral-900 dark:text-white">$1.2M</p>
                  <p className="text-sm font-semibold text-green-500">+12.3% this quarter</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-neutral-100 p-1 text-xs dark:bg-neutral-800">
                {['Week', 'Month', 'Quarter'].map((label, idx) => (
                  <button
                    key={label}
                    className={`rounded-full px-3 py-1 font-semibold ${
                      idx === 2
                        ? 'bg-white text-primary shadow dark:bg-neutral-700 dark:text-white'
                        : 'text-neutral-500 hover:bg-white dark:text-neutral-400 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 h-56 w-full">
              <svg
                viewBox="0 0 472 180"
                className="h-full w-full"
                fill="none"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="managerReportsGradient" x1="236" x2="236" y1="0" y2="180">
                    <stop stopColor="#135bec" stopOpacity="0.2" />
                    <stop offset="1" stopColor="#135bec" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 140C18 140 18 40 36 40C54 40 54 60 72 60C90 60 90 120 108 120C126 120 126 50 144 50C162 50 162 130 180 130C198 130 198 90 216 90C234 90 234 70 252 70C270 70 270 150 288 150C306 150 306 178 324 178C342 178 342 20 360 20C378 20 378 100 396 100C414 100 414 150 432 150C450 150 450 45 468 45V178H0Z"
                  fill="url(#managerReportsGradient)"
                ></path>
                <path
                  d="M0 140C18 140 18 40 36 40C54 40 54 60 72 60C90 60 90 120 108 120C126 120 126 50 144 50C162 50 162 130 180 130C198 130 198 90 216 90C234 90 234 70 252 70C270 70 270 150 288 150C306 150 306 178 324 178C342 178 342 20 360 20C378 20 378 100 396 100C414 100 414 150 432 150C450 150 450 45 468 45"
                  stroke="#135bec"
                  strokeWidth="3"
                  strokeLinecap="round"
                ></path>
              </svg>
            </div>
          </section>
          <section className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Filters</p>
            <div className="mt-4 space-y-4 text-sm">
              <label className="flex flex-col">
                Department
                <select className="mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white">
                  <option>All</option>
                  <option>Sales</option>
                  <option>Product</option>
                  <option>Marketing</option>
                </select>
              </label>
              <label className="flex flex-col">
                Date Range
                <input
                  type="date"
                  className="mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  defaultValue="2023-10-01"
                />
              </label>
              <label className="flex flex-col">
                Report Type
                <select className="mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white">
                  <option>All Types</option>
                  <option>Financial</option>
                  <option>Project</option>
                  <option>Team</option>
                </select>
              </label>
              <button className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-neutral-900 text-sm font-semibold text-white hover:bg-neutral-800 dark:bg-neutral-700 dark:hover:bg-neutral-600">
                Apply Filters
              </button>
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/40">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">All Reports</h2>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                search
              </span>
              <input
                className="h-10 rounded-lg border border-neutral-200 bg-white pl-10 pr-4 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                placeholder="Search reports..."
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-neutral-200 text-xs font-semibold uppercase text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                <tr>
                  <th className="px-6 py-3">Report Name</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Last Generated</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {quickReports.map((report) => (
                  <tr key={report.title} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900 dark:text-white">{report.title}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{report.category}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{report.date}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button className="flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700/60">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          View
                        </button>
                        <button className="flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700/60">
                          <span className="material-symbols-outlined text-sm">download</span>
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ManagerReports;
