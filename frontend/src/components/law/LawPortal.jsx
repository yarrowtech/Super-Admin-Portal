import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LawDashboard from './LawDashboard';
import LawSidebar from './LawSidebar';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';

const LawPortal = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const mobileItems = useMemo(
    () => [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', active: location.pathname === '/law/dashboard', onClick: () => navigate('/law/dashboard') },
      { key: 'agreements', label: 'Agreements', icon: 'contract', active: location.pathname.startsWith('/law/agreements'), onClick: () => navigate('/law/agreements') },
      { key: 'policy', label: 'Policy', icon: 'policy', active: location.pathname.startsWith('/law/policy'), onClick: () => navigate('/law/policy') },
      { key: 'disputes', label: 'Disputes', icon: 'balance', active: location.pathname.startsWith('/law/disputes'), onClick: () => navigate('/law/disputes') },
    ],
    [location.pathname, navigate]
  );

  return (
    <AppLayout
      sidebar={<LawSidebar />}
      title="Law Portal"
      subtitle="Legal operations"
      mobileIcon="gavel"
      mobileItems={mobileItems}
      user={user}
      showHeader={false}
    >
      <div className="portal-content p-0">
        <LawDashboard />
      </div>
    </AppLayout>
  );
};

export default LawPortal;
