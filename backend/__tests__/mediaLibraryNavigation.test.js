const test = require('node:test');
const assert = require('node:assert/strict');

test('Media navigation has one library tree, preserved global tools and unique destinations', async () => {
  const { buildMediaNavigation, mediaLibraryDestination, mediaNavigationActiveId } = await import('../../frontend/src/components/media/libraryConfig.js');
  const sections = ['dashboard', 'projects', 'assets', 'brand', 'content', 'design', 'video', 'social', 'team', 'messages', 'profile', 'settings', 'support'].map(id => ({ id, label: id }));
  const tree = buildMediaNavigation(sections);
  const groups = tree.filter(item => item.children);
  assert.deepEqual(groups.map(group => group.label), ['Digital Library', 'Project Library', 'Workspace', 'Management', 'System']);
  const leaves = tree.flatMap(item => item.children || [item]);
  assert.equal(new Set(leaves.map(item => item.id)).size, leaves.length);
  assert.ok(['team', 'messages', 'profile', 'settings', 'support'].every(id => leaves.some(item => item.id === id)));
  assert.ok(['assets', 'brand', 'content', 'design', 'video', 'social'].every(id => !leaves.some(item => item.id === id)));
  assert.deepEqual(groups.find(group => group.id === 'library-system').children.map(item => item.id), ['settings', 'workspace:trash', 'support']);
  const project = '111111111111111111111111';
  const params = new URLSearchParams({ project, category: 'brand' });
  const destination = new URL(mediaLibraryDestination('library:social', params), 'http://fixture.invalid');
  assert.equal(destination.searchParams.get('project'), project);
  assert.equal(destination.searchParams.get('category'), 'social');
  assert.equal(mediaNavigationActiveId('assets', destination.searchParams), 'library:social');
  assert.equal(leaves.filter(item => item.id === mediaNavigationActiveId('assets', destination.searchParams)).length, 1);
  const all = new URL(mediaLibraryDestination('library:projects', params), 'http://fixture.invalid');
  assert.equal(all.searchParams.has('project'), false);
  assert.equal(mediaNavigationActiveId('assets', all.searchParams), 'library:projects');
  assert.equal(mediaNavigationActiveId('assets', new URLSearchParams()), 'library:overview');
});
