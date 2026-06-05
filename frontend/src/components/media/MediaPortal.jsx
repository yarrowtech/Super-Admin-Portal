import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '../../layouts/AppLayout';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MediaSidebar from './MediaSidebar';
import MediaDashboard, { MEDIA_SECTIONS } from './MediaDashboard';

const MediaPortal = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState('dashboard');
  const selectedProjectId = searchParams.get('projectId') || '';

  useEffect(() => {
    if (selectedProjectId) {
      try {
        localStorage.setItem('activeProjectId', selectedProjectId);
      } catch {
        // ignore storage issues
      }
      return;
    }

    try {
      const stored = localStorage.getItem('activeProjectId');
      if (stored && stored !== 'all') {
        setSearchParams({ projectId: stored });
      }
    } catch {
      // ignore storage issues
    }
  }, [selectedProjectId, setSearchParams]);

  const handleProjectChange = (projectId) => {
    if (projectId) {
      try {
        localStorage.setItem('activeProjectId', projectId);
      } catch {
        // ignore storage issues
      }
      setSearchParams({ projectId });
      return;
    }

    try {
      localStorage.removeItem('activeProjectId');
    } catch {
      // ignore storage issues
    }
    setSearchParams({});
  };

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
        <MediaDashboard
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          selectedProjectId={selectedProjectId}
          onProjectChange={handleProjectChange}
        />
      </div>
    </AppLayout>
  );
};

export default MediaPortal;
