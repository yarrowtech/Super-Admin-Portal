const cache = require('./cacheService');

const tagGroups = Object.freeze({
  auth: ['auth', 'profile', 'permissions'],
  users: ['users', 'auth', 'profile', 'dashboard', 'analytics', 'list'],
  employees: ['employees', 'users', 'dashboard', 'analytics', 'list'],
  departments: ['departments', 'dashboard', 'analytics', 'reference', 'list'],
  projects: ['projects', 'dashboard', 'analytics', 'media', 'list'],
  media: ['media', 'projects', 'dashboard', 'analytics', 'list'],
  sales: ['sales', 'dashboard', 'analytics', 'list'],
  hr: ['hr', 'employees', 'departments', 'dashboard', 'analytics', 'list'],
  ceo: ['ceo', 'dashboard', 'analytics'],
});

const invalidateTags = async (tags = []) => {
  const unique = Array.from(new Set(tags.flatMap((tag) => tagGroups[tag] || tag).filter(Boolean)));
  const results = await Promise.all(unique.map((tag) => cache.invalidateTag(tag)));
  return results.reduce((sum, count) => sum + count, 0);
};

const invalidateForMutation = async (resource, extraTags = []) => invalidateTags([resource, ...extraTags]);

module.exports = {
  invalidateForMutation,
  invalidateTags,
  tagGroups,
};
