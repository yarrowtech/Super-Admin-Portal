const crypto = require('crypto');
const { CACHE_VERSION } = require('./cachePolicy');

const normalizeValue = (value) => {
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        const normalized = normalizeValue(value[key]);
        if (normalized !== undefined && normalized !== '') acc[key] = normalized;
        return acc;
      }, {});
  }
  if (value === null || value === undefined) return undefined;
  return String(value);
};

const hashObject = (value) => crypto
  .createHash('sha256')
  .update(JSON.stringify(normalizeValue(value) || {}))
  .digest('hex')
  .slice(0, 24);

const cleanSegment = (value, fallback = 'none') => String(value || fallback)
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_.-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80) || fallback;

const userScope = (user = {}) => ({
  tenantId: user.tenantId || user.organizationId || user.orgId || user.metadata?.tenantId || user.metadata?.organizationId || 'global',
  userId: user.id || user._id || 'anonymous',
  role: user.role || 'anonymous',
  departmentId: user.departmentId || user.department || 'none',
});

const scopedPrefix = (scope = {}) => [
  CACHE_VERSION,
  'tenant',
  cleanSegment(scope.tenantId || 'global'),
  'role',
  cleanSegment(scope.role || 'unknown'),
  'department',
  cleanSegment(scope.departmentId || 'none'),
].join(':');

const forResource = ({ scope, resource, id, params, userScoped = false }) => {
  const segments = [scopedPrefix(scope), cleanSegment(resource || 'resource')];
  if (userScoped) segments.push('user', cleanSegment(scope?.userId || 'anonymous'));
  if (id) segments.push(cleanSegment(id));
  if (params && Object.keys(params).length) segments.push('q', hashObject(params));
  return segments.join(':');
};

const forRequest = (req, resource, params = {}, options = {}) => forResource({
  scope: userScope(req.user || {}),
  resource,
  params: {
    query: req.query || {},
    params,
  },
  userScoped: options.userScoped !== false,
});

const tagKey = (tag) => `${CACHE_VERSION}:tag:${cleanSegment(tag)}`;
const lockKey = (key) => `${CACHE_VERSION}:lock:${crypto.createHash('sha1').update(String(key)).digest('hex')}`;
const safeKeyHash = (key) => crypto.createHash('sha1').update(String(key)).digest('hex').slice(0, 16);

module.exports = {
  cleanSegment,
  forRequest,
  forResource,
  hashObject,
  lockKey,
  safeKeyHash,
  scopedPrefix,
  tagKey,
  userScope,
};
