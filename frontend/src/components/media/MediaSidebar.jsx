import React, { useMemo } from 'react';
import SectionSidebar from '../common/SectionSidebar';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

// Groups the flat MEDIA_SECTIONS list (defined in MediaWorkspace.jsx) into collapsible
// sections, mirroring the Admin portal's sidebar pattern. Dashboard/Projects stay
// standalone since they're always-visible landing sections, not workspace tools.
const GROUPS = [
  { id: 'creative', label: 'Assets', icon: 'perm_media', sectionIds: ['assets', 'brand', 'content', 'design', 'video', 'social'] },
];
const STANDALONE_IDS = new Set(['dashboard', 'projects', 'profile']);
const FOOTER_IDS = new Set(['settings', 'support']);

const buildGroupedItems = (sections = []) => {
  const byId = new Map(sections.map((section) => [section.id, section]));
  const grouped = new Set(GROUPS.flatMap((group) => group.sectionIds));

  const standalone = sections.filter((section) => STANDALONE_IDS.has(section.id));
  const groupItems = GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    icon: group.icon,
    children: group.sectionIds.map((id) => byId.get(id)).filter(Boolean),
  })).filter((group) => group.children.length);

  // Anything not explicitly grouped (e.g. a future section) still shows up, ungrouped.
  const ungrouped = sections.filter((section) => !STANDALONE_IDS.has(section.id) && !grouped.has(section.id) && !FOOTER_IDS.has(section.id));

  return [...standalone, ...groupItems, ...ungrouped];
};

const MediaSidebar = ({ activeSection, onSelect, sections = [] }) => {
  const { user } = useAuth();
  const groupedItems = useMemo(() => buildGroupedItems(sections), [sections]);
  const footerItems = useMemo(() => sections.filter((section) => FOOTER_IDS.has(section.id)), [sections]);

  if (!canAccessPortal(user, PORTALS.MEDIA)) return null;

  return (
    <SectionSidebar
      title="Media Portal"
      subtitle="Creative operations command center"
      icon="campaign"
      items={groupedItems}
      activeId={activeSection}
      onSelect={onSelect}
      footerItems={footerItems}
    />
  );
};

export default MediaSidebar;
