import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './components/common/Login';
import HRPortal from './components/hr/HRPortal';
import HRDashboard from './components/hr/HRDashboard';
import ApplicantTracking from './components/hr/ApplicantTracking';
import Attendance from './components/hr/Attendance';
import EmployeeDirectory from './components/hr/EmployeeDirectory';
import LeaveManagement from './components/hr/LeaveManagement';
import Notices from './components/hr/Notices';
import Performance from './components/hr/Performance';
import StaffWorkReport from './components/hr/StaffWorkReport';
import ComplaintSolutions from './components/hr/ComplaintSolutions';
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
import NotFound from './components/404/NotFound';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const handleLogin = (role) => {
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const renderHRPage = (PageComponent) =>
    isAuthenticated && userRole === 'hr' ? (
      <HRPortal>
        <PageComponent />
      </HRPortal>
    ) : (
      <Navigate to="/login" replace />
    );

  const renderAdminPage = (PageComponent) =>
    isAuthenticated && userRole === 'admin' ? (
      <AdminPortal>
        <PageComponent />
      </AdminPortal>
    ) : (
      <Navigate to="/login" replace />
    );

  const renderManagerPage = (PageComponent) =>
    isAuthenticated && userRole === 'manager' ? (
      <ManagerPortal>
        <PageComponent />
      </ManagerPortal>
    ) : (
      <Navigate to="/login" replace />
    );

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to={
                userRole === 'ceo' ? '/ceo/dashboard' :
                userRole === 'admin' ? '/admin/dashboard' :
                userRole === 'manager' ? '/manager/dashboard' :
                userRole === 'it' ? '/it/dashboard' : 
                userRole === 'finance' ? '/finance/dashboard' : 
                '/hr/dashboard'
              } replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          } 
        />
        <Route path="/hr/dashboard" element={renderHRPage(HRDashboard)} />
        <Route path="/hr/applicants" element={renderHRPage(ApplicantTracking)} />
        <Route path="/hr/attendance" element={renderHRPage(Attendance)} />
        <Route path="/hr/employees" element={renderHRPage(EmployeeDirectory)} />
        <Route path="/hr/leave" element={renderHRPage(LeaveManagement)} />
        <Route path="/hr/notices" element={renderHRPage(Notices)} />
        <Route path="/hr/performance" element={renderHRPage(Performance)} />
        <Route path="/hr/staff-report" element={renderHRPage(StaffWorkReport)} />
        <Route path="/hr/complaints" element={renderHRPage(ComplaintSolutions)} />
        <Route 
          path="/it/dashboard" 
          element={
            isAuthenticated && userRole === 'it' ? 
              <ITPortal /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/finance/dashboard" 
          element={
            isAuthenticated && userRole === 'finance' ? 
              <FinancePortal /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route path="/admin/dashboard" element={renderAdminPage(AdminDashboard)} />
        <Route path="/admin/users" element={renderAdminPage(UserRoleManagement)} />
        <Route path="/admin/departments" element={renderAdminPage(DepartmentsOverview)} />
        <Route path="/admin/security" element={renderAdminPage(SecurityMonitoring)} />
        <Route path="/admin/reports" element={renderAdminPage(ReportsAnalytics)} />
        <Route path="/admin/workflows" element={renderAdminPage(WorkflowManagement)} />
        <Route 
          path="/ceo/dashboard" 
          element={
            isAuthenticated && userRole === 'ceo' ? 
              <CEOPortal /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route path="/manager/dashboard" element={renderManagerPage(ManagerDashboard)} />
        <Route path="/manager/products" element={renderManagerPage(ProductManagement)} />
        <Route path="/manager/team" element={renderManagerPage(TeamManagement)} />
        <Route path="/manager/reports" element={renderManagerPage(ManagerReports)} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
