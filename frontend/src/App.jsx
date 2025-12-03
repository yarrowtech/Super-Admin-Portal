import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './components/common/Login';
import Dashboard from './components/common/Dashboard';
import ITPortal from './components/it/ITPortal';
import FinancePortal from './components/finance/FinancePortal';
import AdminPortal from './components/admin/AdminPortal';
import CEOPortal from './components/ceo/CEOPortal';
import ManagerPortal from './components/manager/ManagerPortal';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const handleLogin = (role) => {
    setIsAuthenticated(true);
    setUserRole(role);
  };

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
        <Route 
          path="/hr/dashboard" 
          element={
            isAuthenticated && userRole === 'hr' ? 
              <Dashboard /> : 
              <Navigate to="/login" replace />
          } 
        />
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
        <Route 
          path="/admin/dashboard" 
          element={
            isAuthenticated && userRole === 'admin' ? 
              <AdminPortal /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/ceo/dashboard" 
          element={
            isAuthenticated && userRole === 'ceo' ? 
              <CEOPortal /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/manager/dashboard" 
          element={
            isAuthenticated && userRole === 'manager' ? 
              <ManagerPortal /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
