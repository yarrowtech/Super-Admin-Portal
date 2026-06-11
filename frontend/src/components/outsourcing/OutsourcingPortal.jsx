import React, { useCallback, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import OutsourcingSidebar from './OutsourcingSidebar';
import { useSidebar } from '../../context/SidebarContext';

const OutsourcingPortal = () => {
  const { collapsed } = useSidebar();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  return (
    <div
      className="portal-shell flex min-h-screen overflow-x-clip bg-neutral-50 font-display text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
      data-role="outsourcing"
    >
      <OutsourcingSidebar isOpen={isMenuOpen} onClose={closeMenu} />

      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setIsMenuOpen(true)}
        className="fixed left-3 top-3 z-30 inline-flex size-10 items-center justify-center rounded-xl border border-neutral-200 bg-white/95 text-neutral-800 shadow-md backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95 dark:text-neutral-100 md:hidden"
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined text-[20px]">menu</span>
      </button>

      <div className={`flex-1 px-3 pb-4 pt-16 transition-[margin] duration-300 ease-out-expo md:px-6 md:pt-6 ${collapsed ? 'md:ml-16' : 'md:ml-[250px]'}`}>
        <div className="mx-auto w-full max-w-[1500px]">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default OutsourcingPortal;
