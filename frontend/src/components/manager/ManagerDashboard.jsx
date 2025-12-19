import React, { useState, useEffect } from 'react';

const ManagerDashboard = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check localStorage for dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else if (savedDarkMode === 'false') {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      }
    }
  }, []);

  const toggleDarkMode = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      setIsDarkMode(false);
      localStorage.setItem('darkMode', 'false');
    } else {
      html.classList.add('dark');
      setIsDarkMode(true);
      localStorage.setItem('darkMode', 'true');
    }
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl p-6">
        <div className="flex flex-wrap justify-between gap-4 items-center mb-6">
          <div className="flex min-w-72 flex-col gap-1">
            <p className="text-gray-800 dark:text-white text-3xl font-black leading-tight tracking-[-0.033em]">Welcome back, Sangeet!</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal">Here's your performance summary for this week.</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <span className="material-symbols-outlined text-base">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
              <div className="ml-2 flex items-center">
                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isDarkMode ? 'bg-primary' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </div>
            </button>
            <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] gap-2 hover:bg-gray-100 dark:hover:bg-gray-800">
              <span className="material-symbols-outlined text-base">tune</span>
              <span className="truncate">Customize Dashboard</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">Total Sales</p>
            <p className="text-gray-800 dark:text-white tracking-light text-2xl font-bold leading-tight">$125,430</p>
            <p className="text-green-500 text-sm font-medium leading-normal flex items-center">
              <span className="material-symbols-outlined text-lg">arrow_upward</span>+5.4%
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">Active Users</p>
            <p className="text-gray-800 dark:text-white tracking-light text-2xl font-bold leading-tight">2,150</p>
            <p className="text-green-500 text-sm font-medium leading-normal flex items-center">
              <span className="material-symbols-outlined text-lg">arrow_upward</span>+1.2%
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">Team Productivity</p>
            <p className="text-gray-800 dark:text-white tracking-light text-2xl font-bold leading-tight">92%</p>
            <p className="text-red-500 text-sm font-medium leading-normal flex items-center">
              <span className="material-symbols-outlined text-lg">arrow_downward</span>-2.1%
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">Open Tickets</p>
            <p className="text-gray-800 dark:text-white tracking-light text-2xl font-bold leading-tight">14</p>
            <p className="text-green-500 text-sm font-medium leading-normal flex items-center">
              <span className="material-symbols-outlined text-lg">arrow_upward</span>+8.0%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800">
              <h2 className="text-gray-800 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-5 pb-3 pt-4">Pending Approvals</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="p-3 px-5 text-xs font-semibold text-gray-600 dark:text-gray-400">Request</th>
                      <th className="p-3 px-5 text-xs font-semibold text-gray-600 dark:text-gray-400">Requester</th>
                      <th className="p-3 px-5 text-xs font-semibold text-gray-600 dark:text-gray-400">Date</th>
                      <th className="p-3 px-5 text-xs font-semibold text-gray-600 dark:text-gray-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                      <td className="p-3 px-5 text-gray-800 dark:text-white text-sm">Vacation Request</td>
                      <td className="p-3 px-5 text-gray-600 dark:text-gray-400 text-sm">Boby Peter</td>
                      <td className="p-3 px-5 text-gray-600 dark:text-gray-400 text-sm">2025-10-28</td>
                      <td className="p-3 px-5 flex justify-end gap-2">
                        <button className="px-3 py-1 text-xs font-bold rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20">Deny</button>
                        <button className="px-3 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-500 hover:bg-green-500/20">Approve</button>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                      <td className="p-3 px-5 text-gray-800 dark:text-white text-sm">Budget Approval Q4</td>
                      <td className="p-3 px-5 text-gray-600 dark:text-gray-400 text-sm">Nandini Biswas</td>
                      <td className="p-3 px-5 text-gray-600 dark:text-gray-400 text-sm">2025-10-27</td>
                      <td className="p-3 px-5 flex justify-end gap-2">
                        <button className="px-3 py-1 text-xs font-bold rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20">Deny</button>
                        <button className="px-3 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-500 hover:bg-green-500/20">Approve</button>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                      <td className="p-3 px-5 text-gray-800 dark:text-white text-sm">Content Review</td>
                      <td className="p-3 px-5 text-gray-600 dark:text-gray-400 text-sm">Anshika Pathak</td>
                      <td className="p-3 px-5 text-gray-600 dark:text-gray-400 text-sm">202-10-26</td>
                      <td className="p-3 px-5 flex justify-end gap-2">
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
