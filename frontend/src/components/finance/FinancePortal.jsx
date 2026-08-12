import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import FinanceSidebar from './FinanceSidebar';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';

const basePath = '/finance/dashboard';

const child = (id, label, icon, path, description = '') => ({ id, label, icon, path, description });

const FINANCE_SECTIONS = [
  {
    id: 'overview',
    label: 'Finance',
    icon: 'account_balance',
    children: [child('dashboard', 'Financial Dashboard', 'dashboard', basePath, 'Organization financial control')],
  },
  {
    id: 'requests',
    label: 'Request Management',
    icon: 'assignment',
    children: [
      child('requests-all', 'All Requests', 'list_alt', `${basePath}/activity?type=requests`),
      child('requests-pending', 'Pending Requests', 'pending_actions', `${basePath}/activity?status=submitted`),
      child('requests-expense', 'Expense Requests', 'request_quote', `${basePath}/expenses`),
      child('requests-purchase', 'Purchase Requests', 'shopping_cart', `${basePath}/activity?type=purchase`),
      child('requests-payment', 'Payment Requests', 'payments', `${basePath}/payments`),
      child('requests-reimbursement', 'Reimbursement Requests', 'currency_exchange', `${basePath}/expenses?category=reimbursement`),
      child('requests-budget', 'Budget Requests', 'account_balance_wallet', `${basePath}/budgets?status=pending`),
      child('requests-advance', 'Advance Requests', 'payments', `${basePath}/activity?type=advance`),
      child('requests-vendor', 'Vendor Payment Requests', 'storefront', `${basePath}/directory`),
    ],
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: 'receipt',
    children: [
      child('activity', 'All Transactions', 'history', `${basePath}/activity`),
      child('transactions-income', 'Income', 'trending_up', `${basePath}/activity?type=income`),
      child('transactions-expenses', 'Expenses', 'trending_down', `${basePath}/expenses`),
      child('transactions-transfers', 'Transfers', 'swap_horiz', `${basePath}/payments`),
    ],
  },
  {
    id: 'invoices-group',
    label: 'Invoices',
    icon: 'receipt_long',
    children: [
      child('invoices', 'All Invoices', 'receipt_long', `${basePath}/invoices`),
      child('vendor-invoices', 'Vendor Invoices', 'store', `${basePath}/directory`),
      child('invoice-verification', 'Pending Verification', 'fact_check', `${basePath}/invoices?status=draft`),
      child('invoice-approved', 'Approved', 'verified', `${basePath}/invoices?status=sent`),
      child('invoice-scheduled', 'Scheduled', 'event_available', `${basePath}/payments?status=recorded`),
      child('invoice-paid', 'Paid', 'paid', `${basePath}/invoices?status=paid`),
      child('invoice-overdue', 'Overdue', 'warning', `${basePath}/invoices?status=overdue`),
    ],
  },
  {
    id: 'budgets-group',
    label: 'Budgets',
    icon: 'account_balance_wallet',
    children: [
      child('budgets', 'Department Budgets', 'account_balance_wallet', `${basePath}/budgets`),
      child('budget-allocation', 'Budget Allocation', 'savings', `${basePath}/budgets`),
      child('budget-utilization', 'Budget Utilization', 'monitoring', `${basePath}/budgets`),
      child('budget-transfers', 'Budget Transfers', 'swap_horiz', `${basePath}/budgets`),
      child('budget-requests', 'Budget Requests', 'approval', `${basePath}/budgets?status=pending`),
    ],
  },
  {
    id: 'payments-group',
    label: 'Payments',
    icon: 'payments',
    children: [
      child('payments', 'Payment Queue', 'payments', `${basePath}/payments`),
      child('payment-approval', 'Pending Approval', 'approval', `${basePath}/approvals`),
      child('payment-scheduled', 'Scheduled', 'event', `${basePath}/payments?status=recorded`),
      child('payment-processing', 'Processing', 'sync', `${basePath}/payments?status=recorded`),
      child('payment-completed', 'Completed', 'done_all', `${basePath}/payments?status=reconciled`),
      child('payment-failed', 'Failed', 'error', `${basePath}/payments?status=failed`),
    ],
  },
  {
    id: 'payroll-group',
    label: 'Payroll',
    icon: 'badge',
    children: [
      child('payroll', 'Payroll Overview', 'badge', `${basePath}/payroll`),
      child('payroll-processing', 'Payroll Processing', 'payments', `${basePath}/payroll`),
      child('payroll-history', 'Payroll History', 'history', `${basePath}/payroll`),
    ],
  },
  {
    id: 'accounting-group',
    label: 'Accounting',
    icon: 'menu_book',
    children: [
      child('accounting', 'Chart of Accounts', 'account_tree', `${basePath}/accounting`),
      child('journal-entries', 'Journal Entries', 'edit_note', `${basePath}/accounting`),
      child('general-ledger', 'General Ledger', 'menu_book', `${basePath}/accounting`),
      child('accounts-payable', 'Accounts Payable', 'receipt', `${basePath}/accounting`),
      child('accounts-receivable', 'Accounts Receivable', 'request_quote', `${basePath}/accounting`),
      child('bank-reconciliation', 'Bank Reconciliation', 'account_balance', `${basePath}/payments`),
    ],
  },
  {
    id: 'reports-group',
    label: 'Reports',
    icon: 'bar_chart',
    children: [
      child('reports', 'Financial Reports', 'bar_chart', `${basePath}/reports`),
      child('department-reports', 'Department Reports', 'analytics', `${basePath}/project-overview`),
      child('expense-reports', 'Expense Reports', 'request_quote', `${basePath}/reports`),
      child('budget-reports', 'Budget Reports', 'account_balance_wallet', `${basePath}/reports`),
      child('payment-reports', 'Payment Reports', 'payments', `${basePath}/reports`),
      child('payroll-reports', 'Payroll Reports', 'badge', `${basePath}/reports`),
      child('tax-reports', 'Tax Reports', 'gavel', `${basePath}/compliance`),
    ],
  },
  {
    id: 'departments',
    label: 'Departments',
    icon: 'domain',
    children: [
      child('project-overview', 'All Departments', 'domain', `${basePath}/project-overview`),
      child('department-it', 'IT', 'dns', `${basePath}/project-overview?department=IT`),
      child('department-hr', 'HR', 'groups', `${basePath}/project-overview?department=HR`),
      child('department-media', 'Media', 'campaign', `${basePath}/project-overview?department=Media`),
      child('department-law', 'Law', 'gavel', `${basePath}/project-overview?department=Law`),
      child('department-executive', 'Executive', 'workspace_premium', `${basePath}/project-overview?department=Executive`),
      child('department-outsourcing', 'Outsourcing', 'handshake', `${basePath}/project-overview?department=Outsourcing`),
    ],
  },
  {
    id: 'audit',
    label: 'Audit',
    icon: 'policy',
    children: [
      child('activity-logs', 'Activity Logs', 'history', `${basePath}/activity`),
      child('approval-history', 'Approval History', 'approval', `${basePath}/approvals`),
      child('audit-trail', 'Financial Audit Trail', 'policy', `${basePath}/activity`),
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: 'settings',
    restrictedToHead: true,
    children: [
      child('finance-employees', 'Finance Employees', 'manage_accounts', `${basePath}/settings`),
      child('approvals', 'Approval Rules', 'rule', `${basePath}/approvals`),
      child('finance-categories', 'Finance Categories', 'category', `${basePath}/settings`),
      child('settings', 'Finance Settings', 'settings', `${basePath}/settings`),
    ],
  },
  {
    id: 'support-group',
    label: 'Support',
    icon: 'support_agent',
    children: [child('support', 'Support', 'support_agent', `${basePath}/support`)],
  },
];

const flattenSections = (sections) => sections.flatMap((item) => (Array.isArray(item.children) ? item.children : [item]));

const FinancePortal = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isFinanceHead = ['finance_manager', 'admin', 'super_admin'].includes(String(user?.role || '').toLowerCase());
  const visibleSections = useMemo(
    () => FINANCE_SECTIONS.filter((item) => !item.restrictedToHead || isFinanceHead),
    [isFinanceHead]
  );
  const flatSections = useMemo(() => flattenSections(visibleSections), [visibleSections]);

  const activeSection = useMemo(() => {
    const pathname = location.pathname;
    const search = location.search || '';
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
    if (search.includes('status=submitted')) return 'requests-pending';
    if (search.includes('type=income')) return 'transactions-income';
    return 'dashboard';
  }, [location.pathname, location.search]);

  const mobileItems = useMemo(
    () =>
      flatSections.slice(0, 8).map((item) => ({
        key: item.id,
        label: item.label,
        icon: item.icon,
        active: activeSection === item.id,
        onClick: () => navigate(item.path),
      })),
    [activeSection, flatSections, navigate]
  );

  return (
    <AppLayout
      sidebar={
        <FinanceSidebar
          activeSection={activeSection}
          onSelect={(sectionId) => navigate(flatSections.find((item) => item.id === sectionId)?.path || '/finance/dashboard')}
          sections={visibleSections}
        />
      }
      title="Finance Portal"
      subtitle={isFinanceHead ? 'Financial control layer' : 'Finance operations queue'}
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
