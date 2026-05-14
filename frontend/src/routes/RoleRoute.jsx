import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDefaultRoute } from './routeHelpers';

const RoleRoute = ({ roles = [], children }) => {
  const { user } = useAuth();

  if (roles.length && !roles.includes(user?.role)) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  return children;
};

export default RoleRoute;
