import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const CEOSidebar = ({ onViewChange }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleViewChange = (view) => {
    setActiveView(view);
    if (onViewChange) {
      onViewChange(view);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <aside className="fixed left-0 top-0 h-screen flex w-64 flex-col border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-background-dark p-4 shrink-0 z-10">
      <div className="flex h-full flex-col justify-between">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
              data-alt="A portrait of a senior executive"
              style={{
                backgroundImage:
                  'url("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80")',
              }}
            ></div>
            <div className="flex flex-col">
              <h1 className="text-base font-medium leading-normal text-neutral-800 dark:text-neutral-100">
                Raphael Mantosh
              </h1>
              <p className="text-sm font-normal leading-normal text-neutral-600 dark:text-neutral-400">
                CEO
              </p>
            </div>
          </div>
          <nav className="flex flex-col gap-2 mt-4">
            <div 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${
                activeView === 'dashboard' 
                  ? 'bg-primary/10 text-primary dark:bg-primary/20' 
                  : 'hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-100'
              }`}
              onClick={() => handleViewChange('dashboard')}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: activeView === 'dashboard' ? "'FILL' 1" : "'FILL' 0" }}
              >
                dashboard
              </span>
              <p className="text-sm font-bold leading-normal">Dashboard</p>
            </div>
            <div 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${
                activeView === 'chat' 
                  ? 'bg-primary/10 text-primary dark:bg-primary/20' 
                  : 'hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-100'
              }`}
              onClick={() => handleViewChange('chat')}
            >
              <span 
                className="material-symbols-outlined"
                style={{ fontVariationSettings: activeView === 'chat' ? "'FILL' 1" : "'FILL' 0" }}
              >
                chat
              </span>
              <p className="text-sm font-medium leading-normal">
                Chat
              </p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">gavel</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
                Law
              </p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">groups</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
                HR
              </p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">
                laptop_chromebook
              </span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
                IT
              </p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">
                account_balance_wallet
              </span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
                A/C & Finance
              </p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">dvr</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
                System Operator
              </p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">science</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
                Research
              </p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">trending_up</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
                A/C Sales & Growth
              </p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
              <span className="material-symbols-outlined">campaign</span>
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
                Media
              </p>
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
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
                Settings
              </p>
            </div>
            <div 
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-red-600 dark:text-red-400 cursor-pointer"
              onClick={handleLogout}
            >
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
