import React from 'react';
import { Outlet } from 'react-router-dom';
import FinanceSidebar from './FinanceSidebar';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';

const FinancePortal = () => {
  const { user } = useAuth();
  const isFinanceHead = ['finance_manager', 'admin', 'super_admin'].includes(String(user?.role || '').toLowerCase());

  return (
    <AppLayout
      sidebar={<FinanceSidebar />}
      title="Finance Portal"
      subtitle={isFinanceHead ? 'Financial control layer' : 'Finance operations queue'}
      mobileIcon="account_balance"
      user={user}
      showHeader={false}
      showMobileNav={false}
    >
      <Outlet />
    </AppLayout>
  );
};

export default FinancePortal;
