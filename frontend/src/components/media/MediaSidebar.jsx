import React, { useMemo } from 'react';
import SectionSidebar from '../common/SectionSidebar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildMediaNavigation, mediaNavigationActiveId, mediaLibraryDestination } from './libraryConfig';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

const MediaSidebar = ({ activeSection, onSelect, sections = [], selectedProjectId = '' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const items = useMemo(() => buildMediaNavigation(sections), [sections]);
  if (!canAccessPortal(user, PORTALS.MEDIA)) return null;
  const select = id => id.startsWith('library:') || id.startsWith('workspace:')
    ? navigate(mediaLibraryDestination(id, params, selectedProjectId)) : onSelect(id);
  return <SectionSidebar title="Media Portal" icon="campaign" items={items}
    activeId={mediaNavigationActiveId(activeSection, params)} onSelect={select} highlightOpenGroups={false} />;
};
export default MediaSidebar;
