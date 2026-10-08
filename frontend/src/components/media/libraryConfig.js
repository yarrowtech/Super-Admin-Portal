export const LIBRARY_CATEGORIES = [
  ['brand', 'Brand Foundation', 'palette'], ['creative', 'Creative Assets', 'perm_media'],
  ['marketing', 'Marketing Content', 'campaign'], ['social', 'Social Media', 'share'],
  ['content', 'Content Library', 'article'], ['campaigns', 'Campaigns', 'ads_click'],
  ['documents', 'Documents', 'description'], ['archive', 'Archive', 'archive'],
];
export const LIBRARY_WORKSPACES = [['recent', 'Recent'], ['favorites', 'Favorites'], ['mine', 'My Uploads'], ['shared', 'Shared With Me'], ['approvals', 'Approvals'], ['versions', 'Version History'], ['trash', 'Trash']];

// One navigation definition for desktop and mobile. Production pages remain
// addressable for compatibility, but each library concept has one menu entry.
export const buildMediaNavigation = (sections = []) => {
  const globalIds = new Set(['dashboard', 'projects', 'tasks', 'attendance', 'team', 'messages', 'profile']);
  const workspace = Object.fromEntries(LIBRARY_WORKSPACES.map(([key, label]) => [key, label]));
  const leaf = (key, icon = 'folder') => ({ id: `workspace:${key}`, label: workspace[key], icon });
  return [
    ...sections.filter(section => globalIds.has(section.id)),
    { id: 'digital-library', label: 'Digital Library', icon: 'local_library', children: [{ id: 'library:overview', label: 'Overview', icon: 'dashboard' }] },
    { id: 'project-library', label: 'Project Library', icon: 'folder_copy', children: [{ id: 'library:projects', label: 'All Projects', icon: 'apps' }, ...LIBRARY_CATEGORIES.map(([key, label, icon]) => ({ id: `library:${key}`, label, icon }))] },
    { id: 'library-workspace', label: 'Workspace', icon: 'workspaces', children: ['recent', 'favorites', 'mine', 'shared'].map(key => leaf(key)) },
    { id: 'library-management', label: 'Management', icon: 'fact_check', children: [leaf('approvals', 'fact_check'), leaf('versions', 'history')] },
    { id: 'library-system', label: 'System', icon: 'settings', children: [{ id: 'settings', label: 'Settings', icon: 'settings' }, leaf('trash', 'delete'), { id: 'support', label: 'Support', icon: 'support_agent' }] },
  ];
};
export const mediaNavigationActiveId = (section, params) => section !== 'assets' ? section : params.get('workspace') ? `workspace:${params.get('workspace')}` : `library:${params.get('category') || (params.get('view') === 'projects' ? 'projects' : 'overview')}`;
export const mediaLibraryDestination = (id, params, fallbackProject = '') => {
  const next = new URLSearchParams();
  const project = params.get('project') || fallbackProject;
  if (project && id !== 'library:projects') next.set('project', project);
  const [type, key] = id.split(':');
  if (type === 'workspace') next.set('workspace', key);
  else if (key === 'projects') next.set('view', 'projects');
  else if (key !== 'overview') next.set('category', key);
  return `/media/dashboard/assets${next.size ? `?${next}` : ''}`;
};
export const LEGACY_LIBRARY_SECTIONS = { brand: ['brand'], content: ['content'], design: ['creative', 'Design Files'], video: ['creative', 'Videos'], social: ['social'] };
