import { lazy } from 'react';

// ── Eager: tiny pages needed before auth check ──────────────────────────────
export { default as LoginPage } from '../components/common/Login';
export { default as NotFoundPage } from '../components/404/NotFound';

// ── HR portal ────────────────────────────────────────────────────────────────
export const HRDashboardPage     = lazy(() => import('../components/hr/HRDashboard'));
export const HRTasksPage         = lazy(() => import('../components/hr/HRTaskManagement'));
export const HRProfilesPage      = lazy(() => import('../components/hr/HRProfiles'));
export const HROutsourcingPage   = lazy(() => import('../components/hr/HROutsourcingPage'));

export const EmployeesPage    = lazy(() => import('../components/hr/pages/EmployeesPage'));
export const AttendancePage   = lazy(() => import('../components/hr/pages/AttendancePage'));
export const LeavePage        = lazy(() => import('../components/hr/pages/LeavePage'));
export const RecruitmentPage  = lazy(() => import('../components/hr/pages/RecruitmentPage'));
export const PerformancePage  = lazy(() => import('../components/hr/pages/PerformancePage'));
export const CommunicationPage = lazy(() => import('../components/hr/pages/CommunicationPage'));

// ── Admin portal ─────────────────────────────────────────────────────────────
export const AdminDashboardPage          = lazy(() => import('../components/admin/AdminDashboardEnterprise'));
export const SuperAdminControlCenterPage = lazy(() => import('../components/admin/SuperAdminDashboard'));
export const AdminProjectsPage           = lazy(() => import('../components/admin/AdminProjectsPage'));
export const AdminPortfolioPage          = lazy(() => import('../components/admin/AdminPortfolioPage'));
export const HostedProjectWorkspacePage  = lazy(() => import('../components/shared/HostedProjectWorkspacePage'));
export const AdminDepartmentsPage        = lazy(() => import('../components/admin/DepartmentsOverview'));
export const AdminSecurityPage           = lazy(() => import('../components/admin/SecurityMonitoring'));
export const AdminSystemLogsPage         = lazy(() => import('../components/admin/SystemLogsPage'));
export const AdminReportsPage            = lazy(() => import('../components/admin/ReportsAnalytics'));
export const AdminWorkflowsPage          = lazy(() => import('../components/admin/WorkflowManagement'));
export const AdminUsersPage              = lazy(() => import('../components/admin/UserRoleManagement'));

// ── Admin — Outsourcing sub-pages (named exports from barrel) ─────────────────
export const AdminOutsourcingDashboardPage  = lazy(() => import('../components/admin/AdminOutsourcingPages').then(m => ({ default: m.AdminOutsourcingDashboardPage })));
export const AdminOutsourcingFreelancersPage = lazy(() => import('../components/admin/AdminOutsourcingPages').then(m => ({ default: m.AdminOutsourcingFreelancersPage })));
export const AdminOutsourcingJobsPage       = lazy(() => import('../components/admin/AdminOutsourcingPages').then(m => ({ default: m.AdminOutsourcingJobsPage })));
export const AdminOutsourcingContractsPage  = lazy(() => import('../components/admin/AdminOutsourcingPages').then(m => ({ default: m.AdminOutsourcingContractsPage })));
export const AdminOutsourcingReportsPage    = lazy(() => import('../components/admin/AdminOutsourcingPages').then(m => ({ default: m.AdminOutsourcingReportsPage })));
export const AdminOutsourcingSupportPage    = lazy(() => import('../components/admin/AdminOutsourcingPages').then(m => ({ default: m.AdminOutsourcingSupportPage })));

// ── Outsourcing portal (named exports from barrel) ────────────────────────────
export const OutsourcingDashboardPage    = lazy(() => import('../components/outsourcing/OutsourcingPages').then(m => ({ default: m.OutsourcingDashboardPage })));
export const OutsourcingJobsPage         = lazy(() => import('../components/outsourcing/OutsourcingPages').then(m => ({ default: m.OutsourcingJobsPage })));
export const OutsourcingContractsPage    = lazy(() => import('../components/outsourcing/OutsourcingPages').then(m => ({ default: m.OutsourcingContractsPage })));
export const OutsourcingTimeLogsPage     = lazy(() => import('../components/outsourcing/OutsourcingPages').then(m => ({ default: m.OutsourcingTimeLogsPage })));
export const OutsourcingProfilePage      = lazy(() => import('../components/outsourcing/OutsourcingPages').then(m => ({ default: m.OutsourcingProfilePage })));
export const OutsourcingActivityPage     = lazy(() => import('../components/outsourcing/OutsourcingPages').then(m => ({ default: m.OutsourcingActivityPage })));
export const OutsourcingInvoicesPage     = lazy(() => import('../components/outsourcing/OutsourcingPages').then(m => ({ default: m.OutsourcingInvoicesPage })));
export const OutsourcingPaymentsPage     = lazy(() => import('../components/outsourcing/OutsourcingPages').then(m => ({ default: m.OutsourcingPaymentsPage })));
export const OutsourcingNotificationsPage = lazy(() => import('../components/outsourcing/OutsourcingPages').then(m => ({ default: m.OutsourcingNotificationsPage })));
export const OutsourcingSettingsPage     = lazy(() => import('../components/outsourcing/OutsourcingPages').then(m => ({ default: m.OutsourcingSettingsPage })));
export const OutsourcingSupportPage      = lazy(() => import('../components/outsourcing/OutsourcingPages').then(m => ({ default: m.OutsourcingSupportPage })));

export const OutsourcingProjectsPage = lazy(() => import('../components/outsourcing/OutsourcingProjectsPage'));
export const OutsourcingEfnbmmsAdminManagementPage = lazy(() => import('../components/outsourcing/OutsourcingEfnbmmsAdminManagementPage'));
export const OutsourcingEdifyEightWorkspacePage = lazy(() => import('../components/outsourcing/OutsourcingEdifyEightWorkspacePage'));
export const OutsourcingEdifyEightTeachersPage = lazy(() => import('../components/outsourcing/OutsourcingEdifyEightTeachersPage'));

// ── Media portal ─────────────────────────────────────────────────────────────
export const MediaDashboardPage = lazy(() => import('../components/media/MediaPortal'));
export const MediaPortalPage    = MediaDashboardPage;
export const MediaProjectDetailPage = lazy(() => import('../components/media/MediaProjectDetail'));
export const MediaHeadDashboardPage = lazy(() => import('../components/media/head/MediaHeadPortal'));
export const MediaHeadProjectDetailPage = lazy(() => import('../components/media/head/MediaHeadProjectDetail'));
export const ProjectOverviewPage = lazy(() => import('../components/shared/ProjectOverviewPage'));

// Employee portal
export const EmployeeDashboardPage = lazy(() => import('../components/employee/EmployeeWorkspacePages').then(m => ({ default: m.EmployeeDashboardPage })));
export const EmployeeTasksPage = lazy(() => import('../components/employee/EmployeeWorkspacePages').then(m => ({ default: m.EmployeeTasksPage })));
export const EmployeeProjectsPage = lazy(() => import('../components/employee/EmployeeWorkspacePages').then(m => ({ default: m.EmployeeProjectsPage })));
export const EmployeeAttendancePage = lazy(() => import('../components/employee/EmployeeWorkspacePages').then(m => ({ default: m.EmployeeAttendancePage })));
export const EmployeeLeavePage = lazy(() => import('../components/employee/EmployeeWorkspacePages').then(m => ({ default: m.EmployeeLeavePage })));
export const EmployeeTeamPage = lazy(() => import('../components/employee/EmployeeWorkspacePages').then(m => ({ default: m.EmployeeTeamPage })));
export const EmployeeDocumentsPage = lazy(() => import('../components/employee/EmployeeWorkspacePages').then(m => ({ default: m.EmployeeDocumentsPage })));
export const EmployeeProfileRoute = lazy(() => import('../components/employee/EmployeeWorkspacePages').then(m => ({ default: m.EmployeeProfileRoute })));
export const EmployeeChatPage = lazy(() => import('../components/employee/EmployeeWorkspacePages').then(m => ({ default: m.EmployeeChatPage })));
export const ManagerDashboardPage = lazy(() => import('../components/manager/ManagerWorkspacePages').then(m => ({ default: m.ManagerDashboardPage })));
export const ManagerTeamPage = lazy(() => import('../components/manager/ManagerWorkspacePages').then(m => ({ default: m.ManagerTeamPage })));
export const ManagerProjectsPage = lazy(() => import('../components/manager/ManagerWorkspacePages').then(m => ({ default: m.ManagerProjectsPage })));
export const ManagerTasksPage = lazy(() => import('../components/manager/ManagerWorkspacePages').then(m => ({ default: m.ManagerTasksPage })));
export const ManagerWorkReviewsPage = lazy(() => import('../components/manager/ManagerWorkspacePages').then(m => ({ default: m.ManagerWorkReviewsPage })));
export const ManagerLeavePage = lazy(() => import('../components/manager/ManagerWorkspacePages').then(m => ({ default: m.ManagerLeavePage })));

// ── Department portals ────────────────────────────────────────────────────────
export const SalesDashboardPage    = lazy(() => import('../components/media/MediaSalesPortal'));
export const SalesQueryPage        = lazy(() => import('../components/media/SalesQueryPage'));
export const SalesSubmissionPage   = lazy(() => import('../components/media/SalesSubmissionsPage'));
export const SalesProjectOverviewPage = lazy(() => import('../components/media/SalesProjectOverviewPage'));
export const SalesProfilePage = lazy(() => import('../components/media/SalesProfilePage'));

// ── Law portal ────────────────────────────────────────────────────────────────
export const LegalDocManagementPage  = lazy(() => import('../components/law/pages/LegalDocumentManagementPage'));
export const LSWLegalLibraryPage     = lazy(() => import('../components/law/LSWLegalLibrary'));
export const AdminLegalRegistryPage  = lazy(() => import('../components/admin/AdminLegalRegistry'));
export const AdminLegalLibraryPage   = lazy(() => import('../components/law/LSWLegalLibrary'));
export const LawContractsPage        = lazy(() => import('../components/law/LawContractsPage'));
export const AdminSalesSubmissionsPage = lazy(() => import('../components/admin/AdminSalesSubmissions'));

// ── IT portal ────────────────────────────────────────────────────────────────
export const ITDashboard    = lazy(() => import('../components/it/ITDashboard'));
export const ITDashboardPage = ITDashboard;

export const ITOverviewPage        = lazy(() => import('../components/it/ITWorkspacePages').then(m => ({ default: m.ITOverviewPage })));
export const ITProductsPage        = lazy(() => import('../components/it/ITWorkspacePages').then(m => ({ default: m.ITProductsPage })));
export const ITProductWorkspacePage = lazy(() => import('../components/it/ITWorkspacePages').then(m => ({ default: m.ITProductWorkspacePage })));
export const ITTicketsPage         = lazy(() => import('../components/it/ITWorkspacePages').then(m => ({ default: m.ITTicketsPage })));
export const ITTicketDetailPage    = lazy(() => import('../components/it/ITWorkspacePages').then(m => ({ default: m.ITTicketDetailPage })));
export const ITAssetsPage          = lazy(() => import('../components/it/ITWorkspacePages').then(m => ({ default: m.ITAssetsPage })));
export const ITAssetDetailPage     = lazy(() => import('../components/it/ITWorkspacePages').then(m => ({ default: m.ITAssetDetailPage })));
export const ITOperationsPage      = lazy(() => import('../components/it/ITWorkspacePages').then(m => ({ default: m.ITOperationsPage })));
export const ITActivityPage        = lazy(() => import('../components/it/ITWorkspacePages').then(m => ({ default: m.ITActivityPage })));
export const ITSecurityPage        = lazy(() => import('../components/it/ITWorkspacePages').then(m => ({ default: m.ITSecurityPage })));
export const ITUserAccessPage      = lazy(() => import('../components/it/ITWorkspacePages').then(m => ({ default: m.ITUserAccessPage })));
export const ITChangesPage         = lazy(() => import('../components/it/ITWorkspacePages').then(m => ({ default: m.ITChangesPage })));
export const ITReportsPage         = lazy(() => import('../components/it/ITWorkspacePages').then(m => ({ default: m.ITReportsPage })));
export const ITSettingsPage        = lazy(() => import('../components/it/ITSettingsPage'));
export const ITSupportCenterPage   = lazy(() => import('../components/admin/AdminSupportCenter'));

// ── Finance portal ───────────────────────────────────────────────────────────
export const FinanceOverviewPage        = lazy(() => import('../components/finance/FinanceWorkspacePages').then(m => ({ default: m.FinanceOverviewPage })));
export const FinanceDepartmentProfilesPage = lazy(() => import('../components/finance/FinanceWorkspacePages').then(m => ({ default: m.FinanceDepartmentProfilesPage })));
export const FinanceInvoicesPage        = lazy(() => import('../components/finance/FinanceWorkspacePages').then(m => ({ default: m.FinanceInvoicesPage })));
export const FinanceInvoiceDetailPage   = lazy(() => import('../components/finance/FinanceWorkspacePages').then(m => ({ default: m.FinanceInvoiceDetailPage })));
export const FinancePaymentsPage        = lazy(() => import('../components/finance/FinanceWorkspacePages').then(m => ({ default: m.FinancePaymentsPage })));
export const FinanceExpensesPage        = lazy(() => import('../components/finance/FinanceWorkspacePages').then(m => ({ default: m.FinanceExpensesPage })));
export const FinanceBudgetsPage         = lazy(() => import('../components/finance/FinanceWorkspacePages').then(m => ({ default: m.FinanceBudgetsPage })));
export const FinancePayrollPage         = lazy(() => import('../components/finance/FinanceWorkspacePages').then(m => ({ default: m.FinancePayrollPage })));
export const FinanceAccountingPage      = lazy(() => import('../components/finance/FinanceWorkspacePages').then(m => ({ default: m.FinanceAccountingPage })));
export const FinanceReportsPage         = lazy(() => import('../components/finance/FinanceWorkspacePages').then(m => ({ default: m.FinanceReportsPage })));
export const FinanceCompliancePage      = lazy(() => import('../components/finance/FinanceWorkspacePages').then(m => ({ default: m.FinanceCompliancePage })));
export const FinanceDirectoryPage       = lazy(() => import('../components/finance/FinanceWorkspacePages').then(m => ({ default: m.FinanceDirectoryPage })));
export const FinanceActivityPage        = lazy(() => import('../components/finance/FinanceWorkspacePages').then(m => ({ default: m.FinanceActivityPage })));
export const FinanceApprovalsPage       = lazy(() => import('../components/finance/FinanceWorkspacePages').then(m => ({ default: m.FinanceApprovalsPage })));
export const FinanceSettingsPage        = lazy(() => import('../components/finance/FinanceSettingsPage'));
export const FinanceSupportPage         = lazy(() => import('../components/finance/FinanceSupportPage'));

// ── Shared Settings & Support pages ──────────────────────────────────────────
export const HRSettingsPage        = lazy(() => import('../components/hr/HRSettingsPage'));
export const HRSupportPage         = lazy(() => import('../components/hr/HRSupportPage'));

// ── Admin Support Center & Settings ──────────────────────────────────────────
export const AdminSupportCenterPage = lazy(() => import('../components/admin/AdminSupportCenter'));
export const AdminSettingsPage      = lazy(() => import('../components/admin/AdminSettingsPage'));

// ── Digital Portfolios (cross-portal read-only viewer) ───────────────────────
export const PortfolioViewerPage    = lazy(() => import('../components/shared/PortfolioViewerPage'));
