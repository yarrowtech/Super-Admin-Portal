import React from 'react';
import LoginPage from '../components/common/Login';
import ManagerLoginPage from '../components/manager/ManagerLogin';
import NotFoundPage from '../components/404/NotFound';

import HRDashboardPage from '../components/hr/HRModuleDashboard';
import HRTasksPage from '../components/hr/HRTaskManagement';
import HRProfilesPage from '../components/hr/HRProfiles';

import EmployeesPage from '../components/hr/pages/EmployeesPage';
import AttendancePage from '../components/hr/pages/AttendancePage';
import LeavePage from '../components/hr/pages/LeavePage';
import RecruitmentPage from '../components/hr/pages/RecruitmentPage';
import PerformancePage from '../components/hr/pages/PerformancePage';
import CommunicationPage from '../components/hr/pages/CommunicationPage';

import ManagerDashboardPage from '../components/manager/ManagerDashboard';
import ManagerProductsPage from '../components/manager/ProductManagement';
import ManagerTeamPage from '../components/manager/TeamManagement';
import ManagerReportsPage from '../components/manager/ManagerReports';
import ManagerChatPage from '../components/manager/ManagerChat';
import ManagerWorkBoardPage from '../components/manager/EmployeeWorkBoard';
import ManagerLeavePage from '../components/manager/ManagerLeaveManagement';
import ManagerTasksPage from '../components/manager/ManagerTaskManagement';

import EmployeeDashboardPage from '../components/employee/EmployeeDashboardModern';
import EmployeeProjectsPage from '../components/employee/EmployeeProjects';
import EmployeeTasksPage from '../components/employee/EmployeeTasks';
import EmployeeLeavePage from '../components/employee/EmployeeLeaveManagement';
import EmployeeDocumentsPage from '../components/employee/EmployeeDocuments';
import EmployeeTeamPage from '../components/employee/EmployeeTeamDirectory';
import EmployeeChatPage from '../components/employee/EmployeeChat';
import EmployeeProfilePage from '../components/employee/EmployeeProfile';

import AdminDashboardPage from '../components/admin/AdminDashboardEnterprise';
import SuperAdminControlCenterPage from '../components/admin/SuperAdminControlCenter';
import AdminDepartmentsPage from '../components/admin/DepartmentsOverview';
import AdminSecurityPage from '../components/admin/SecurityMonitoring';
import AdminReportsPage from '../components/admin/ReportsAnalytics';
import AdminWorkflowsPage from '../components/admin/WorkflowManagement';
import AdminUsersPage from '../components/admin/UserRoleManagement';

import {
  AdminOutsourcingDashboardPage,
  AdminOutsourcingFreelancersPage,
  AdminOutsourcingJobsPage,
  AdminOutsourcingContractsPage,
  AdminOutsourcingReportsPage,
} from '../components/admin/AdminOutsourcingPages';

import {
  OutsourcingDashboardPage,
  OutsourcingJobsPage,
  OutsourcingContractsPage,
  OutsourcingTimeLogsPage,
  OutsourcingProfilePage,
  OutsourcingActivityPage,
  OutsourcingInvoicesPage,
  OutsourcingPaymentsPage,
  OutsourcingNotificationsPage,
} from '../components/outsourcing/OutsourcingPages';
import OutsourcingProjectsPage from '../components/outsourcing/OutsourcingProjectsPage';

import MediaDashboardPage from '../components/media/MediaPortal';

import {
  SalesDepartmentPortal,
  ResearchDepartmentPortal,
} from '../components/department/DepartmentPortals';

import LegalDocManagementPage from '../components/law/pages/LegalDocumentManagementPage';
import LSWLegalLibraryPage from '../components/law/LSWLegalLibrary';
import AdminLegalRegistryPage from '../components/admin/AdminLegalRegistry';
import AdminLegalLibraryPage from '../components/law/LSWLegalLibrary';
import ITDashboard from '../components/it/ITDashboard';
import {
  ITOverviewPage,
  ITProductsPage,
  ITProductWorkspacePage,
  ITTicketsPage,
  ITTicketDetailPage,
  ITAssetsPage,
  ITAssetDetailPage,
} from '../components/it/ITWorkspacePages';

export {
  LoginPage,
  ManagerLoginPage,
  NotFoundPage,
  HRDashboardPage,
  HRTasksPage,
  HRProfilesPage,
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
  AdminDashboardPage,
  SuperAdminControlCenterPage,
  AdminDepartmentsPage,
  AdminSecurityPage,
  AdminReportsPage,
  AdminWorkflowsPage,
  AdminUsersPage,
  AdminOutsourcingDashboardPage,
  AdminOutsourcingFreelancersPage,
  AdminOutsourcingJobsPage,
  AdminOutsourcingContractsPage,
  AdminOutsourcingReportsPage,
  OutsourcingDashboardPage,
  OutsourcingProjectsPage,
  OutsourcingJobsPage,
  OutsourcingContractsPage,
  OutsourcingTimeLogsPage,
  OutsourcingProfilePage,
  OutsourcingActivityPage,
  OutsourcingInvoicesPage,
  OutsourcingPaymentsPage,
  OutsourcingNotificationsPage,
  MediaDashboardPage,
  MediaDashboardPage as MediaPortalPage,
  LegalDocManagementPage,
  LSWLegalLibraryPage,
  AdminLegalRegistryPage,
  AdminLegalLibraryPage,
  ITOverviewPage,
  ITProductsPage,
  ITProductWorkspacePage,
  ITTicketsPage,
  ITTicketDetailPage,
  ITAssetsPage,
  ITAssetDetailPage,
  ITDashboard,
};

export const SalesDashboardPage = SalesDepartmentPortal;
export const ResearchDashboardPage = ResearchDepartmentPortal;
export const ITDashboardPage = ITDashboard;
