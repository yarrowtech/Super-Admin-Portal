import React from 'react';
import SectionSidebar from '../common/SectionSidebar';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

const navItems = [
  { id: 'overview', label: 'Overview Dashboard', icon: 'dashboard' },
  { id: 'transactions', label: 'Transactions', icon: 'payments' },
  { id: 'budgets', label: 'Budget Management', icon: 'account_balance_wallet' },
  { id: 'payroll', label: 'Payroll Integration', icon: 'badge' },
  { id: 'invoices', label: 'Invoices & Billing', icon: 'receipt_long' },
  { id: 'compliance', label: 'Tax & Compliance', icon: 'gavel' },
  { id: 'reports', label: 'Financial Reports', icon: 'bar_chart' },
  { id: 'audit', label: 'Audit Logs', icon: 'policy' },
  { id: 'approvals', label: 'Approvals & Workflows', icon: 'approval' },
  { id: 'settings', label: 'Settings',        icon: 'settings' },
  { id: 'support',  label: 'Support',         icon: 'support_agent' },
];

const FinanceSidebar = ({ activeTab = 'invoices', onSelect }) => {
  const { user } = useAuth();
  if (!canAccessPortal(user, PORTALS.FINANCE)) return null;

  return (
    <SectionSidebar
      title="Finance Admin"
      subtitle="Finance Department"
      icon="account_balance"
      items={navItems}
      activeId={activeTab}
      onSelect={onSelect}
    />
  );
};

export default FinanceSidebar;
