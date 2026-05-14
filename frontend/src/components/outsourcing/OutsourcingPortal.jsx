import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import OutsourcingSidebar from './OutsourcingSidebar';

const OutsourcingPortal = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen overflow-x-clip bg-gradient-to-br from-neutral-100 via-neutral-50 to-white dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <OutsourcingSidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <button
        type="button"
        onClick={() => setIsMenuOpen(true)}
        className="fixed left-3 top-3 z-30 inline-flex size-10 items-center justify-center rounded-xl border border-neutral-200 bg-white/95 text-neutral-800 shadow-md backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95 dark:text-neutral-100 md:hidden"
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined text-[20px]">menu</span>
      </button>
      <div className="flex-1 px-3 pb-4 pt-16 tb:px-4 lap:ml-64 lap:px-6 lap:pt-6">
        <div className="mx-auto w-full max-w-[1500px]">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default OutsourcingPortal;
