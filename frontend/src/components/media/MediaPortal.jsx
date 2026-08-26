import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { departmentApi } from '../../services/departments';
import MobilePortalNav from '../common/MobilePortalNav';
import MediaSidebar from './MediaSidebar';
import MediaDashboard from './MediaDashboard';
import MediaWorkspace, { MEDIA_SECTIONS } from './MediaWorkspace';
import EmployeeProfilePage from '../shared/EmployeeProfilePage';

const MediaSettingsPage = lazy(() => import('../shared/PortalSettingsPage').then((m) => ({ default: () => <m.default portalLabel="Media Marketing" accentColor="#0f766e" /> })));
const MediaSupportPage = lazy(() => import('../shared/PortalSupportPage').then((m) => ({ default: () => <m.default portal="media" portalLabel="Media Marketing" accentColor="#0f766e" /> })));

const PROJECT_STORAGE_KEY = 'activeProjectId';
const SECTION_IDS = MEDIA_SECTIONS.map((section) => section.id);
const isValidSection = (value) => SECTION_IDS.includes(String(value || '').trim());
const readStoredProjectId = () => {
  try {
    const stored = String(localStorage.getItem(PROJECT_STORAGE_KEY) || '').trim();
    return stored && stored !== 'all' && !stored.startsWith('virtual-') ? stored : '';
  } catch {
    return '';
  }
};
const MEDIA_THEME = {
  '--portal-accent': '#0f766e',
  '--portal-accent-soft': '#ccfbf1',
  '--portal-accent-strong': '#134e4a',
};

// Section is now driven entirely by the URL path (/media/dashboard/:section)
// instead of a ?section= query param + localStorage restore. The URL is the
// single source of truth, so there's no read/write race to guard against.
const MediaPortal = () => {
  const { section: sectionParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { collapsed } = useSidebar();
  const { token } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState(readStoredProjectId);

  const activeSection = isValidSection(sectionParam) ? String(sectionParam).trim() : 'dashboard';

  // Independent of whichever section is active, so the sidebar badge stays
  // accurate even while the user is deep in Assets, Campaigns, etc.
  useEffect(() => {
    let alive = true;
    if (!token || activeSection === 'projects' || activeSection === 'profile' || activeSection === 'settings' || activeSection === 'support') {
      setPendingApprovals(0);
      return undefined;
    }
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
  }, [token, activeSection]);

  const sectionsWithBadges = useMemo(
    () => MEDIA_SECTIONS.map((section) => (section.id === 'approvals' ? { ...section, badge: pendingApprovals } : section)),
    [pendingApprovals]
  );

  useEffect(() => {
    if (!searchParams.has('projectId')) return;

    const rawProjectId = String(searchParams.get('projectId') || '').trim();
    const nextProjectId = rawProjectId && !rawProjectId.startsWith('virtual-') ? rawProjectId : '';
    setSelectedProjectId(nextProjectId);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('projectId');
    setSearchParams(nextParams, { replace: true });

    try {
      if (nextProjectId) localStorage.setItem(PROJECT_STORAGE_KEY, nextProjectId);
      else localStorage.removeItem(PROJECT_STORAGE_KEY);
    } catch {
      // ignore storage issues
    }
  }, [searchParams, setSearchParams]);

  const handleProjectChange = (projectId) => {
    const nextProjectId = String(projectId || '').trim();
    setSelectedProjectId(nextProjectId);

    try {
      if (nextProjectId) localStorage.setItem(PROJECT_STORAGE_KEY, nextProjectId);
      else localStorage.removeItem(PROJECT_STORAGE_KEY);
    } catch {
      // ignore storage issues
    }

    if (searchParams.has('projectId')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('projectId');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleSectionChange = (sectionId) => {
    const nextSection = isValidSection(sectionId) ? String(sectionId).trim() : 'dashboard';
    const pathname = nextSection === 'dashboard' ? '/media/dashboard' : `/media/dashboard/${nextSection}`;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('projectId');
    const search = nextParams.toString();

    if (nextSection === 'projects') {
      handleProjectChange('');
    }

    navigate({ pathname, search: search ? `?${search}` : '' });
  };

  const mobileItems = sectionsWithBadges.map((section) => ({
    key: section.id,
    label: section.label,
    icon: section.icon,
    active: activeSection === section.id,
    onClick: () => handleSectionChange(section.id),
  }));

  if (sectionParam && !isValidSection(sectionParam)) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('projectId');
    const search = nextParams.toString();
    return <Navigate replace to={{ pathname: '/media/dashboard', search: search ? `?${search}` : '' }} />;
  }

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
        <div className="mx-auto w-full max-w-380">
        {activeSection === 'dashboard' ? (
          <MediaDashboard
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            selectedProjectId={selectedProjectId}
            onProjectChange={handleProjectChange}
          />
        ) : activeSection === 'profile' ? (
          <EmployeeProfilePage portalLabel="Media Marketing" />
        ) : activeSection === 'settings' ? (
          <Suspense fallback={<div className="m-4 h-72 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />}>
            <MediaSettingsPage />
          </Suspense>
        ) : activeSection === 'support' ? (
          <Suspense fallback={<div className="m-4 h-72 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />}>
            <MediaSupportPage />
          </Suspense>
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
    </div>
  );
};

export default MediaPortal;
