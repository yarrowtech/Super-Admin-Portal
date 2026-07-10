import { lazy } from 'react';

// ── Eager: tiny pages needed before auth check ──────────────────────────────
export { default as LoginPage } from '../components/common/Login';
export { default as ManagerLoginPage } from '../components/manager/ManagerLogin';
export { default as NotFoundPage } from '../components/404/NotFound';

// ── HR portal ────────────────────────────────────────────────────────────────
export const HRDashboardPage     = lazy(() => import('../components/hr/HRDashboard'));
export const HRTasksPage         = lazy(() => import('../components/hr/HRTaskManagement'));
export const HRProfilesPage      = lazy(() => import('../components/hr/HRProfiles'));
export const HROutsourcingPage   = lazy(() => import('../components/manager/ManagerOutsourcingPage'));

export const EmployeesPage    = lazy(() => import('../components/hr/pages/EmployeesPage'));
export const AttendancePage   = lazy(() => import('../components/hr/pages/AttendancePage'));
export const LeavePage        = lazy(() => import('../components/hr/pages/LeavePage'));
export const RecruitmentPage  = lazy(() => import('../components/hr/pages/RecruitmentPage'));
export const PerformancePage  = lazy(() => import('../components/hr/pages/PerformancePage'));
export const CommunicationPage = lazy(() => import('../components/hr/pages/CommunicationPage'));

// ── Manager portal ───────────────────────────────────────────────────────────
export const ManagerDashboardPage    = lazy(() => import('../components/manager/ManagerDashboard'));
export const ManagerProductsPage     = lazy(() => import('../components/manager/ProductManagement'));
export const ManagerTeamPage         = lazy(() => import('../components/manager/TeamManagement'));
export const ManagerReportsPage      = lazy(() => import('../components/manager/ManagerReports'));
export const ManagerChatPage         = lazy(() => import('../components/manager/ManagerChat'));
export const ManagerWorkBoardPage    = lazy(() => import('../components/manager/EmployeeWorkBoard'));
export const ManagerLeavePage        = lazy(() => import('../components/manager/ManagerLeaveManagement'));
export const ManagerTasksPage        = lazy(() => import('../components/manager/ManagerTaskManagement'));
export const ManagerOutsourcingPage   = lazy(() => import('../components/manager/ManagerOutsourcingPage'));
export const ManagerRecruitmentPage   = lazy(() => import('../components/manager/ManagerRecruitment'));

// ── Employee portal ──────────────────────────────────────────────────────────
export const EmployeeDashboardPage = lazy(() => import('../components/employee/EmployeeDashboardModern'));
export const EmployeeProjectsPage  = lazy(() => import('../components/employee/EmployeeProjects'));
export const EmployeeTasksPage     = lazy(() => import('../components/employee/EmployeeTasks'));
export const EmployeeLeavePage     = lazy(() => import('../components/employee/EmployeeLeaveManagement'));
export const EmployeeDocumentsPage = lazy(() => import('../components/employee/EmployeeDocuments'));
export const EmployeeTeamPage      = lazy(() => import('../components/employee/EmployeeTeamDirectory'));
export const EmployeeChatPage      = lazy(() => import('../components/employee/EmployeeChat'));
export const EmployeeProfilePage   = lazy(() => import('../components/employee/EmployeeProfile'));
export const EmployeeJobBoardPage  = lazy(() => import('../components/employee/EmployeeJobBoard'));

// ── Admin portal ─────────────────────────────────────────────────────────────
export const AdminDashboardPage          = lazy(() => import('../components/admin/AdminDashboardEnterprise'));
export const SuperAdminControlCenterPage = lazy(() => import('../components/admin/SuperAdminDashboard'));
export const AdminProjectsPage           = lazy(() => import('../components/admin/AdminProjectsPage'));
export const AdminDepartmentsPage        = lazy(() => import('../components/admin/DepartmentsOverview'));
export const AdminSecurityPage           = lazy(() => import('../components/admin/SecurityMonitoring'));
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

// ── Media portal ─────────────────────────────────────────────────────────────
export const MediaDashboardPage = lazy(() => import('../components/media/MediaPortal'));
export const MediaPortalPage    = MediaDashboardPage;

// ── Department portals ────────────────────────────────────────────────────────
export const SalesDashboardPage    = lazy(() => import('../components/media/MediaSalesPortal'));
export const SalesQueryPage        = lazy(() => import('../components/media/SalesQueryPage'));
export const ResearchDashboardPage = lazy(() => import('../components/department/DepartmentPortals').then(m => ({ default: m.ResearchDepartmentPortal })));

// ── Law portal ────────────────────────────────────────────────────────────────
export const LegalDocManagementPage  = lazy(() => import('../components/law/pages/LegalDocumentManagementPage'));
export const LSWLegalLibraryPage     = lazy(() => import('../components/law/LSWLegalLibrary'));
export const AdminLegalRegistryPage  = lazy(() => import('../components/admin/AdminLegalRegistry'));
export const AdminLegalLibraryPage   = lazy(() => import('../components/law/LSWLegalLibrary'));
export const LawContractsPage        = lazy(() => import('../components/law/LawContractsPage'));

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

// ── Shared Settings & Support pages ──────────────────────────────────────────
export const HRSettingsPage        = lazy(() => import('../components/hr/HRSettingsPage'));
export const HRSupportPage         = lazy(() => import('../components/hr/HRSupportPage'));
export const ManagerSettingsPage   = lazy(() => import('../components/manager/ManagerSettingsPage'));
export const ManagerSupportPage    = lazy(() => import('../components/manager/ManagerSupportPage'));
export const EmployeeSettingsPage  = lazy(() => import('../components/employee/EmployeeSettingsPage'));
export const EmployeeSupportPage   = lazy(() => import('../components/employee/EmployeeSupportPage'));

// ── Admin Support Center & Settings ──────────────────────────────────────────
export const AdminSupportCenterPage = lazy(() => import('../components/admin/AdminSupportCenter'));
export const AdminSettingsPage      = lazy(() => import('../components/admin/AdminSettingsPage'));
