import { lazy } from 'react';

// Portal shells are lazy so the entry chunk only carries the shell of the portal the
// user actually opens. Every consumer renders them inside the app-level <Suspense>.
const loaders = {
  AdminLayout: () => import('../components/admin/AdminPortal'),
  CEOPortalLayout: () => import('../components/ceo/CEOPortal'),
  FinanceLayout: () => import('../components/finance/FinancePortal'),
  HRLayout: () => import('../components/hr/HRPortal'),
  ITLayout: () => import('../components/it/ITPortal'),
  LawLayout: () => import('../components/law/LawPortal'),
  OutsourcingLayout: () => import('../components/outsourcing/OutsourcingPortal'),
  EmployeeLayout: () => import('../components/employee/EmployeePortal'),
  ManagerLayout: () => import('../components/manager/ManagerPortal'),
};

export const AdminLayout = lazy(loaders.AdminLayout);
export const CEOPortalLayout = lazy(loaders.CEOPortalLayout);
export const FinanceLayout = lazy(loaders.FinanceLayout);
export const HRLayout = lazy(loaders.HRLayout);
export const ITLayout = lazy(loaders.ITLayout);
export const LawLayout = lazy(loaders.LawLayout);
export const OutsourcingLayout = lazy(loaders.OutsourcingLayout);
export const EmployeeLayout = lazy(loaders.EmployeeLayout);
export const ManagerLayout = lazy(loaders.ManagerLayout);

// Warm the shell chunk for the portal a path belongs to (idle prefetch after login).
const shellByPrefix = {
  admin: 'AdminLayout',
  ceo: 'CEOPortalLayout',
  hr: 'HRLayout',
  it: 'ITLayout',
  finance: 'FinanceLayout',
  law: 'LawLayout',
  outsourcing: 'OutsourcingLayout',
  employee: 'EmployeeLayout',
  manager: 'ManagerLayout',
};

export const prefetchPortalShell = (path = '') => {
  const key = shellByPrefix[String(path).split('/').filter(Boolean)[0]];
  if (!key) return;
  const run = () => { loaders[key]().catch(() => {}); };
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 500);
};
