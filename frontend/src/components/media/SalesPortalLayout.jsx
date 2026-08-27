import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext';
import MobilePortalNav from '../common/MobilePortalNav';
import SectionSidebar from '../common/SectionSidebar';

export const MEDIA_THEME = {
  '--portal-accent': '#0f766e',
  '--portal-accent-soft': '#ccfbf1',
  '--portal-accent-strong': '#134e4a',
};

export const SALES_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', description: 'Sales command view' },
  { id: 'project-overview', label: 'Project Overview', icon: 'folder_copy', description: 'Read-only project visibility' },
  { id: 'query', label: 'Query', icon: 'quiz', description: 'Field buyer questionnaire' },
  { id: 'submission', label: 'Submission', icon: 'fact_check', description: 'Your submitted queries' },
  { id: 'profile', label: 'Profile', icon: 'person', description: 'Your profile' },
];

const SalesPortalLayout = ({ activeId, children, bare = false }) => {
  const { collapsed } = useSidebar();
  const navigate = useNavigate();

  const handleSelect = (id) => navigate(`/media/sales/${id}`);

  const mobileItems = SALES_NAV.map((item) => ({
    key: item.id,
    label: item.label,
    icon: item.icon,
    active: item.id === activeId,
    onClick: () => handleSelect(item.id),
  }));

  return (
    <div
      className="portal-shell relative min-h-screen w-full overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f4_45%,#f6f8fb_100%)] text-neutral-900 dark:bg-none dark:bg-background-dark dark:text-neutral-100"
      style={MEDIA_THEME}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(212,138,22,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.05),transparent_26%)]" />
      <MobilePortalNav
        title="Media Portal"
        icon="point_of_sale"
        items={mobileItems}
      />
      <SectionSidebar
        title="Media Portal"
        icon="point_of_sale"
        items={SALES_NAV}
        activeId={activeId}
        onSelect={handleSelect}
      />

      <main
        className={`relative min-h-screen transition-[margin] duration-300 ease-out-expo ${
          collapsed ? 'md:ml-16' : 'md:ml-[250px]'
        } pt-16 md:pt-0`}
      >
        {bare ? children : (
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-5 lg:px-6">
            {children}
          </div>
        )}
      </main>
    </div>
  );
};

export default SalesPortalLayout;
