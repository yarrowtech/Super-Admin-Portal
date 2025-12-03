import React from 'react';

const ManagerDashboard = () => {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-8">
        <div className="flex flex-wrap justify-between gap-4 items-center mb-8">
          <div className="flex min-w-72 flex-col gap-1">
            <p className="text-gray-800 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">Welcome back, Alex!</p>
            <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal">Here's your performance summary for this week.</p>
          </div>
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] gap-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <span className="material-symbols-outlined text-base">tune</span>
            <span className="truncate">Customize Dashboard</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-800 dark:text-gray-200 text-base font-medium leading-normal">Total Sales</p>
            <p className="text-gray-800 dark:text-white tracking-light text-3xl font-bold leading-tight">$125,430</p>
            <p className="text-green-500 text-base font-medium leading-normal flex items-center">
              <span className="material-symbols-outlined text-lg">arrow_upward</span>+5.4%
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-800 dark:text-gray-200 text-base font-medium leading-normal">Active Users</p>
            <p className="text-gray-800 dark:text-white tracking-light text-3xl font-bold leading-tight">2,150</p>
            <p className="text-green-500 text-base font-medium leading-normal flex items-center">
              <span className="material-symbols-outlined text-lg">arrow_upward</span>+1.2%
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-800 dark:text-gray-200 text-base font-medium leading-normal">Team Productivity</p>
            <p className="text-gray-800 dark:text-white tracking-light text-3xl font-bold leading-tight">92%</p>
            <p className="text-red-500 text-base font-medium leading-normal flex items-center">
              <span className="material-symbols-outlined text-lg">arrow_downward</span>-2.1%
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-800 dark:text-gray-200 text-base font-medium leading-normal">Open Tickets</p>
            <p className="text-gray-800 dark:text-white tracking-light text-3xl font-bold leading-tight">14</p>
            <p className="text-green-500 text-base font-medium leading-normal flex items-center">
              <span className="material-symbols-outlined text-lg">arrow_upward</span>+8.0%
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800">
              <h2 className="text-gray-800 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-6 pb-3 pt-5">Pending Approvals</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="p-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400">Request</th>
                      <th className="p-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400">Requester</th>
                      <th className="p-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400">Date</th>
                      <th className="p-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                      <td className="p-4 px-6 text-gray-800 dark:text-white text-sm">Vacation Request</td>
                      <td className="p-4 px-6 text-gray-600 dark:text-gray-400 text-sm">Olivia Martin</td>
                      <td className="p-4 px-6 text-gray-600 dark:text-gray-400 text-sm">2023-10-28</td>
                      <td className="p-4 px-6 flex justify-end gap-2">
                        <button className="px-3 py-1 text-xs font-bold rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20">Deny</button>
                        <button className="px-3 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-500 hover:bg-green-500/20">Approve</button>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                      <td className="p-4 px-6 text-gray-800 dark:text-white text-sm">Budget Approval Q4</td>
                      <td className="p-4 px-6 text-gray-600 dark:text-gray-400 text-sm">Liam Garcia</td>
                      <td className="p-4 px-6 text-gray-600 dark:text-gray-400 text-sm">2023-10-27</td>
                      <td className="p-4 px-6 flex justify-end gap-2">
                        <button className="px-3 py-1 text-xs font-bold rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20">Deny</button>
                        <button className="px-3 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-500 hover:bg-green-500/20">Approve</button>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                      <td className="p-4 px-6 text-gray-800 dark:text-white text-sm">Content Review</td>
                      <td className="p-4 px-6 text-gray-600 dark:text-gray-400 text-sm">Sophia Williams</td>
                      <td className="p-4 px-6 text-gray-600 dark:text-gray-400 text-sm">2023-10-26</td>
                      <td className="p-4 px-6 flex justify-end gap-2">
                        <button className="px-3 py-1 text-xs font-bold rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20">Deny</button>
                        <button className="px-3 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-500 hover:bg-green-500/20">Approve</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex min-w-72 max-w-[336px] flex-1 flex-col gap-0.5 mx-auto">
                <div className="flex items-center p-1 justify-between">
                  <button className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <span className="material-symbols-outlined text-gray-800 dark:text-white flex size-10 items-center justify-center">chevron_left</span>
                  </button>
                  <p className="text-gray-800 dark:text-white text-base font-bold leading-tight flex-1 text-center">October 2023</p>
                  <button className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <span className="material-symbols-outlined text-gray-800 dark:text-white flex size-10 items-center justify-center">chevron_right</span>
                  </button>
                </div>
                <div className="grid grid-cols-7">
                  <p className="text-gray-800 dark:text-white text-[13px] font-bold leading-normal tracking-[0.015em] flex h-12 w-full items-center justify-center pb-0.5">S</p>
                  <p className="text-gray-800 dark:text-white text-[13px] font-bold leading-normal tracking-[0.015em] flex h-12 w-full items-center justify-center pb-0.5">M</p>
                  <p className="text-gray-800 dark:text-white text-[13px] font-bold leading-normal tracking-[0.015em] flex h-12 w-full items-center justify-center pb-0.5">T</p>
                  <p className="text-gray-800 dark:text-white text-[13px] font-bold leading-normal tracking-[0.015em] flex h-12 w-full items-center justify-center pb-0.5">W</p>
                  <p className="text-gray-800 dark:text-white text-[13px] font-bold leading-normal tracking-[0.015em] flex h-12 w-full items-center justify-center pb-0.5">T</p>
                  <p className="text-gray-800 dark:text-white text-[13px] font-bold leading-normal tracking-[0.015em] flex h-12 w-full items-center justify-center pb-0.5">F</p>
                  <p className="text-gray-800 dark:text-white text-[13px] font-bold leading-normal tracking-[0.015em] flex h-12 w-full items-center justify-center pb-0.5">S</p>
                  <button className="h-12 w-full text-gray-800 dark:text-white text-sm font-medium leading-normal">
                    <div className="flex size-full items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">1</div>
                  </button>
                  <button className="h-12 w-full text-gray-800 dark:text-white text-sm font-medium leading-normal">
                    <div className="flex size-full items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">2</div>
                  </button>
                  <button className="h-12 w-full text-gray-800 dark:text-white text-sm font-medium leading-normal">
                    <div className="flex size-full items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">3</div>
                  </button>
                  <button className="h-12 w-full text-gray-800 dark:text-white text-sm font-medium leading-normal">
                    <div className="flex size-full items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">4</div>
                  </button>
                  <button className="h-12 w-full text-white text-sm font-medium leading-normal">
                    <div className="flex size-full items-center justify-center rounded-full bg-primary">5</div>
                  </button>
                  <button className="h-12 w-full text-gray-800 dark:text-white text-sm font-medium leading-normal">
                    <div className="flex size-full items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">6</div>
                  </button>
                  <button className="h-12 w-full text-gray-800 dark:text-white text-sm font-medium leading-normal">
                    <div className="flex size-full items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">7</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ManagerDashboard;