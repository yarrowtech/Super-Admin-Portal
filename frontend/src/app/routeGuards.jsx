/* eslint-disable react-refresh/only-export-components -- Compatibility module exports route components and shared guard helpers. */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessPortal, canEnterPortal, IT_PORTAL_ROLES, HR_PORTAL_ROLES, FINANCE_PORTAL_ROLES, MEDIA_PORTAL_ROLES, LAW_PORTAL_ROLES, EMPLOYEE_PORTAL_ROLES } from '../utils/rbac';
import Loader from '../components/common/Loader';

export { getDefaultRoute as defaultRolePath } from '../routes/routeHelpers';
import { getDefaultRoute as defaultRolePath } from '../routes/routeHelpers';

export const LoadingScreen = ({ label = 'Loading...' }) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-50 px-6 text-center dark:bg-neutral-950">
    <Loader />
    <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{label}</p>
  </div>
);

export const PrivateRoute = ({ roles, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to={defaultRolePath(user)} replace />;
  }

  return children;
};

export const PortalAccessGuard = ({ portal, children }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user || !token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessPortal(user, portal)) {
    return <Navigate to={defaultRolePath(user)} replace />;
  }

  return children;
};

export const OutsourcingRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/outsourcing/login" replace />;
  if (!canEnterPortal(user, 'outsourcing')) {
    return <Navigate to={defaultRolePath(user)} replace />;
  }

  return children;
};

const DEPARTMENT_ROLE_GROUPS = {
  it: IT_PORTAL_ROLES,
  hr: HR_PORTAL_ROLES,
  finance: FINANCE_PORTAL_ROLES,
  media: MEDIA_PORTAL_ROLES,
  law: LAW_PORTAL_ROLES,
  employee: EMPLOYEE_PORTAL_ROLES,
};

export const allowRoleWithAdmin = (role) => {
  const group = DEPARTMENT_ROLE_GROUPS[role];
  return group
    ? [...group, 'admin', 'super_admin', 'superadmin']
    : [role, 'admin', 'super_admin', 'superadmin'];
};
