import React from 'react';

const AdminSidebar = () => {
  return (
    <nav className="fixed left-0 top-0 h-screen w-64 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-background-dark p-4 z-10 flex">
      <div className="mb-8 flex items-center gap-3 px-3">
        <div
          className="aspect-square size-10 rounded-full bg-cover bg-center bg-no-repeat"
          data-alt="Super admin user avatar"
          style={{
            backgroundImage:
              'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB_HFSbNHCmNgTeKZAiFk2MqdSEqd36bsfGVXM1jMm4u-rmgBnoBDcVJpkRH2VlN__XL8gTeUCSNaWwJKRI1aQWTzEJFlZwOsBOty_vqThHZd_iMdGC6uv-at2zgu8HswCT2SKDxAFdEANBncCJPPnVF1JdJE9LC2WD9x9fHsLvY8x4J6_F_lwFafZnDp-dxW2kdcZUMybmvUNwjVpPxdbp4V3asAgzpdG_97qVGZe72iXV5Qth5NM66WFVrkCjZS88_sYOYcCBphv1")',
          }}
        ></div>
        <div className="flex flex-col">
          <h1 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Super Admin</h1>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">admin@example.com</p>
        </div>
      </div>
      
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2 text-primary">
            <span className="material-symbols-outlined">dashboard</span>
            <p className="text-sm font-medium">Dashboard</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
            <span className="material-symbols-outlined">group</span>
            <p className="text-sm font-medium">User Management</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
            <span className="material-symbols-outlined">domain</span>
            <p className="text-sm font-medium">Departments</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
            <span className="material-symbols-outlined">folder_managed</span>
            <p className="text-sm font-medium">Content</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
            <span className="material-symbols-outlined">bar_chart</span>
            <p className="text-sm font-medium">Analytics</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
            <span className="material-symbols-outlined">security</span>
            <p className="text-sm font-medium">Security</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
            <span className="material-symbols-outlined">account_tree</span>
            <p className="text-sm font-medium">Workflows</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
            <span className="material-symbols-outlined">lab_profile</span>
            <p className="text-sm font-medium">Reports</p>
          </div>
        </div>
      </div>
      
      <div className="mt-auto flex flex-col gap-4">
        <div className="h-px bg-neutral-200 dark:bg-neutral-800"></div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
            <span className="material-symbols-outlined">settings</span>
            <p className="text-sm font-medium">Settings</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
            <span className="material-symbols-outlined">help</span>
            <p className="text-sm font-medium">Support</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
            <span className="material-symbols-outlined">logout</span>
            <p className="text-sm font-medium">Logout</p>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminSidebar;