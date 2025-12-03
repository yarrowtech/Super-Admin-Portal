import React from 'react';

const CEOSidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-screen flex w-64 flex-col border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-background-dark p-4 shrink-0 z-10">
      <div className="flex h-full flex-col justify-between">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
              data-alt="A portrait of the CEO, Dr. Evelyn Reed"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA6TmQIdW2UOLyWz79w5pAAMyKfnl5ydwJK-9XmP_wAMwNT_4GDOxUL0XEVLlU8gN8QAAOaloIWOn_YZ_Us6rA-wKBcqTQmwdzSSmmhHzeEsVKzuCUoO4O5SaasOi-ktyW-_MxW0N_0xuWUfH5TLZfyz0Scae_RG3rYvDjuN5jc1DIfYfcrp74IodOHBF4TH943uHqFK6thq1clcTKvYBHFD0YtGdmX_0QktyvUt8HDclFg09DgMD1K5z_PxqnxdDg5PFI-URI1nXu-")',
              }}
            ></div>
            <div className="flex flex-col">
              <h1 className="text-base font-medium leading-normal text-neutral-800 dark:text-neutral-100">
                Raffale Mantosh 
              </h1>
              <p className="text-sm font-normal leading-normal text-neutral-600 dark:text-neutral-400">CEO</p>
            </div>
          </div>
          <nav className="flex flex-col gap-2 mt-4">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                dashboard
              </span>
              <p className="text-sm font-bold leading-normal">Dashboard</p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">gavel</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">Law</p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">groups</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">HR</p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">laptop_chromebook</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">IT</p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">account_balance_wallet</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">A/C & Finance</p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">dvr</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">System Operator</p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">science</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">Research</p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">trending_up</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">A/C Sales & Growth</p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">campaign</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">Media</p>
            </div>
          </nav>
        </div>
        <div className="flex flex-col gap-4">
          <button className="flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90">
            <span className="truncate">New Report</span>
          </button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">settings</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">Settings</p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-red-600 dark:text-red-400 cursor-pointer">
              <span className="material-symbols-outlined">logout</span>
              <p className="text-sm font-medium leading-normal">Logout</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default CEOSidebar;