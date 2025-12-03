import React from 'react';

const CEODashboard = () => {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-8">
        {/* Page Heading */}
        <div className="flex flex-wrap justify-between gap-4 items-center mb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              CEO Executive Dashboard
            </h1>
            <p className="text-base font-normal leading-normal text-neutral-600 dark:text-neutral-400">
              Consolidated view of all departmental performance.
            </p>
          </div>
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-neutral-50 dark:hover:bg-neutral-700">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              calendar_today
            </span>
            <span className="truncate">Last 30 Days</span>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              expand_more
            </span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-base font-medium leading-normal text-neutral-600 dark:text-neutral-400">Total Revenue</p>
            <p className="tracking-tight text-3xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              $12.8M
            </p>
            <p className="text-base font-medium leading-normal text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_upward
              </span>
              <span>+2.5%</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-base font-medium leading-normal text-neutral-600 dark:text-neutral-400">New Customers</p>
            <p className="tracking-tight text-3xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              1,450
            </p>
            <p className="text-base font-medium leading-normal text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_upward
              </span>
              <span>+1.8%</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-base font-medium leading-normal text-neutral-600 dark:text-neutral-400">
              Project Completion
            </p>
            <p className="tracking-tight text-3xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">89%</p>
            <p className="text-base font-medium leading-normal text-red-600 dark:text-red-400 flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_downward
              </span>
              <span>-0.5%</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-base font-medium leading-normal text-neutral-600 dark:text-neutral-400">System Uptime</p>
            <p className="tracking-tight text-3xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              99.98%
            </p>
            <p className="text-base font-medium leading-normal text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_upward
              </span>
              <span>+0.01%</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content area */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Revenue Chart */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">Revenue Over Time</h3>
              <div className="h-64 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
                <div className="text-center">
                  <span className="material-symbols-outlined text-neutral-400 dark:text-neutral-500 text-6xl mb-4 block">
                    trending_up
                  </span>
                  <p className="text-neutral-400 dark:text-neutral-500">Revenue Chart Analytics</p>
                </div>
              </div>
            </div>

            {/* Departmental KPIs */}
            <div>
              <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] mb-4 text-neutral-800 dark:text-neutral-100">
                Departmental KPIs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-neutral-800 dark:text-neutral-100">A/C & Finance</h4>
                    <button className="text-sm font-bold text-primary hover:underline">View Details</button>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Profit Margin</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">+18.2%</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Burn Rate</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">$1.2M / mo</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-neutral-800 dark:text-neutral-100">Sales & Growth</h4>
                    <button className="text-sm font-bold text-primary hover:underline">View Details</button>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">New Leads (30d)</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">4,281</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Conversion Rate</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">5.7%</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-neutral-800 dark:text-neutral-100">Human Resources</h4>
                    <button className="text-sm font-bold text-primary hover:underline">View Details</button>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Attrition Rate</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">3.1%</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Open High-Priority Roles</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">4</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-neutral-800 dark:text-neutral-100">Legal & Compliance</h4>
                    <button className="text-sm font-bold text-primary hover:underline">View Details</button>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Major Contracts Pending</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">2</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Compliance Adherence</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">99.8%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar content area */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Critical Alerts */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">Critical Alerts</h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="text-red-600 dark:text-red-400 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20 shrink-0 size-12">
                    <span className="material-symbols-outlined">error</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-base font-medium leading-normal line-clamp-1 text-neutral-800 dark:text-neutral-100">
                      Major System Outage
                    </p>
                    <p className="text-sm font-normal leading-normal line-clamp-2 text-neutral-600 dark:text-neutral-400">
                      Main auth server unresponsive. IT notified.
                    </p>
                    <p className="text-xs font-normal leading-normal text-neutral-400 dark:text-neutral-500 mt-1">
                      5m ago
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="text-yellow-600 dark:text-yellow-400 flex items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/20 shrink-0 size-12">
                    <span className="material-symbols-outlined">warning</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-base font-medium leading-normal line-clamp-1 text-neutral-800 dark:text-neutral-100">
                      Q3 Budget Overrun
                    </p>
                    <p className="text-sm font-normal leading-normal line-clamp-2 text-neutral-600 dark:text-neutral-400">
                      Marketing department has exceeded their quarterly budget by 15%.
                    </p>
                    <p className="text-xs font-normal leading-normal text-neutral-400 dark:text-neutral-500 mt-1">
                      2h ago
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="text-red-600 dark:text-red-400 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20 shrink-0 size-12">
                    <span className="material-symbols-outlined">security</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-base font-medium leading-normal line-clamp-1 text-neutral-800 dark:text-neutral-100">
                      High Severity Security Threat
                    </p>
                    <p className="text-sm font-normal leading-normal line-clamp-2 text-neutral-600 dark:text-neutral-400">
                      A new vulnerability has been detected in the primary database.
                    </p>
                    <p className="text-xs font-normal leading-normal text-neutral-400 dark:text-neutral-500 mt-1">
                      1d ago
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Campaigns Table */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">
                Top Performing Campaigns
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="py-2 pr-2 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                        Campaign
                      </th>
                      <th className="py-2 px-2 text-sm font-semibold text-neutral-600 dark:text-neutral-400 text-right">
                        ROI
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <td className="py-3 pr-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        Summer Sale 2024
                      </td>
                      <td className="py-3 px-2 text-sm font-medium text-green-600 dark:text-green-400 text-right">
                        320%
                      </td>
                    </tr>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <td className="py-3 pr-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        Product Launch Webinar
                      </td>
                      <td className="py-3 px-2 text-sm font-medium text-green-600 dark:text-green-400 text-right">
                        250%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        Q3 Social Media Push
                      </td>
                      <td className="py-3 px-2 text-sm font-medium text-green-600 dark:text-green-400 text-right">
                        180%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CEODashboard;