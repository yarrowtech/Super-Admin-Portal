import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { departmentApi } from '../../services/departments';
import MobilePortalNav from '../common/MobilePortalNav';
import MediaSidebar from './MediaSidebar';
import MediaDashboard from './MediaDashboard';
import MediaWorkspace, { MEDIA_SECTIONS } from './MediaWorkspace';

const SECTION_STORAGE_KEY = 'media_active_section';
const PROJECT_STORAGE_KEY = 'activeProjectId';
const SECTION_IDS = MEDIA_SECTIONS.map((section) => section.id);
const isValidSection = (value) => SECTION_IDS.includes(String(value || '').trim());
const MEDIA_THEME = {
  '--portal-accent': '#0f766e',
  '--portal-accent-soft': '#ccfbf1',
  '--portal-accent-strong': '#134e4a',
};

const MediaPortal = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { collapsed } = useSidebar();
  const { token } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const resolveSection = (value) => (isValidSection(value) ? String(value).trim() : 'dashboard');

  // Independent of whichever section is active, so the sidebar badge stays
  // accurate even while the user is deep in Assets, Campaigns, etc.
  useEffect(() => {
    let alive = true;
    if (!token) return undefined;
    departmentApi
      .getMediaDashboard(token, {})
      .then((res) => {
        if (!alive) return;
        setPendingApprovals(Number(res?.data?.kpis?.pendingApprovals) || 0);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [token]);

  const sectionsWithBadges = useMemo(
    () => MEDIA_SECTIONS.map((section) => (section.id === 'approvals' ? { ...section, badge: pendingApprovals } : section)),
    [pendingApprovals]
  );

  const [activeSection, setActiveSection] = useState(() => {
    const fromQuery = resolveSection(searchParams.get('section'));
    if (fromQuery !== 'dashboard' || searchParams.get('section')) return fromQuery;

    try {
      const stored = resolveSection(localStorage.getItem(SECTION_STORAGE_KEY));
      if (stored !== 'dashboard' || localStorage.getItem(SECTION_STORAGE_KEY)) return stored;
    } catch {
      // ignore storage issues
    }

    return 'dashboard';
  });

  const rawProjectId = searchParams.get('projectId') || '';
  const hasProjectQuery = searchParams.has('projectId');
  const isVirtualProjectId = rawProjectId.startsWith('virtual-');
  const selectedProjectId = hasProjectQuery ? (isVirtualProjectId ? '' : rawProjectId) : undefined;
  const mobileItems = sectionsWithBadges.map((section) => ({
    key: section.id,
    label: section.label,
    icon: section.icon,
    active: activeSection === section.id,
    onClick: () => setActiveSection(section.id),
  }));

  // Reflects the LATEST activeSection without making the effect below re-run whenever
  // activeSection changes locally — it should only react to real URL navigation
  // (back/forward, deep link), never to its own sibling effect's URL write below.
  // Depending on activeSection directly caused a race: switching to "dashboard" (which
  // deletes the ?section param) would get immediately reverted because this effect ran
  // in the same commit against the *old* searchParams, before the URL write took effect.
  const activeSectionRef = useRef(activeSection);
  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    const querySection = resolveSection(searchParams.get('section'));
    if (searchParams.has('section') && querySection !== activeSectionRef.current) {
      setActiveSection(querySection);
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      if (activeSection === 'dashboard') localStorage.removeItem(SECTION_STORAGE_KEY);
      else localStorage.setItem(SECTION_STORAGE_KEY, activeSection);
    } catch {
      // ignore storage issues
    }

    const nextParams = new URLSearchParams(searchParams);
    if (activeSection === 'dashboard') nextParams.delete('section');
    else nextParams.set('section', activeSection);

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeSection, searchParams, setSearchParams]);

  useEffect(() => {
    if (!hasProjectQuery || !isVirtualProjectId) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('projectId');
    setSearchParams(nextParams, { replace: true });

    try {
      localStorage.removeItem(PROJECT_STORAGE_KEY);
    } catch {
      // ignore storage issues
    }
  }, [hasProjectQuery, isVirtualProjectId, searchParams, setSearchParams]);

  const handleProjectChange = (projectId) => {
    const nextProjectId = String(projectId || '').trim();
    const nextParams = new URLSearchParams(searchParams);

    if (nextProjectId) {
      nextParams.set('projectId', nextProjectId);
      try {
        localStorage.setItem(PROJECT_STORAGE_KEY, nextProjectId);
      } catch {
        // ignore storage issues
      }
    } else {
      nextParams.delete('projectId');
      try {
        localStorage.removeItem(PROJECT_STORAGE_KEY);
      } catch {
        // ignore storage issues
      }
    }

    setSearchParams(nextParams, { replace: true });
  };

  const handleSectionChange = (sectionId) => {
    const nextSection = resolveSection(sectionId);
    setActiveSection(nextSection);

    if (nextSection === 'project-hub') {
      handleProjectChange('');
    }
  };

  return (
    <div
      className="portal-shell relative min-h-screen w-full overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f4_45%,#f6f8fb_100%)] text-neutral-900 dark:bg-background-dark dark:text-neutral-100"
      style={MEDIA_THEME}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(212,138,22,0.1),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.05),transparent_26%)]" />
      <MobilePortalNav
        title="Media Portal"
        subtitle="Creative operations command center"
        icon="campaign"
        items={mobileItems}
      />
      <MediaSidebar activeSection={activeSection} onSelect={handleSectionChange} sections={sectionsWithBadges} />
      <div
        className={`min-h-screen transition-[margin] duration-300 ease-out-expo ${
          collapsed ? 'md:ml-16' : 'md:ml-[250px]'
        } pt-16 md:pt-0`}
      >
        {activeSection === 'dashboard' ? (
          <MediaDashboard
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            selectedProjectId={selectedProjectId}
            onProjectChange={handleProjectChange}
          />
        ) : (
          <MediaWorkspace
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            selectedProjectId={selectedProjectId}
            onProjectChange={handleProjectChange}
          />
        )}
      </div>
    </div>
  );
};

export default MediaPortal;
