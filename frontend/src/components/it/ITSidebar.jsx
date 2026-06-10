import React from 'react';
import SectionSidebar from '../common/SectionSidebar';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

const ITSidebar = ({ activeSection, onSelect, sections = [] }) => {
  const { user } = useAuth();
  if (!canAccessPortal(user, PORTALS.IT)) return null;

  return (
    <SectionSidebar
      title="IT Portal"
      subtitle="Executive technology control center"
      icon="memory"
      items={sections}
      activeId={activeSection}
      onSelect={onSelect}
    />
  );
};

export default ITSidebar;
