import React from 'react';

const CEODashboard = () => {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl p-6">
        {/* Page Heading */}
        <div className="flex flex-wrap justify-between gap-4 items-center mb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              CEO Executive Dashboard
            </h1>
            <p className="text-sm font-normal leading-normal text-neutral-600 dark:text-neutral-400">
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

        {/* Executive Snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Revenue (QTD)</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              $12.8M
            </p>
            <p className="text-sm font-medium leading-normal text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_upward
              </span>
              <span>+2.5%</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Cost (QTD)</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              $8.4M
            </p>
            <p className="text-sm font-medium leading-normal text-red-600 dark:text-red-400 flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_upward
              </span>
              <span>+1.1%</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Profit (QTD)</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              $4.4M
            </p>
            <p className="text-sm font-medium leading-normal text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_upward
              </span>
              <span>+3.2%</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Active Projects</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">48</p>
            <p className="text-sm font-medium leading-normal text-neutral-500 dark:text-neutral-400">+6 this month</p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Completed Projects</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              132
            </p>
            <p className="text-sm font-medium leading-normal text-neutral-500 dark:text-neutral-400">89% success rate</p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Employee Strength</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              1,240
            </p>
            <p className="text-sm font-medium leading-normal text-green-600 dark:text-green-400">+12 net hires</p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Growth Trend</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">MoM 6.1%</p>
            <p className="text-sm font-medium leading-normal text-green-600 dark:text-green-400">YoY 18.4%</p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">
              Critical Pending Approvals
            </p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">9</p>
            <p className="text-sm font-medium leading-normal text-red-600 dark:text-red-400">4 overdue</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Revenue / Cost / Profit Overview */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    Revenue, Cost & Profit Overview
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Quarterly performance with margin tracking.
                  </p>
                </div>
                <button className="text-sm font-bold text-primary hover:underline">View Full P&L</button>
              </div>
              <div className="h-56 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
                <div className="text-center">
                  <span className="material-symbols-outlined text-neutral-400 dark:text-neutral-500 text-6xl mb-4 block">
                    query_stats
                  </span>
                  <p className="text-neutral-400 dark:text-neutral-500">Revenue / Cost / Profit Trend</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Revenue</p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">$12.8M</p>
                  <p className="text-xs text-green-600 dark:text-green-400">+2.5% QTD</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Cost</p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">$8.4M</p>
                  <p className="text-xs text-red-600 dark:text-red-400">+1.1% QTD</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Profit</p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">$4.4M</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Margin 34.2%</p>
                </div>
              </div>
            </div>

            {/* Project-wise KPI */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Project-wise KPI</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Revenue, cost, profit and status by project.
                  </p>
                </div>
                <button className="text-sm font-bold text-primary hover:underline">View All Projects</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Project
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Revenue
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Cost
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Profit
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Status
                      </th>
                      <th className="py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Risk
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <td className="py-3 pr-3 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        Phoenix ERP Modernization
                      </td>
                      <td className="py-3 pr-3 text-sm text-neutral-700 dark:text-neutral-300">$2.4M</td>
                      <td className="py-3 pr-3 text-sm text-neutral-700 dark:text-neutral-300">$1.6M</td>
                      <td className="py-3 pr-3 text-sm font-semibold text-green-600 dark:text-green-400">
                        $0.8M
                      </td>
                      <td className="py-3 pr-3 text-sm text-neutral-700 dark:text-neutral-300">Active</td>
                      <td className="py-3 text-sm text-yellow-600 dark:text-yellow-400">Medium</td>
                    </tr>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <td className="py-3 pr-3 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        Atlas Cloud Migration
                      </td>
                      <td className="py-3 pr-3 text-sm text-neutral-700 dark:text-neutral-300">$3.1M</td>
                      <td className="py-3 pr-3 text-sm text-neutral-700 dark:text-neutral-300">$2.2M</td>
                      <td className="py-3 pr-3 text-sm font-semibold text-green-600 dark:text-green-400">
                        $0.9M
                      </td>
                      <td className="py-3 pr-3 text-sm text-neutral-700 dark:text-neutral-300">Active</td>
                      <td className="py-3 text-sm text-red-600 dark:text-red-400">High</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-3 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        Orion Media Expansion
                      </td>
                      <td className="py-3 pr-3 text-sm text-neutral-700 dark:text-neutral-300">$1.7M</td>
                      <td className="py-3 pr-3 text-sm text-neutral-700 dark:text-neutral-300">$1.1M</td>
                      <td className="py-3 pr-3 text-sm font-semibold text-green-600 dark:text-green-400">
                        $0.6M
                      </td>
                      <td className="py-3 pr-3 text-sm text-neutral-700 dark:text-neutral-300">Completed</td>
                      <td className="py-3 text-sm text-green-600 dark:text-green-400">Low</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Active vs Completed
                  </p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">48 Active / 132 Completed</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">89% completion success</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Employee Strength on Projects
                  </p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">768 Allocated</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">472 available</p>
                </div>
              </div>
            </div>

            {/* Growth Trends */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Growth Trends</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">MoM and YoY trend analysis.</p>
                </div>
                <button className="text-sm font-bold text-primary hover:underline">Open Trend Report</button>
              </div>
              <div className="h-52 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
                <div className="text-center">
                  <span className="material-symbols-outlined text-neutral-400 dark:text-neutral-500 text-6xl mb-4 block">
                    monitoring
                  </span>
                  <p className="text-neutral-400 dark:text-neutral-500">MoM / YoY Growth Chart</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Revenue MoM</p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">+6.1%</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Profit YoY</p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">+18.4%</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Customer Growth</p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">+12.3%</p>
                </div>
              </div>
            </div>

            {/* Department Performance */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] text-neutral-800 dark:text-neutral-100">
                    Department Performance
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    HR, Finance, IT, and Media performance metrics.
                  </p>
                </div>
                <button className="text-sm font-bold text-primary hover:underline">Comparison View</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-neutral-800 dark:text-neutral-100">Human Resources</h4>
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">On Track</span>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Hiring Velocity</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">+18 roles</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Attrition Rate</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">3.1%</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-neutral-800 dark:text-neutral-100">Finance</h4>
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">Healthy</span>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Profit Margin</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">+18.2%</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Cash Runway</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">14 months</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-neutral-800 dark:text-neutral-100">IT</h4>
                    <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">At Risk</span>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Incident MTTR</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">2.4 hrs</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Critical Tickets</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">7</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-neutral-800 dark:text-neutral-100">Media</h4>
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">Strong</span>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Engagement Rate</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">6.8%</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Campaign ROI</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">+220%</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 overflow-x-auto bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Department
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        KPI Score
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Budget Use
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <td className="py-3 px-4 text-sm text-neutral-800 dark:text-neutral-100">HR</td>
                      <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">92</td>
                      <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">76%</td>
                      <td className="py-3 px-4 text-sm text-green-600 dark:text-green-400">On Track</td>
                    </tr>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <td className="py-3 px-4 text-sm text-neutral-800 dark:text-neutral-100">Finance</td>
                      <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">88</td>
                      <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">68%</td>
                      <td className="py-3 px-4 text-sm text-green-600 dark:text-green-400">Healthy</td>
                    </tr>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <td className="py-3 px-4 text-sm text-neutral-800 dark:text-neutral-100">IT</td>
                      <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">74</td>
                      <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">83%</td>
                      <td className="py-3 px-4 text-sm text-yellow-600 dark:text-yellow-400">At Risk</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-sm text-neutral-800 dark:text-neutral-100">Media</td>
                      <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">95</td>
                      <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">71%</td>
                      <td className="py-3 px-4 text-sm text-green-600 dark:text-green-400">Strong</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approval and Authorization */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    Approval and Authorization
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Budget, policy, exception and high-value approvals.
                  </p>
                </div>
                <button className="text-sm font-bold text-primary hover:underline">Open Approval Queue</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Budget Approvals</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">6</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">2 escalated</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">High-Value Expenses</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">3</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">$1.4M pending</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Policy & Rules</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">4</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Compliance updates</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Exception Requests</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">2</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">High priority</p>
                </div>
              </div>
            </div>

            {/* Financial Intelligence and Control */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">
                Financial Intelligence and Control
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Revenue Summary</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">$12.8M</p>
                  <p className="text-xs text-green-600 dark:text-green-400">+2.5% QTD</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Expense Summary</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">$8.4M</p>
                  <p className="text-xs text-red-600 dark:text-red-400">+1.1% QTD</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Profit & Loss</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">$4.4M</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Margin 34.2%</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Cash Flow Snapshot</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">$3.6M</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Net inflow</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Outstanding Invoices</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">$1.2M</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">28 overdue</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Dept Cost Breakdown</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">4 departments</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Finance highest 32%</p>
                </div>
              </div>
            </div>

            {/* People and Organization Insight */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">
                People and Organization Insight
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Employees</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">1,240</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Global workforce</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Attrition / Retention</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">3.1% / 96.9%</p>
                  <p className="text-xs text-red-600 dark:text-red-400">+0.4% YoY</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Hiring Trends</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">+12 net</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">30 days</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Leadership Performance</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">4.6 / 5</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Top quartile</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Department Head Reports</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">8 due</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">3 overdue</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Engagement Index</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">82</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Stable QoQ</p>
                </div>
              </div>
            </div>

            {/* Strategic Reports and Analytics */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    Strategic Reports and Analytics
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Board-ready insights and market intelligence.
                  </p>
                </div>
                <button className="text-sm font-bold text-primary hover:underline">Export Board Pack</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Company Growth Report</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Updated 2 days ago</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Market Performance Summary</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Q3 benchmarking</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Research Impact Report</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Pipeline ROI 3.2x</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">AI / ML Insight Summary</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">12 recommendations</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Risk & Opportunity Analysis</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">5 high-impact risks</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Board-ready Report</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Ready for review</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar content area */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            {/* Risk and Compliance Alerts */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">
                Risk and Compliance Alerts
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="text-red-600 dark:text-red-400 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20 shrink-0 size-12">
                    <span className="material-symbols-outlined">gpp_maybe</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-base font-medium leading-normal line-clamp-1 text-neutral-800 dark:text-neutral-100">
                      Data Security Risk Alert
                    </p>
                    <p className="text-sm font-normal leading-normal line-clamp-2 text-neutral-600 dark:text-neutral-400">
                      Elevated privilege access detected in finance systems.
                    </p>
                    <p className="text-xs font-normal leading-normal text-neutral-400 dark:text-neutral-500 mt-1">
                      20m ago
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-yellow-600 dark:text-yellow-400 flex items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/20 shrink-0 size-12">
                    <span className="material-symbols-outlined">policy</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-base font-medium leading-normal line-clamp-1 text-neutral-800 dark:text-neutral-100">
                      Policy Violation Report
                    </p>
                    <p className="text-sm font-normal leading-normal line-clamp-2 text-neutral-600 dark:text-neutral-400">
                      Unapproved vendor onboarding in Media department.
                    </p>
                    <p className="text-xs font-normal leading-normal text-neutral-400 dark:text-neutral-500 mt-1">
                      3h ago
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-red-600 dark:text-red-400 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20 shrink-0 size-12">
                    <span className="material-symbols-outlined">warning</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-base font-medium leading-normal line-clamp-1 text-neutral-800 dark:text-neutral-100">
                      Pending Legal Issue
                    </p>
                    <p className="text-sm font-normal leading-normal line-clamp-2 text-neutral-600 dark:text-neutral-400">
                      Contract dispute escalated with regional partner.
                    </p>
                    <p className="text-xs font-normal leading-normal text-neutral-400 dark:text-neutral-500 mt-1">
                      1d ago
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Pending Approvals */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">
                Critical Pending Approvals
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Budget: APAC Expansion</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">$480k - 2 days pending</p>
                  </div>
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">Overdue</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">High-Value Expense: Data Lake</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">$320k - 18h pending</p>
                  </div>
                  <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">Review</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Exception: Vendor SLA</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Finance - 1 day pending</p>
                  </div>
                  <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">Review</span>
                </div>
              </div>
            </div>

            {/* Compliance and Risk Oversight */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">
                Compliance and Risk Oversight
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Legal Compliance Status</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">98.6%</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Pending Legal Issues</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">3</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Audit Summaries</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">2 open</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">High-risk Action Alerts</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">4</p>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">System Health</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">System Uptime</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">99.98%</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Major Incidents</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">1 active</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Backup Status</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">Last run 2h ago</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Security Alerts</p>
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">3 warnings</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Disaster Recovery</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Ready</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CEODashboard;
