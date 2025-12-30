import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/common/Login';
import HRPortal from './components/hr/HRPortal';
import HRDashboard from './components/hr/HRDashboard';
import HRTaskManagement from './components/hr/HRTaskManagement';
import {
  EmployeesPage,
  AttendancePage,
  LeavePage,
  RecruitmentPage,
  PerformancePage,
  CommunicationPage,
  WorkUpdatesPage,
} from './components/hr/pages';
import ITPortal from './components/it/ITPortal';
import FinancePortal from './components/finance/FinancePortal';
import AdminPortal from './components/admin/AdminPortal';
import AdminDashboard from './components/admin/AdminDashboard';
import DepartmentsOverview from './components/admin/DepartmentsOverview';
import SecurityMonitoring from './components/admin/SecurityMonitoring';
import ReportsAnalytics from './components/admin/ReportsAnalytics';
import WorkflowManagement from './components/admin/WorkflowManagement';
import UserRoleManagement from './components/admin/UserRoleManagement';
import CEOPortal from './components/ceo/CEOPortal';
import ManagerPortal from './components/manager/ManagerPortal';
import ManagerDashboard from './components/manager/ManagerDashboard';
import ProductManagement from './components/manager/ProductManagement';
import TeamManagement from './components/manager/TeamManagement';
import ManagerReports from './components/manager/ManagerReports';
import ManagerChat from './components/manager/ManagerChat';
import ManagerLogin from './components/manager/ManagerLogin';
import EmployeeWorkBoard from './components/manager/EmployeeWorkBoard';
import ManagerLeaveManagement from './components/manager/ManagerLeaveManagement';
import ManagerTaskManagement from './components/manager/ManagerTaskManagement';
import EmployeePortal from './components/employee/EmployeePortal';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import EmployeeProjects from './components/employee/EmployeeProjects';
import EmployeeTasks from './components/employee/EmployeeTasks';
import EmployeeLeaveManagement from './components/employee/EmployeeLeaveManagement';
import EmployeeDocuments from './components/employee/EmployeeDocuments';
import EmployeeTeamDirectory from './components/employee/EmployeeTeamDirectory';
import EmployeeChat from './components/employee/EmployeeChat';
import NotFound from './components/404/NotFound';
import { useAuth } from './context/AuthContext';

const defaultRolePath = (role) => {
  switch (role) {
    case 'ceo':
      return '/ceo/dashboard';
    case 'admin':
      return '/admin/dashboard';
    case 'manager':
      return '/manager/dashboard';
    case 'it':
      return '/it/dashboard';
    case 'finance':
      return '/finance/dashboard';
    case 'employee':
      return '/employee/dashboard';
    case 'hr':
    default:
      return '/hr/dashboard';
  }
};

const PrivateRoute = ({ roles, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-neutral-700 dark:text-neutral-200">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={defaultRolePath(user.role)} replace />;
  }

  return children;
};

const withPortal = (Portal, Page) => (
  <Portal>
    <Page />
  </Portal>
);

const allow = (role) => [role, 'admin'];

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={defaultRolePath(user.role)} replace />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/manager/login"
          element={
            user ? (
              <Navigate to={defaultRolePath(user.role)} replace />
            ) : (
              <ManagerLogin />
            )
          }
        />

        {/* HR - Streamlined Routes */}
        <Route
          path="/hr"
          element={
            <PrivateRoute roles={allow('hr')}>
              <HRPortal />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<HRDashboard />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="recruitment" element={<RecruitmentPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="communication" element={<CommunicationPage />} />
          <Route path="work-updates" element={<WorkUpdatesPage />} />
          <Route path="tasks" element={<HRTaskManagement />} />
        </Route>

        {/* IT */}
        <Route
          path="/it/dashboard"
          element={
            <PrivateRoute roles={allow('it')}>
              <ITPortal />
            </PrivateRoute>
          }
        />

        {/* Finance */}
        <Route
          path="/finance/dashboard"
          element={
            <PrivateRoute roles={allow('finance')}>
              <FinancePortal />
            </PrivateRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute roles={['admin']}>
              {withPortal(AdminPortal, AdminDashboard)}
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PrivateRoute roles={['admin']}>
              {withPortal(AdminPortal, UserRoleManagement)}
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <PrivateRoute roles={['admin']}>
              {withPortal(AdminPortal, DepartmentsOverview)}
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/security"
          element={
            <PrivateRoute roles={['admin']}>
              {withPortal(AdminPortal, SecurityMonitoring)}
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <PrivateRoute roles={['admin']}>
              {withPortal(AdminPortal, ReportsAnalytics)}
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/workflows"
          element={
            <PrivateRoute roles={['admin']}>
              {withPortal(AdminPortal, WorkflowManagement)}
            </PrivateRoute>
          }
        />

        {/* CEO */}
        <Route
          path="/ceo/dashboard"
          element={
            <PrivateRoute roles={allow('ceo')}>
              <CEOPortal />
            </PrivateRoute>
          }
        />

        {/* Manager */}
        <Route
          path="/manager/dashboard"
          element={
            <PrivateRoute roles={allow('manager')}>
              {withPortal(ManagerPortal, ManagerDashboard)}
            </PrivateRoute>
          }
        />
        <Route
          path="/manager/work-board"
          element={
            <PrivateRoute roles={allow('manager')}>
              {withPortal(ManagerPortal, EmployeeWorkBoard)}
            </PrivateRoute>
          }
        />
        <Route
          path="/manager/products"
          element={
            <PrivateRoute roles={allow('manager')}>
              {withPortal(ManagerPortal, ProductManagement)}
            </PrivateRoute>
          }
        />
        <Route
          path="/manager/tasks"
          element={
            <PrivateRoute roles={allow('manager')}>
              {withPortal(ManagerPortal, ManagerTaskManagement)}
            </PrivateRoute>
          }
        />
        <Route
          path="/manager/team"
          element={
            <PrivateRoute roles={allow('manager')}>
              {withPortal(ManagerPortal, TeamManagement)}
            </PrivateRoute>
          }
        />
        <Route
          path="/manager/reports"
          element={
            <PrivateRoute roles={allow('manager')}>
              {withPortal(ManagerPortal, ManagerReports)}
            </PrivateRoute>
          }
        />
        <Route
          path="/manager/leave"
          element={
            <PrivateRoute roles={allow('manager')}>
              {withPortal(ManagerPortal, ManagerLeaveManagement)}
            </PrivateRoute>
          }
        />
        <Route
          path="/manager/chat"
          element={
            <PrivateRoute roles={allow('manager')}>
              {withPortal(ManagerPortal, ManagerChat)}
            </PrivateRoute>
          }
        />

        {/* Employee */}
        <Route
          path="/employee"
          element={
            <PrivateRoute roles={allow('employee')}>
              {withPortal(EmployeePortal, EmployeeDashboard)}
            </PrivateRoute>
          }
        />
        <Route
          path="/employee/dashboard"
          element={
            <PrivateRoute roles={allow('employee')}>
              {withPortal(EmployeePortal, EmployeeDashboard)}
            </PrivateRoute>
          }
        />
        <Route
          path="/employee/projects"
          element={
            <PrivateRoute roles={allow('employee')}>
              {withPortal(EmployeePortal, EmployeeProjects)}
            </PrivateRoute>
          }
        />
        <Route
          path="/employee/tasks"
          element={
            <PrivateRoute roles={allow('employee')}>
              {withPortal(EmployeePortal, EmployeeTasks)}
            </PrivateRoute>
          }
        />
        <Route
          path="/employee/leave"
          element={
            <PrivateRoute roles={allow('employee')}>
              {withPortal(EmployeePortal, EmployeeLeaveManagement)}
            </PrivateRoute>
          }
        />
        <Route
          path="/employee/documents"
          element={
            <PrivateRoute roles={allow('employee')}>
              {withPortal(EmployeePortal, EmployeeDocuments)}
            </PrivateRoute>
          }
        />
        <Route
          path="/employee/team"
          element={
            <PrivateRoute roles={allow('employee')}>
              {withPortal(EmployeePortal, EmployeeTeamDirectory)}
            </PrivateRoute>
          }
        />
        <Route
          path="/employee/chat"
          element={
            <PrivateRoute roles={allow('employee')}>
              {withPortal(EmployeePortal, EmployeeChat)}
            </PrivateRoute>
          }
        />

        <Route path="/" element={<Navigate to={user ? defaultRolePath(user.role) : '/login'} replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
