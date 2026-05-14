import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

const LawSidebar = ({ activeSection, sections, onSelect }) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  if (!canAccessPortal(user, PORTALS.LAW)) return null;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 z-10 hidden h-screen w-64 flex-col overflow-hidden border-r border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-background-dark md:flex">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 px-1">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="material-symbols-outlined">gavel</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-semibold leading-normal text-neutral-900 dark:text-white">
              Law Admin
            </h1>
            <p className="text-sm font-normal leading-normal text-neutral-500 dark:text-neutral-400">
              Law Department
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2 text-primary">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_balance
            </span>
            <p className="text-sm font-bold leading-normal">Law Department</p>
          </div>
          <div className="flex flex-col gap-1 pl-5">
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSelect?.(section.id)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {section.icon}
                  </span>
                  <p className="text-sm font-medium leading-normal">{section.navLabel}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-white/10">
            <span className="material-symbols-outlined">settings</span>
            <p className="text-sm font-medium leading-normal">Settings</p>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-white/10">
            <span className="material-symbols-outlined">logout</span>
            <p className="text-sm font-medium leading-normal">Logout</p>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default LawSidebar;
