import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Loader from '../components/common/Loader';
import {
  LoginPage,
  NotFoundPage,
  AdminDashboardPage,
  SuperAdminControlCenterPage,
  AdminProjectsPage,
  HostedProjectWorkspacePage,
  AdminDepartmentsPage,
  AdminSecurityPage,
  AdminSystemLogsPage,
  AdminReportsPage,
  AdminWorkflowsPage,
  AdminUsersPage,
  AdminOutsourcingDashboardPage,
  AdminOutsourcingFreelancersPage,
  AdminOutsourcingJobsPage,
  AdminOutsourcingContractsPage,
  AdminOutsourcingReportsPage,
  AdminOutsourcingSupportPage,
  HRDashboardPage,
  HRTasksPage,
  HROutsourcingPage,
  EmployeesPage,
  AttendancePage,
  LeavePage,
  RecruitmentPage,
  PerformancePage,
  CommunicationPage,
  HRProfilesPage,
  OutsourcingDashboardPage,
  OutsourcingJobsPage,
  OutsourcingContractsPage,
  OutsourcingTimeLogsPage,
  OutsourcingProfilePage,
  OutsourcingActivityPage,
  OutsourcingPaymentsPage,
  OutsourcingSettingsPage,
  OutsourcingSupportPage,
  MediaDashboardPage,
  MediaProjectDetailPage,
  MediaHeadDashboardPage,
  MediaHeadProjectDetailPage,
  ProjectOverviewPage,
  SalesDashboardPage,
  SalesQueryPage,
  SalesSubmissionPage,
  SalesProjectOverviewPage,
  SalesProfilePage,
  // Legal Document Management
  LegalDocManagementPage,
  LSWLegalLibraryPage,
  AdminLegalRegistryPage,
  AdminLegalLibraryPage,
  AdminSalesSubmissionsPage,
  LawContractsPage,
  ITDashboard,
  ITOverviewPage,
  ITProductsPage,
  ITProductWorkspacePage,
  ITTicketsPage,
  ITTicketDetailPage,
  ITAssetsPage,
  ITAssetDetailPage,
  ITOperationsPage,
  ITActivityPage,
  ITSecurityPage,
  ITUserAccessPage,
  ITChangesPage,
  ITReportsPage,
  ITSettingsPage,
  ITSupportCenterPage,
  FinanceOverviewPage,
  FinanceDepartmentProfilesPage,
  FinanceInvoicesPage,
  FinanceInvoiceDetailPage,
  FinancePaymentsPage,
  FinanceExpensesPage,
  FinanceBudgetsPage,
  FinancePayrollPage,
  FinanceAccountingPage,
  FinanceReportsPage,
  FinanceCompliancePage,
  FinanceDirectoryPage,
  FinanceActivityPage,
  FinanceApprovalsPage,
  FinanceSettingsPage,
  FinanceSupportPage,
  HRSettingsPage,
  HRSupportPage,
  AdminSupportCenterPage,
  AdminSettingsPage,
  AdminPortfolioPage,
  PortfolioViewerPage,
  OutsourcingProjectsPage,
  OutsourcingEfnbmmsAdminManagementPage,
  OutsourcingEdifyEightWorkspacePage,
  OutsourcingEdifyEightTeachersPage,
  EmployeeDashboardPage,
  EmployeeTasksPage,
  EmployeeProjectsPage,
  EmployeeJobsPage,
  EmployeeAttendancePage,
  EmployeeLeavePage,
  EmployeeTeamPage,
  EmployeeDocumentsPage,
  EmployeeProfileRoute,
  EmployeeChatPage,
  ManagerDashboardPage,
  ManagerTeamPage,
  ManagerProjectsPage,
  ManagerTasksPage,
  ManagerWorkReviewsPage,
  ManagerLeavePage,
} from '../pages';
import {
  AdminLayout,
  CEOPortalLayout,
  FinanceLayout,
  HRLayout,
  ITLayout,
  LawLayout,
  OutsourcingLayout,
  EmployeeLayout,
  ManagerLayout,
} from '../layouts/portals';
import { useAuth } from '../context/AuthContext';
import { canAccessPortal, PORTALS } from '../utils/rbac';
import { dashboardWorkflowApi } from '../services/dashboardWorkflow';
import { allowRoleWithAdmin as allow, defaultRolePath, OutsourcingRoute, PrivateRoute } from './routeGuards';
import { emitFrontendEvent } from '../utils/logger';

const adminRoles = ['admin', 'super_admin', 'superadmin'];
const managerRoles = ['manager', 'it_manager', ...adminRoles];
const employeeRoles = ['employee', 'it_employee', 'finance_employee', 'law_employee', ...adminRoles];

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
          const message = err?.message || 'Failed to load dashboard workflow';
          const isProjectContextError = /project\s*id required/i.test(message);
          if (portal === PORTALS.HR && isProjectContextError) {
            setWorkflowLoading(false);
            return;
          }
          setWorkflowError(message);
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

const NavigationLogger = () => {
  const location = useLocation();

  useEffect(() => {
    emitFrontendEvent('info', {
      eventType: 'navigation',
      module: 'router',
      action: 'navigation',
      status: 'success',
      route: `${location.pathname}${location.search}`,
    }, 'Frontend navigation');
  }, [location.pathname, location.search]);

  return null;
};

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Router>
      <NavigationLogger />
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
          <div className="flex flex-col items-center gap-3">
            <Loader />
            <p className="text-sm font-medium text-neutral-500">Loading...</p>
          </div>
        </div>
      }>
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
          <Route path="project-overview" element={<ProjectOverviewPage portalKey="hr" portalName="HR Portal" />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="users" element={<EmployeesPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="recruitment" element={<RecruitmentPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="communication" element={<CommunicationPage />} />
          <Route path="profiles" element={<HRProfilesPage />} />
          <Route path="work-updates" element={<Navigate to="/hr/tasks?view=updates" replace />} />
          <Route path="tasks" element={<HRTasksPage />} />
          <Route path="outsourcing" element={<HROutsourcingPage />} />
          <Route path="settings" element={<HRSettingsPage />} />
          <Route path="support" element={<HRSupportPage />} />
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
        >
          <Route index element={<ITOverviewPage />} />
          <Route path="project-overview" element={<ProjectOverviewPage portalKey="it" portalName="IT Portal" />} />
          <Route path="products" element={<ITProductsPage />} />
          <Route path="products/:projectId" element={<ITProductWorkspacePage />} />
          <Route path="tickets" element={<ITTicketsPage />} />
          <Route path="tickets/:ticketId" element={<ITTicketDetailPage />} />
          <Route path="assets" element={<ITAssetsPage />} />
          <Route path="assets/:assetId" element={<ITAssetDetailPage />} />
          <Route path="security"    element={<ITSecurityPage />} />
          <Route path="iam"         element={<ITUserAccessPage />} />
          <Route path="changes"     element={<ITChangesPage />} />
          <Route path="reports"     element={<ITReportsPage />} />
          <Route path="operations"  element={<ITOperationsPage />} />
          <Route path="activity"    element={<ITActivityPage />} />
          <Route path="settings"    element={<ITSettingsPage />} />
          <Route path="support-center" element={<ITSupportCenterPage />} />
        </Route>

        <Route
          path="/manager"
          element={
            <PortalRoute portal={PORTALS.MANAGER}>
              <PrivateRoute roles={managerRoles}>
                <ManagerLayout />
              </PrivateRoute>
            </PortalRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ManagerDashboardPage />} />
          <Route path="projects" element={<ManagerProjectsPage />} />
          <Route path="team" element={<ManagerTeamPage />} />
          <Route path="tasks" element={<ManagerTasksPage />} />
          <Route path="work-reviews" element={<ManagerWorkReviewsPage />} />
          <Route path="leave" element={<ManagerLeavePage />} />
          <Route path="project-overview" element={<ProjectOverviewPage portalKey="manager" portalName="Manager Portal" />} />
        </Route>
        <Route
          path="/employee"
          element={
            <PortalRoute portal={PORTALS.EMPLOYEE}>
              <PrivateRoute roles={employeeRoles}>
                <EmployeeLayout />
              </PrivateRoute>
            </PortalRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<EmployeeDashboardPage />} />
          <Route path="project-overview" element={<ProjectOverviewPage portalKey="employee" portalName="Employee Portal" />} />
          <Route path="projects" element={<EmployeeProjectsPage />} />
          <Route path="tasks" element={<EmployeeTasksPage />} />
          <Route path="attendance" element={<EmployeeAttendancePage />} />
          <Route path="leave" element={<EmployeeLeavePage />} />
          <Route path="documents" element={<EmployeeDocumentsPage />} />
          <Route path="team" element={<EmployeeTeamPage />} />
          <Route path="profile" element={<EmployeeProfileRoute />} />
          <Route path="chat" element={<EmployeeChatPage />} />
          <Route path="jobs" element={<EmployeeJobsPage />} />
        </Route>

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
        >
          <Route index element={<FinanceOverviewPage />} />
          <Route path="project-overview" element={<FinanceDepartmentProfilesPage />} />
          <Route path="invoices" element={<FinanceInvoicesPage />} />
          <Route path="invoices/:invoiceId" element={<FinanceInvoiceDetailPage />} />
          <Route path="payments" element={<FinancePaymentsPage />} />
          <Route path="expenses" element={<FinanceExpensesPage />} />
          <Route path="budgets" element={<FinanceBudgetsPage />} />
          <Route path="payroll" element={<FinancePayrollPage />} />
          <Route path="accounting" element={<FinanceAccountingPage />} />
          <Route path="reports" element={<FinanceReportsPage />} />
          <Route path="compliance" element={<FinanceCompliancePage />} />
          <Route path="directory" element={<FinanceDirectoryPage />} />
          <Route path="activity" element={<FinanceActivityPage />} />
          <Route path="approvals" element={<FinanceApprovalsPage />} />
          <Route path="settings" element={<FinanceSettingsPage />} />
          <Route path="support" element={<FinanceSupportPage />} />
        </Route>

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
          path="/media/dashboard/projects/:projectSlug"
          element={
            <PortalRoute portal={PORTALS.MEDIA}>
              <PrivateRoute roles={allow('media')}>
                <MediaProjectDetailPage />
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/media/dashboard/:section"
          element={
            <PortalRoute portal={PORTALS.MEDIA}>
              <PrivateRoute roles={allow('media')}>
                <MediaDashboardPage />
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/media/head/projects/:projectId"
          element={
            <PortalRoute portal={PORTALS.MEDIA}>
              <PrivateRoute roles={allow('media_head')}>
                <MediaHeadProjectDetailPage />
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/media/head/:view?"
          element={
            <PortalRoute portal={PORTALS.MEDIA}>
              <PrivateRoute roles={allow('media_head')}>
                <MediaHeadDashboardPage />
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/media"
          element={
            <PortalRoute portal={PORTALS.MEDIA}>
              <PrivateRoute roles={allow('media')}>
                <Navigate to="/media/dashboard" replace />
              </PrivateRoute>
            </PortalRoute>
          }
        />

        <Route
          path="/sales/dashboard"
          element={
            <PrivateRoute roles={allow('media_sales')}>
              <Navigate to="/media/sales/dashboard" replace />
            </PrivateRoute>
          }
        />
        <Route
          path="/media/sales/dashboard"
          element={
            <PortalRoute portal={PORTALS.MEDIA}>
              <PrivateRoute roles={allow('media_sales')}>
                <SalesDashboardPage />
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/media/sales/query"
          element={
            <PortalRoute portal={PORTALS.MEDIA}>
              <PrivateRoute roles={allow('media_sales')}>
                <SalesQueryPage />
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/media/sales/submission"
          element={
            <PortalRoute portal={PORTALS.MEDIA}>
              <PrivateRoute roles={allow('media_sales')}>
                <SalesSubmissionPage />
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/media/sales/profile"
          element={
            <PortalRoute portal={PORTALS.MEDIA}>
              <PrivateRoute roles={allow('media_sales')}>
                <SalesProfilePage />
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/media/sales/project-overview"
          element={
            <PortalRoute portal={PORTALS.MEDIA}>
              <PrivateRoute roles={allow('media_sales')}>
                <SalesProjectOverviewPage />
              </PrivateRoute>
            </PortalRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminDashboardPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminUsersPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/super-admin"
          element={
            <PortalRoute portal={PORTALS.SUPER_ADMIN}>
              <PrivateRoute roles={['super_admin', 'superadmin']}>
                {withPortal(AdminLayout, SuperAdminControlCenterPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/control-center"
          element={<Navigate to="/admin/super-admin" replace />}
        />
        <Route
          path="/admin/projects"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminProjectsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/projects/:projectCode"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, () => <HostedProjectWorkspacePage portal="admin" />)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/efnbmms-admin-management"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, OutsourcingEfnbmmsAdminManagementPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/edifyeight-teachers"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, OutsourcingEdifyEightWorkspacePage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route path="/admin/efnbmms-teachers" element={<Navigate to="/admin/efnbmms-admin-management" replace />} />
        <Route
          path="/admin/departments"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminDepartmentsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/security"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminSecurityPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/system-logs"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminSystemLogsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminReportsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/workflows"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminWorkflowsPage)}
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
              <PrivateRoute roles={adminRoles}>
                <Navigate to="/admin/outsourcing/dashboard" replace />
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/outsourcing/dashboard"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminOutsourcingDashboardPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/outsourcing/freelancers"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminOutsourcingFreelancersPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/outsourcing/jobs"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminOutsourcingJobsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/outsourcing/contracts"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminOutsourcingContractsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/outsourcing/reports"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminOutsourcingReportsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />

        <Route
          path="/admin/outsourcing/support"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminOutsourcingSupportPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/support-center"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminSupportCenterPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/digital-portfolio"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminPortfolioPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminSettingsPage)}
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
          <Route path="projects" element={<OutsourcingProjectsPage />} />
          <Route path="projects/:projectCode" element={<HostedProjectWorkspacePage portal="outsourcing" />} />
          <Route path="efnbmms-admin-management" element={<OutsourcingEfnbmmsAdminManagementPage />} />
          <Route path="edifyeight" element={<OutsourcingEdifyEightWorkspacePage />} />
          <Route path="edifyeight-teachers" element={<OutsourcingEdifyEightTeachersPage />} />
          <Route path="efnbmms-teachers" element={<Navigate to="/outsourcing/efnbmms-admin-management" replace />} />
          <Route path="jobs" element={<OutsourcingJobsPage />} />
          <Route path="contracts" element={<OutsourcingContractsPage />} />
          <Route path="time-logs" element={<OutsourcingTimeLogsPage />} />
          <Route path="profile" element={<OutsourcingProfilePage />} />
          <Route path="activity" element={<OutsourcingActivityPage />} />
          <Route path="payments" element={<OutsourcingPaymentsPage />} />
          <Route path="settings" element={<OutsourcingSettingsPage />} />
          <Route path="support" element={<OutsourcingSupportPage />} />
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

        {/* ── Legal Document Management — Admin ── */}
        <Route
          path="/admin/legal-docs"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminLegalRegistryPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />
        <Route
          path="/admin/legal-library"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminLegalLibraryPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />

        {/* ── Sales Query Submissions — Admin ── */}
        <Route
          path="/admin/sales-submissions"
          element={
            <PortalRoute portal={PORTALS.ADMIN}>
              <PrivateRoute roles={adminRoles}>
                {withPortal(AdminLayout, AdminSalesSubmissionsPage)}
              </PrivateRoute>
            </PortalRoute>
          }
        />

        {/* Digital Portfolios — read-only, any authenticated user across every portal.
            Admin-only CRUD lives at /admin/digital-portfolio. */}
        <Route
          path="/portfolios"
          element={
            <PrivateRoute>
              <PortfolioViewerPage />
            </PrivateRoute>
          }
        />

        <Route path="/" element={<Navigate to={user ? defaultRolePath(user) : '/login'} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </Router>
  );
}

