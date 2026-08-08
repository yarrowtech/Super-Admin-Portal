import React from 'react';
import SectionSidebar from '../common/SectionSidebar';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

const FinanceSidebar = ({ activeSection, onSelect, sections = [] }) => {
  const { user } = useAuth();
  if (!canAccessPortal(user, PORTALS.FINANCE)) return null;

  return (
    <SectionSidebar
      title="Finance Admin"
      subtitle="Finance Department"
      icon="account_balance"
      items={sections}
      activeId={activeSection}
      onSelect={onSelect}
    />
  );
};

export default FinanceSidebar;
