import React from 'react';

const ITSidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-screen flex w-64 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-background-dark p-4 overflow-hidden z-10">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
            data-alt="User avatar image"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB_HFSbNHCmNgTeKZAiFk2MqdSEqd36bsfGVXM1jMm4u-rmgBnoBDcVJpkRH2VlN__XL8gTeUCSNaWwJKRI1aQWTzEJFlZwOsBOty_vqThHZd_iMdGC6uv-at2zgu8HswCT2SKDxAFdEANBncCJPPnVF1JdJE9LC2WD9x9fHsLvY8x4J6_F_lwFafZnDp-dxW2kdcZUMybmvUNwjVpPxdbp4V3asAgzpdG_97qVGZe72iXV5Qth5NM66WFVrkCjZS88_sYOYcCBphv1")',
            }}
          ></div>
          <div className="flex flex-col">
            <h1 className="text-neutral-800 dark:text-neutral-100 text-base font-medium leading-normal">
              IT Admin
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm font-normal leading-normal">
              IT Department
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              dashboard
            </span>
            <p className="text-sm font-bold leading-normal">Dashboard</p>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
            <span className="material-symbols-outlined">developer_mode</span>
            <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
              Projects
            </p>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
            <span className="material-symbols-outlined">dns</span>
            <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
              Servers
            </p>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
            <span className="material-symbols-outlined">support_agent</span>
            <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
              Support Tickets
            </p>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
            <span className="material-symbols-outlined">cloud</span>
            <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
              Cloud Resources
            </p>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
            <span className="material-symbols-outlined">security</span>
            <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
              Security
            </p>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
            <span className="material-symbols-outlined">storage</span>
            <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
              Databases
            </p>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
            <span className="material-symbols-outlined">network_check</span>
            <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
              Network
            </p>
          </div>
        </div>
      </div>
      <div className="mt-auto flex flex-col gap-4">
        <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em]">
          <span className="truncate">Create Ticket</span>
        </button>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
            <span className="material-symbols-outlined">settings</span>
            <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
              Settings
            </p>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
            <span className="material-symbols-outlined">logout</span>
            <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
              Logout
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ITSidebar;