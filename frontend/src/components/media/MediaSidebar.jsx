import React from 'react';
import SectionSidebar from '../common/SectionSidebar';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

const MediaSidebar = ({ activeSection, onSelect, sections = [] }) => {
  const { user } = useAuth();

  if (!canAccessPortal(user, PORTALS.MEDIA)) return null;

  return (
    <SectionSidebar
      title="Media Portal"
      subtitle="Creative operations command center"
      icon="campaign"
      items={sections}
      activeId={activeSection}
      onSelect={onSelect}
    />
  );
};

export default MediaSidebar;
