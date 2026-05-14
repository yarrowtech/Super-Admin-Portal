import React, { useState } from 'react';
import FinanceSidebar from './FinanceSidebar';
import FinanceDashboard from './FinanceDashboard';
import MobilePortalNav from '../common/MobilePortalNav';

const financeTabs = [
  { id: 'invoices', label: 'Invoices', icon: 'receipt_long' },
  { id: 'payments', label: 'Payments', icon: 'payments' },
  { id: 'expenses', label: 'Expenses', icon: 'request_quote' },
  { id: 'budgets', label: 'Budgets', icon: 'account_balance_wallet' },
  { id: 'payroll', label: 'Payroll', icon: 'badge' },
  { id: 'reports', label: 'Reports', icon: 'bar_chart' },
  { id: 'compliance', label: 'Compliance', icon: 'verified' },
  { id: 'vendors', label: 'Vendors', icon: 'storefront' },
  { id: 'clients', label: 'Clients', icon: 'groups' },
];

const FinancePortal = () => {
  const [activeTab, setActiveTab] = useState('invoices');

  return (
    <div className="portal-shell min-h-screen w-full font-display bg-background-light dark:bg-background-dark text-neutral-800 dark:text-neutral-100">
      <MobilePortalNav
        title="Finance Portal"
        subtitle="Accounting operations"
        icon="account_balance"
        items={financeTabs.map((tab) => ({
          key: tab.id,
          label: tab.label,
          icon: tab.icon,
          active: activeTab === tab.id,
          onClick: () => setActiveTab(tab.id),
        }))}
      />
      <FinanceSidebar activeTab={activeTab} onSelect={setActiveTab} />
      <div className="pt-16 md:ml-64 md:pt-0 portal-content">
        <FinanceDashboard activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export default FinancePortal;
