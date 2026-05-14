import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

const navItems = [
  { id: 'accounts', label: 'Chart of Accounts', icon: 'account_tree' },
  { id: 'journals', label: 'Journal Entries', icon: 'menu_book' },
  { id: 'erp-reports', label: 'ERP Reports', icon: 'summarize' },
  { id: 'invoices', label: 'Invoices', icon: 'receipt_long' },
  { id: 'payments', label: 'Payments', icon: 'payment' },
  { id: 'expenses', label: 'Expenses', icon: 'receipt' },
  { id: 'budgets', label: 'Budgets', icon: 'savings' },
  { id: 'payroll', label: 'Payroll', icon: 'account_balance_wallet' },
  { id: 'reports', label: 'Reports', icon: 'assessment' },
  { id: 'compliance', label: 'Compliance', icon: 'verified' },
  { id: 'vendors', label: 'Vendors', icon: 'storefront' },
  { id: 'clients', label: 'Clients', icon: 'groups' }
];

const FinanceSidebar = ({ activeTab = 'invoices', onSelect }) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  if (!canAccessPortal(user, PORTALS.FINANCE)) return null;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 z-10 hidden h-screen w-[250px] flex-col overflow-hidden border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-background-dark md:flex">
      <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
            data-alt="User avatar image"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB_HFSbNHCmNgTeKZAiFk2MqdSEqd36bsfGVXM1jMm4u-rmgBnoBDcVJpkRH2VlN__XL8gTeUCSNaWwJKRI1aQWTzEJFlZwOsBOty_vqThHZd_iMdGC6uv-at2zgu8HswCT2SKDxAFdEANBncCJPPnVF1JdJE9LC2WD9x9fHsLvY8x4J6_F_lwFafZnDp-dxW2kdcZUMybmvUNwjVpPxdbp4V3asAgzpdG_97qVGZe72iXV5Qth5NM66WFVrkCjZS88_sYOYcCBphv1")',
            }}
          ></div>
          <div className="flex flex-col">
            <h1 className="text-neutral-800 dark:text-neutral-100 text-base font-medium leading-normal">
              Finance Admin
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm font-normal leading-normal">
              Finance Department
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect?.(item.id)}
                className={`flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left transition ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-white/10'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <p className="text-sm font-medium leading-normal">{item.label}</p>
              </button>
            );
          })}
        </div>
      </nav>
      <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
        <button className="mb-3 flex min-h-11 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em]">
          <span className="truncate">Create Report</span>
        </button>
        <div className="flex flex-col gap-1">
          <div className="flex min-h-11 items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
            <span className="material-symbols-outlined">settings</span>
            <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
              Settings
            </p>
          </div>
          <button onClick={handleLogout} className="flex min-h-11 w-full items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer">
            <span className="material-symbols-outlined">logout</span>
            <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">
              Logout
            </p>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default FinanceSidebar;
