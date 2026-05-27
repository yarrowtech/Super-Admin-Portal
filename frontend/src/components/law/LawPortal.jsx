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
      { key: 'dashboard', label: 'Workflow', icon: 'gavel', active: location.pathname === '/law/dashboard', onClick: () => navigate('/law/dashboard') },
      { key: 'legal-docs', label: 'Legal Docs', icon: 'description', active: location.pathname.startsWith('/law/legal-docs'), onClick: () => navigate('/law/legal-docs') },
      { key: 'legal-library', label: 'Approved', icon: 'library_books', active: location.pathname.startsWith('/law/legal-library'), onClick: () => navigate('/law/legal-library') },
      { key: 'agreements', label: 'Agreements', icon: 'contract', active: location.pathname.startsWith('/law/agreements'), onClick: () => navigate('/law/agreements') },
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
