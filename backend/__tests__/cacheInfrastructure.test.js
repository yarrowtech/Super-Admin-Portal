const test = require('node:test');
const assert = require('node:assert/strict');

process.env.CACHE_ENABLED = 'true';
process.env.REDIS_URL = '';

const cache = require('../infrastructure/cache/cacheService');
const keys = require('../infrastructure/cache/cacheKeyBuilder');
const { cacheGetResponses } = require('../middlewares/cacheInvalidation.middleware');

test('cache key builder is deterministic and scope-aware', () => {
  const scopeA = { tenantId: 'tenant-a', userId: 'u1', role: 'hr', departmentId: 'HR' };
  const scopeB = { tenantId: 'tenant-b', userId: 'u1', role: 'hr', departmentId: 'HR' };
  const paramsA = { page: 1, filters: { status: 'active', role: 'media' } };
  const paramsB = { filters: { role: 'media', status: 'active' }, page: 1 };

  const keyA = keys.forResource({ scope: scopeA, resource: 'employees:list', params: paramsA, userScoped: true });
  const keyAReordered = keys.forResource({ scope: scopeA, resource: 'employees:list', params: paramsB, userScoped: true });
  const keyB = keys.forResource({ scope: scopeB, resource: 'employees:list', params: paramsA, userScoped: true });

  assert.equal(keyA, keyAReordered);
  assert.notEqual(keyA, keyB);
  assert.match(keyA, /^v1:tenant:tenant-a:role:hr:department:hr:/);
});

test('memory fallback supports get/set/delete and tag invalidation', async () => {
  const key = keys.forResource({ scope: { tenantId: 'global', role: 'admin' }, resource: 'dashboard' });

  await cache.set(key, { ok: true }, { ttl: 30, tags: ['dashboard:test'] });
  assert.deepEqual(await cache.get(key), { ok: true });

  await cache.invalidateTag('dashboard:test');
  assert.equal(await cache.get(key), null);
});

test('getOrSet single-flight prevents duplicate producer execution in-process', async () => {
  const key = keys.forResource({ scope: { tenantId: 'global', role: 'admin' }, resource: 'single-flight' });
  await cache.delete(key);
  let calls = 0;
  const producer = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 25));
    return { value: calls };
  };

  const results = await Promise.all([
    cache.getOrSet(key, producer, { ttl: 30, tags: ['single-flight:test'] }),
    cache.getOrSet(key, producer, { ttl: 30, tags: ['single-flight:test'] }),
    cache.getOrSet(key, producer, { ttl: 30, tags: ['single-flight:test'] }),
  ]);

  assert.equal(calls, 1);
  assert.deepEqual(results, [{ value: 1 }, { value: 1 }, { value: 1 }]);
  await cache.invalidateTag('single-flight:test');
});

test('response cache middleware caches only authenticated successful JSON responses', async () => {
  const req = {
    method: 'GET',
    user: { id: 'u1', role: 'admin', department: 'ops' },
    query: { page: 1 },
    params: {},
    path: '/dashboard',
    baseUrl: '/api/dept/admin',
    originalUrl: '/api/dept/admin/dashboard?page=1',
  };
  let statusCode = 200;
  let body;
  const makeRes = () => ({
    statusCode,
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { statusCode = code; this.statusCode = code; return this; },
    json(value) { body = value; return value; },
  });

  const middleware = cacheGetResponses('admin-test', { tags: ['admin-test'] });
  const res1 = makeRes();
  await middleware(req, res1, () => {});
  res1.json({ success: true, data: { value: 1 } });

  await new Promise((resolve) => setTimeout(resolve, 10));

  body = null;
  const res2 = makeRes();
  await middleware(req, res2, () => {
    throw new Error('cache hit should not call next');
  });
  assert.deepEqual(body, { success: true, data: { value: 1 } });
  assert.equal(res2.headers['X-Cache'], 'HIT');
  await cache.invalidateTag('admin-test');
});
