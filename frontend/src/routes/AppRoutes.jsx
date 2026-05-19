import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import {
  LoginPage,
  ManagerLoginPage,
  NotFoundPage,
  AdminDashboardPage,
  AdminDepartmentsPage,
  AdminSecurityPage,
  AdminReportsPage,
  AdminWorkflowsPage,
  AdminUsersPage,
  SuperAdminPage,
  AdminOutsourcingDashboardPage,
  AdminOutsourcingFreelancersPage,
  AdminOutsourcingJobsPage,
  AdminOutsourcingContractsPage,
  AdminOutsourcingReportsPage,
  HRDashboardPage,
  HRTasksPage,
  EmployeesPage,
  AttendancePage,
  LeavePage,
  RecruitmentPage,
  PerformancePage,
  CommunicationPage,
  ManagerDashboardPage,
  ManagerProductsPage,
  ManagerTeamPage,
  ManagerReportsPage,
  ManagerChatPage,
  ManagerWorkBoardPage,
  ManagerLeavePage,
  ManagerTasksPage,
  EmployeeDashboardPage,
  EmployeeProjectsPage,
  EmployeeTasksPage,
  EmployeeLeavePage,
  EmployeeDocumentsPage,
  EmployeeTeamPage,
  EmployeeChatPage,
  EmployeeProfilePage,
  HRProfilesPage,
  OutsourcingDashboardPage,
  OutsourcingJobsPage,
  OutsourcingContractsPage,
  OutsourcingTimeLogsPage,
  OutsourcingProfilePage,
  OutsourcingActivityPage,
  OutsourcingInvoicesPage,
  OutsourcingPaymentsPage,
  OutsourcingNotificationsPage,
  MediaDashboardPage,
  SalesDashboardPage,
  ResearchDashboardPage,
} from '../pages';
import {
  AdminLayout,
  CEOPortalLayout,
  EmployeeLayout,
  FinanceLayout,
  HRLayout,
  ITLayout,
  LawLayout,
  ManagerLayout,
  OutsourcingLayout,
} from '../layouts/portals';
import { useAuth } from '../context/AuthContext';
import { canAccessPortal, PORTALS } from '../utils/rbac';
import { dashboardWorkflowApi } from '../services/dashboardWorkflow';
import { allowRoleWithAdmin as allow, defaultRolePath, OutsourcingRoute, PrivateRoute } from './routeGuards';

const PortalRoute = ({ portal, children }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();
  const [workflowLoading, setWorkflowLoading] = useState(true);
  const [workflowError, setWorkflowError] = useState('');

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!user || !token) {
        if (alive) setWorkflowLoading(false);
        return;
      }
      try {
        setWorkflowLoading(true);
        setWorkflowError('');
        const cacheKey = `dashboard_workflow_${user.role}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          if (alive) setWorkflowLoading(false);
          return;
        }
        const res = await dashboardWorkflowApi.getMyWorkflow(token);
        if (res?.data) {
          sessionStorage.setItem(cacheKey, JSON.stringify(res.data));
        }
        if (alive) setWorkflowLoading(false);
      } catch (err) {
        if (alive) {
          setWorkflowError(err.message || 'Failed to load dashboard workflow');
          setWorkflowLoading(false);
        }
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [user, token]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-neutral-700 dark:text-neutral-200">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessPortal(user, portal)) {
    return <Navigate to={defaultRolePath(user)} replace />;
  }

  if (workflowLoading) {
    return <div className="flex h-screen items-center justify-center text-neutral-700 dark:text-neutral-200">Loading workflow...</div>;
  }

  if (workflowError) {
    return (
      <div className="flex h-screen items-center justify-center px-6 text-center text-red-600">
        Failed to load dashboard workflow. Please refresh.
      </div>
    );
  }

  return children;
};

const withPortal = (PortalComponent, PageComponent) =>
  React.createElement(PortalComponent, null, React.createElement(PageComponent));

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={defaultRolePath(user)} replace />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/manager/login"
          element={
            user ? (
              <Navigate to={defaultRolePath(user)} replace />
            ) : (
              <ManagerLoginPage />
            )
          }
        />

        <Route
          path="/hr"
          element={
            <PortalRoute portal={PORTALS.HR}>
              <PrivateRoute roles={allow('hr')}>
                <HRLayout />
              </PrivateRoute>
            </PortalRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<HRDashboardPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="recruitment" element={<RecruitmentPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="communication" element={<CommunicationPage />} />
          <Route path="profiles" element={<HRProfilesPage />} />
          <Route path="work-updates" element={<Navigate to="/hr/tasks?view=updates" replace />} />
          <Route path="tasks" element={<HRTasksPage />} />
        </Route>

        <Route
          path="/it/dashboard"
          element={
            <PortalRoute portal={PORTALS.IT}>
              <PrivateRoute roles={allow('it')}>
                <ITLayout />
              </PrivateRoute>
            </PortalRoute>
          }
        />

        <Route
          path="/law"
          element={
            <PrivateRoute roles={allow('law')}>
              <Navigate to="/law/dashboard" replace />
            </PrivateRoute>
          }
        />
        <Route
          path="/law/*"
          element={
            <PortalRoute portal={PORTALS.LAW}>
              <PrivateRoute roles={allow('law')}>
                <LawLayout />
              </PrivateRoute>
            </PortalRoute>
          }
        />

        <Route
          path="/finance"
          element={
            <PrivateRoute roles={allow('finance')}>
              <Navigate to="/finance/dashboard" replace />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/dashboard"
          element={
            <PortalRoute portal={PORTALS.FINANCE}>
              <PrivateRoute roles={allow('finance')}>
                <FinanceLayout />
              </PrivateRoute>
            </PortalRoute>
          }
        />

        <Route
          path="/media/dashboard"
          element={
            <PortalRoute portal={PORTALS.MEDIA}>
              <PrivateRoute roles={allow('media')}>
                <MediaDashboardPage />
              </PrivateRoute>
            </PortalRoute>
          }
        />

        <Route
          path="/sales/dashboard"
          element={
            <PortalRoute portal={PORTALS.SALES}>
              <PrivateRoute roles={allow('sales')}>
                <SalesDashboardPage />
              </PrivateRoute>
            </PortalRoute>
          }
        />

        <Route
          path="/research/dashboard"
          element={
            <PortalRoute portal={PORTALS.RESEARCH}>
              <PrivateRoute roles={allow('research_operator')}>
                <ResearchDashboardPage />
              </PrivateRoute>
            </PortalRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={['admin']}>
                {withPortal(AdminLayout, AdminDashboardPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={['admin']}>
                {withPortal(AdminLayout, AdminUsersPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={['admin']}>
                {withPortal(AdminLayout, AdminDepartmentsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/security"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={['admin']}>
                {withPortal(AdminLayout, AdminSecurityPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={['admin']}>
                {withPortal(AdminLayout, AdminReportsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/workflows"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={['admin']}>
                {withPortal(AdminLayout, AdminWorkflowsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/super-admin"
          element={
            <PortalRoute portal={PORTALS.SUPER_ADMIN}>
              <PrivateRoute roles={['admin']}>
                {withPortal(AdminLayout, SuperAdminPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/outsourcing/login"
          element={
            user ? (
              <Navigate to={defaultRolePath(user)} replace />
            ) : (
              <LoginPage loginMode="outsourcing" />
            )
          }
        />
        <Route
          path="/admin/outsourcing"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={['admin']}>
                <Navigate to="/admin/outsourcing/dashboard" replace />
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/outsourcing/dashboard"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={['admin']}>
                {withPortal(AdminLayout, AdminOutsourcingDashboardPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/outsourcing/freelancers"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={['admin']}>
                {withPortal(AdminLayout, AdminOutsourcingFreelancersPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/outsourcing/jobs"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={['admin']}>
                {withPortal(AdminLayout, AdminOutsourcingJobsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/outsourcing/contracts"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={['admin']}>
                {withPortal(AdminLayout, AdminOutsourcingContractsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/outsourcing/reports"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={['admin']}>
                {withPortal(AdminLayout, AdminOutsourcingReportsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />

        <Route
          path="/outsourcing"
          element={
            <OutsourcingRoute>
              <OutsourcingLayout />
            </OutsourcingRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OutsourcingDashboardPage />} />
          <Route path="jobs" element={<OutsourcingJobsPage />} />
          <Route path="contracts" element={<OutsourcingContractsPage />} />
          <Route path="time-logs" element={<OutsourcingTimeLogsPage />} />
          <Route path="profile" element={<OutsourcingProfilePage />} />
          <Route path="activity" element={<OutsourcingActivityPage />} />
          <Route path="invoices" element={<OutsourcingInvoicesPage />} />
          <Route path="payments" element={<OutsourcingPaymentsPage />} />
          <Route path="notifications" element={<OutsourcingNotificationsPage />} />
        </Route>

        <Route
          path="/ceo/dashboard"
          element={
            <PortalRoute portal={PORTALS.CEO}>
              <PrivateRoute roles={allow('ceo')}>
                <CEOPortalLayout />
              </PrivateRoute>
            </PortalRoute>
          }
        />

        <Route
          path="/manager/dashboard"
          element={
            <PortalRoute portal={PORTALS.MANAGER}>
              <PrivateRoute roles={allow('manager')}>
                {withPortal(ManagerLayout, ManagerDashboardPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/manager/work-board"
          element={
            <PortalRoute portal={PORTALS.MANAGER}>
              <PrivateRoute roles={allow('manager')}>
                {withPortal(ManagerLayout, ManagerWorkBoardPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/manager/products"
          element={
            <PortalRoute portal={PORTALS.MANAGER}>
              <PrivateRoute roles={allow('manager')}>
                {withPortal(ManagerLayout, ManagerProductsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/manager/tasks"
          element={
            <PortalRoute portal={PORTALS.MANAGER}>
              <PrivateRoute roles={allow('manager')}>
                {withPortal(ManagerLayout, ManagerTasksPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/manager/team"
          element={
            <PortalRoute portal={PORTALS.MANAGER}>
              <PrivateRoute roles={allow('manager')}>
                {withPortal(ManagerLayout, ManagerTeamPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/manager/reports"
          element={
            <PortalRoute portal={PORTALS.MANAGER}>
              <PrivateRoute roles={allow('manager')}>
                {withPortal(ManagerLayout, ManagerReportsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/manager/leave"
          element={
            <PortalRoute portal={PORTALS.MANAGER}>
              <PrivateRoute roles={allow('manager')}>
                {withPortal(ManagerLayout, ManagerLeavePage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/manager/chat"
          element={
            <PortalRoute portal={PORTALS.MANAGER}>
              <PrivateRoute roles={allow('manager')}>
                {withPortal(ManagerLayout, ManagerChatPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />

        <Route
          path="/employee"
          element={
            <PortalRoute portal={PORTALS.EMPLOYEE}>
              <PrivateRoute roles={allow('employee')}>
                {withPortal(EmployeeLayout, EmployeeDashboardPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/employee/dashboard"
          element={
            <PortalRoute portal={PORTALS.EMPLOYEE}>
              <PrivateRoute roles={allow('employee')}>
                {withPortal(EmployeeLayout, EmployeeDashboardPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/employee/projects"
          element={
            <PortalRoute portal={PORTALS.EMPLOYEE}>
              <PrivateRoute roles={allow('employee')}>
                {withPortal(EmployeeLayout, EmployeeProjectsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/employee/tasks"
          element={
            <PortalRoute portal={PORTALS.EMPLOYEE}>
              <PrivateRoute roles={allow('employee')}>
                {withPortal(EmployeeLayout, EmployeeTasksPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/employee/leave"
          element={
            <PortalRoute portal={PORTALS.EMPLOYEE}>
              <PrivateRoute roles={allow('employee')}>
                {withPortal(EmployeeLayout, EmployeeLeavePage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/employee/documents"
          element={
            <PortalRoute portal={PORTALS.EMPLOYEE}>
              <PrivateRoute roles={allow('employee')}>
                {withPortal(EmployeeLayout, EmployeeDocumentsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/employee/team"
          element={
            <PortalRoute portal={PORTALS.EMPLOYEE}>
              <PrivateRoute roles={allow('employee')}>
                {withPortal(EmployeeLayout, EmployeeTeamPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/employee/chat"
          element={
            <PortalRoute portal={PORTALS.EMPLOYEE}>
              <PrivateRoute roles={allow('employee')}>
                {withPortal(EmployeeLayout, EmployeeChatPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/employee/profile"
          element={
            <PortalRoute portal={PORTALS.EMPLOYEE}>
              <PrivateRoute roles={allow('employee')}>
                {withPortal(EmployeeLayout, EmployeeProfilePage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />

        <Route path="/" element={<Navigate to={user ? defaultRolePath(user) : '/login'} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

