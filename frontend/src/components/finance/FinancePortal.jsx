import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import FinanceSidebar from './FinanceSidebar';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';

const FINANCE_SECTIONS = [
  { id: 'dashboard',        label: 'Overview',           icon: 'dashboard',              description: 'Revenue, expenses and receivables at a glance', path: '/finance/dashboard' },
  { id: 'project-overview', label: 'Project Overview',   icon: 'folder_copy',            description: 'Read-only project plan visibility',             path: '/finance/dashboard/project-overview' },
  { id: 'invoices',         label: 'Invoices & Billing', icon: 'receipt_long',           description: 'Invoice history, notes and status',              path: '/finance/dashboard/invoices' },
  { id: 'payments',         label: 'Payments',           icon: 'payments',               description: 'Payment ledger and reconciliation',              path: '/finance/dashboard/payments' },
  { id: 'expenses',         label: 'Expenses',           icon: 'request_quote',          description: 'Expense submissions and verification',           path: '/finance/dashboard/expenses' },
  { id: 'budgets',          label: 'Budgets',            icon: 'account_balance_wallet', description: 'Budget allocation and cost centers',             path: '/finance/dashboard/budgets' },
  { id: 'payroll',          label: 'Payroll',            icon: 'badge',                  description: 'Payroll runs and disbursement',                  path: '/finance/dashboard/payroll' },
  { id: 'accounting',       label: 'Accounting',         icon: 'menu_book',              description: 'Chart of accounts and journal entries',          path: '/finance/dashboard/accounting' },
  { id: 'reports',          label: 'Reports',            icon: 'bar_chart',              description: 'Financial reports and ERP statements',           path: '/finance/dashboard/reports' },
  { id: 'compliance',       label: 'Compliance',         icon: 'gavel',                  description: 'GST, TDS and statutory tracking',                path: '/finance/dashboard/compliance' },
  { id: 'directory',        label: 'Directory',          icon: 'contacts',               description: 'Vendors and clients',                            path: '/finance/dashboard/directory' },
  { id: 'activity',         label: 'Activity',           icon: 'history',                description: 'Transaction ledger and audit trail',             path: '/finance/dashboard/activity' },
  { id: 'approvals',        label: 'Approvals',          icon: 'approval',               description: 'Approval workflows',                             path: '/finance/dashboard/approvals' },
  { id: 'settings',         label: 'Settings',           icon: 'settings',               description: 'Portal preferences',                             path: '/finance/dashboard/settings' },
  { id: 'support',          label: 'Support',            icon: 'support_agent',          description: 'Submit a support ticket',                        path: '/finance/dashboard/support' },
];

const FinancePortal = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeSection = useMemo(() => {
    const pathname = location.pathname;
    if (pathname.startsWith('/finance/dashboard/project-overview')) return 'project-overview';
    if (pathname.startsWith('/finance/dashboard/invoices')) return 'invoices';
    if (pathname.startsWith('/finance/dashboard/payments')) return 'payments';
    if (pathname.startsWith('/finance/dashboard/expenses')) return 'expenses';
    if (pathname.startsWith('/finance/dashboard/budgets')) return 'budgets';
    if (pathname.startsWith('/finance/dashboard/payroll')) return 'payroll';
    if (pathname.startsWith('/finance/dashboard/accounting')) return 'accounting';
    if (pathname.startsWith('/finance/dashboard/reports')) return 'reports';
    if (pathname.startsWith('/finance/dashboard/compliance')) return 'compliance';
    if (pathname.startsWith('/finance/dashboard/directory')) return 'directory';
    if (pathname.startsWith('/finance/dashboard/activity')) return 'activity';
    if (pathname.startsWith('/finance/dashboard/approvals')) return 'approvals';
    if (pathname.startsWith('/finance/dashboard/settings')) return 'settings';
    if (pathname.startsWith('/finance/dashboard/support')) return 'support';
    return 'dashboard';
  }, [location.pathname]);

  const mobileItems = useMemo(
    () =>
      FINANCE_SECTIONS.map((item) => ({
        key: item.id,
        label: item.label,
        icon: item.icon,
        active: activeSection === item.id,
        onClick: () => navigate(item.path),
      })),
    [activeSection, navigate]
  );

  return (
    <AppLayout
      sidebar={
        <FinanceSidebar
          activeSection={activeSection}
          onSelect={(sectionId) => navigate(FINANCE_SECTIONS.find((item) => item.id === sectionId)?.path || '/finance/dashboard')}
          sections={FINANCE_SECTIONS}
        />
      }
      title="Finance Portal"
      subtitle="Accounting operations"
      mobileIcon="account_balance"
      mobileItems={mobileItems}
      user={user}
      showHeader={false}
    >
      <Outlet />
    </AppLayout>
  );
};

export default FinancePortal;
