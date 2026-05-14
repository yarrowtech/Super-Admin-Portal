import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

const ITSidebar = ({ activeSection, onSelect, sections = [] }) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  if (!canAccessPortal(user, PORTALS.IT)) return null;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 z-10 hidden h-screen w-64 flex-col overflow-hidden border-r border-neutral-800 bg-neutral-950 p-4 text-neutral-100 md:flex">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 px-1">
          <div className="flex size-10 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
            <span className="material-symbols-outlined">memory</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-semibold leading-normal text-white">IT System Layer</h1>
            <p className="text-sm font-normal leading-normal text-neutral-400">Decoupled Control Plane</p>
          </div>
        </div>
        <div className="flex flex-col gap-1 pl-1">
          {sections.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect?.(item.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                  isActive ? 'bg-cyan-500 text-white' : 'text-neutral-300 hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <p className="text-sm font-medium leading-normal">{item.label}</p>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-auto flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer">
            <span className="material-symbols-outlined">settings</span>
            <p className="text-sm font-medium leading-normal">Settings</p>
          </div>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/10 cursor-pointer">
            <span className="material-symbols-outlined">logout</span>
            <p className="text-sm font-medium leading-normal">Logout</p>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default ITSidebar;
