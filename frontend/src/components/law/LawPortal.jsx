import React from 'react';
import { Outlet } from 'react-router-dom';
import LawSidebar from './LawSidebar';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';

const LawPortal = () => {
  const { user } = useAuth();

  return (
    <AppLayout
      sidebar={<LawSidebar />}
      title="Law Portal"
      subtitle="Legal operations"
      mobileIcon="gavel"
      user={user}
      showHeader={false}
      showMobileNav={false}
    >
      <Outlet />
    </AppLayout>
  );
};

export default LawPortal;
