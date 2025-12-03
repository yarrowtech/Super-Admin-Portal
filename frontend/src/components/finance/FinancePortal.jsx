import React from 'react';
import FinanceSidebar from './FinanceSidebar';
import FinanceDashboard from './FinanceDashboard';

const FinancePortal = () => {
  return (
    <div className="min-h-screen w-full font-display bg-background-light dark:bg-background-dark text-neutral-800 dark:text-neutral-100">
      <FinanceSidebar />
      <div className="ml-64">
        <FinanceDashboard />
      </div>
    </div>
  );
};

export default FinancePortal;