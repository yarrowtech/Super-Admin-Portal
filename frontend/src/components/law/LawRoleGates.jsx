import React, { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LawDashboard = lazy(() => import('./LawDashboard'));
const LawEmployeeDashboard = lazy(() => import('./LawEmployeeDashboard'));

const isLawEmployee = (user) => String(user?.role || '').toLowerCase() === 'law_employee';

/** /law/dashboard: employees get a project-free task summary, everyone else the full dashboard. */
export const LawHome = () => {
  const { user } = useAuth();
  return isLawEmployee(user) ? <LawEmployeeDashboard /> : <LawDashboard />;
};

/**
 * Wraps law-head-only pages (contracts, documents, compliance, risk, policy API and the
 * catch-all that renders them). Law employees are sent back to their dashboard; the backend
 * separately rejects their API calls to those modules.
 */
export const LawHeadOnly = ({ children }) => {
  const { user } = useAuth();
  if (isLawEmployee(user)) return <Navigate to="/law/dashboard" replace />;
  return children;
};
