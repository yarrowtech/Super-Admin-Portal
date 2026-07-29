import React, { lazy, useState } from 'react';
import FinanceSidebar from './FinanceSidebar';
import FinanceDashboard from './FinanceDashboard';
import FinanceSettingsPage from './FinanceSettingsPage';
import FinanceSupportPage from './FinanceSupportPage';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';

const ProjectOverviewPage = lazy(() => import('../shared/ProjectOverviewPage'));

const financeTabs = [
  { id: 'invoices',    label: 'Invoices',    icon: 'receipt_long' },
  { id: 'project-overview', label: 'Project Overview', icon: 'folder_copy' },
  { id: 'payments',   label: 'Payments',    icon: 'payments' },
  { id: 'expenses',   label: 'Expenses',    icon: 'request_quote' },
  { id: 'budgets',    label: 'Budgets',     icon: 'account_balance_wallet' },
  { id: 'payroll',    label: 'Payroll',     icon: 'badge' },
  { id: 'reports',    label: 'Reports',     icon: 'bar_chart' },
  { id: 'compliance', label: 'Compliance',  icon: 'verified' },
  { id: 'vendors',    label: 'Vendors',     icon: 'storefront' },
  { id: 'clients',    label: 'Clients',     icon: 'groups' },
  { id: 'settings',   label: 'Settings',    icon: 'settings' },
  { id: 'support',    label: 'Support',     icon: 'support_agent' },
];

const FinancePortal = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('invoices');
  const mobileItems = financeTabs.map((tab) => ({
    key: tab.id,
    label: tab.label,
    icon: tab.icon,
    active: activeTab === tab.id,
    onClick: () => setActiveTab(tab.id),
  }));

  const renderContent = () => {
    if (activeTab === 'settings') return <FinanceSettingsPage />;
    if (activeTab === 'support')  return <FinanceSupportPage />;
    if (activeTab === 'project-overview') return <ProjectOverviewPage portalKey="finance" portalName="Finance Portal" />;
    return <FinanceDashboard activeTab={activeTab} onTabChange={setActiveTab} />;
  };

  return (
    <AppLayout
      sidebar={<FinanceSidebar activeTab={activeTab} onSelect={setActiveTab} />}
      title="Finance Portal"
      subtitle="Accounting operations"
      mobileIcon="account_balance"
      mobileItems={mobileItems}
      user={user}
    >
      <div className="portal-content p-0">
        {renderContent()}
      </div>
    </AppLayout>
  );
};

export default FinancePortal;
