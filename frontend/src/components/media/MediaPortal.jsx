import React, { useMemo, useState } from 'react';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';
import MediaSidebar from './MediaSidebar';
import MediaDashboard, { MEDIA_SECTIONS } from './MediaDashboard';

const MediaPortal = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');

  const mobileItems = useMemo(
    () =>
      MEDIA_SECTIONS.map((item) => ({
        key: item.id,
        label: item.label,
        icon: item.icon,
        active: activeSection === item.id,
        onClick: () => setActiveSection(item.id),
      })),
    [activeSection]
  );

  return (
    <AppLayout
      sidebar={<MediaSidebar activeSection={activeSection} onSelect={setActiveSection} sections={MEDIA_SECTIONS} />}
      title="Media Analytics"
      subtitle="Executive media platform overview"
      mobileIcon="campaign"
      mobileItems={mobileItems}
      user={user}
    >
      <div className="portal-content p-0">
        <MediaDashboard activeSection={activeSection} onSectionChange={setActiveSection} />
      </div>
    </AppLayout>
  );
};

export default MediaPortal;
