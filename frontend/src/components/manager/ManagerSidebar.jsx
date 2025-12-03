import React from 'react';

const ManagerSidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-screen flex w-64 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/20 overflow-hidden">
      <div className="flex h-full min-h-[700px] flex-col justify-between p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-2">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
              data-alt="Manager's profile picture"
              style={{
                backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC0NyPTg6QnGCd6bzahKXvW46dMD1lNfA6X1S32qTZUncNY2RHoZso_crxkUid-qUOnXTPDD6Ccnu_OxR-mOryUr8iUkAXX8sDkFZVq-13kCqal55UCl9oxbkSdJDZuvPTU58zA51yJ-SdljQlsmDOKpf6BC0x_ziY7ylYopUR2N9AJfoMojwIWulwTme9skA2VGi9mrQzahcmnEMRx1mMW69GK9i92zZHgfwRD8ULc-bRTn9wl5NsG0O9hNTa3RLtdtWWMu_N0G4Gj")',
              }}
            />
            <div className="flex flex-col">
              <h1 className="text-gray-800 dark:text-white text-base font-medium leading-normal">Sangeet Chowdhury</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal">Project Manager</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                dashboard
              </span>
              <p className="text-primary text-sm font-bold leading-normal">Dashboard</p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer">
              <span className="material-symbols-outlined text-gray-800 dark:text-gray-200">inventory_2</span>
              <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">Products</p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer">
              <span className="material-symbols-outlined text-gray-800 dark:text-gray-200">group</span>
              <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">Team</p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer">
              <span className="material-symbols-outlined text-gray-800 dark:text-gray-200">assessment</span>
              <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">Reports</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90">
            <span className="truncate">New Project</span>
          </button>
          <div className="flex flex-col gap-1 border-t border-gray-200 dark:border-gray-800 pt-4">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer">
              <span className="material-symbols-outlined text-gray-800 dark:text-gray-200">settings</span>
              <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">Settings</p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 text-red-600 dark:text-red-400 cursor-pointer">
              <span className="material-symbols-outlined">logout</span>
              <p className="text-sm font-medium leading-normal">Log Out</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ManagerSidebar;