import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MediaWorkspace from './MediaWorkspace';

const MediaPortal = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState('dashboard');
  const selectedProjectId = searchParams.get('projectId') || '';
  const isVirtualProjectId = selectedProjectId.startsWith('virtual-');

  useEffect(() => {
    if (isVirtualProjectId) {
      try {
        localStorage.removeItem('activeProjectId');
      } catch {
        // ignore storage issues
      }
      setSearchParams({});
      return;
    }

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
      if (stored && stored !== 'all' && !stored.startsWith('virtual-')) {
        setSearchParams({ projectId: stored });
      } else if (stored && stored.startsWith('virtual-')) {
        localStorage.removeItem('activeProjectId');
      }
    } catch {
      // ignore storage issues
    }
  }, [isVirtualProjectId, selectedProjectId, setSearchParams]);

  const handleProjectChange = (projectId) => {
    const nextProjectId = String(projectId || '').startsWith('virtual-') ? '' : projectId;

    if (!nextProjectId) {
      try {
        localStorage.removeItem('activeProjectId');
      } catch {
        // ignore storage issues
      }
      setSearchParams({});
      return;
    }

    if (projectId) {
      try {
        localStorage.setItem('activeProjectId', nextProjectId);
      } catch {
        // ignore storage issues
      }
      setSearchParams({ projectId: nextProjectId });
      return;
    }
  };

  return (
    <MediaWorkspace
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      selectedProjectId={isVirtualProjectId ? '' : selectedProjectId}
      onProjectChange={handleProjectChange}
    />
  );
};

export default MediaPortal;
