import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessPortal, MEDIA_PORTAL_ROLES } from '../utils/rbac';

const normalizeOutsourcingType = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const normalizeDepartment = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s&-]+/g, '_');

const hasProjectAssignments = (user) => {
  const metadata = user?.metadata || {};
  const assigned = metadata.projectAssignments ?? metadata.assignedProjects ?? user?.assignedProjects ?? [];
  return Array.isArray(assigned) && assigned.length > 0;
};

export const defaultRolePath = (user) => {
  const role = user?.role;
  const userMeta = user?.metadata || {};
  const outsourcingType = normalizeOutsourcingType(userMeta.outsourcingType);
  const department = normalizeDepartment(user?.department);

  if (
    role === 'freelancer' ||
    department === 'outsourcing' ||
    department === 'outsource' ||
    department === 'external_workforce' ||
    outsourcingType === 'third_party_worker' ||
    outsourcingType === '3rd_party_worker' ||
    outsourcingType === 'thirdpartyworker' ||
    outsourcingType === 'freelancer' ||
    outsourcingType === 'freelaner'
  ) {
    return '/outsourcing/dashboard';
  }

  switch (role) {
    case 'ceo':
      return '/ceo/dashboard';
    case 'super_admin':
    case 'superadmin':
      return '/admin/super-admin';
    case 'admin':
      return '/admin/dashboard';
    case 'manager':
      return '/manager/dashboard';
    case 'it':
      return '/it/dashboard';
    case 'law':
      return '/law/dashboard';
    case 'finance':
      return '/finance/dashboard';
    case 'media':
      return '/media/dashboard';
    case 'marketing_head':
    case 'media_manager':
    case 'content_writer':
    case 'graphic_designer':
    case 'video_editor':
    case 'seo_specialist':
    case 'social_media_manager':
    case 'ads_manager':
    case 'project_manager':
    case 'department_head':
    case 'client_viewer':
      return '/media/dashboard';
    case 'sales':
      return '/sales/dashboard';
    case 'research_operator':
      return '/research/dashboard';
    case 'employee':
      return hasProjectAssignments(user) ? '/employee/projects' : '/employee/dashboard';
    case 'hr':
    default:
      return '/hr/dashboard';
  }
};

export const LoadingScreen = ({ label = 'Loading...' }) => (
  <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 text-center text-sm font-semibold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-200">
    {label}
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

  const type = normalizeOutsourcingType(user?.metadata?.outsourcingType);
  const department = normalizeDepartment(user?.department);
  if (
    user.role !== 'admin' &&
    user.role !== 'freelancer' &&
    department !== 'outsourcing' &&
    department !== 'outsource' &&
    department !== 'external_workforce' &&
    type !== 'third_party_worker' &&
    type !== '3rd_party_worker' &&
    type !== 'thirdpartyworker' &&
    type !== 'freelancer' &&
    type !== 'freelaner'
  ) {
    return <Navigate to={defaultRolePath(user)} replace />;
  }

  return children;
};

export const allowRoleWithAdmin = (role) =>
  role === 'media'
    ? [...MEDIA_PORTAL_ROLES, 'admin', 'super_admin', 'superadmin']
    : [role, 'admin', 'super_admin', 'superadmin'];
