const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../..');
const resolver = () => import(pathToFileURL(path.join(root, 'frontend/src/config/backendUrl.mjs')).href);

test('backend root configuration preserves proxy prefixes and strips all trailing slashes', async () => {
  const { resolveBackendUrl } = await resolver();
  assert.equal(resolveBackendUrl(' https://api.example.test/gateway/// '), 'https://api.example.test/gateway');
  assert.equal(resolveBackendUrl('http://127.0.0.1:5000/'), 'http://127.0.0.1:5000');
  assert.equal(resolveBackendUrl(''), 'http://localhost:5000');
  assert.equal(resolveBackendUrl('https://api.example.test/api/v1'), 'https://api.example.test/api/v1');
});

test('missing production and unsafe backend URL configuration fail without exposing values', async () => {
  const { resolveBackendUrl } = await resolver();
  for (const value of ['', '   ']) assert.throws(() => resolveBackendUrl(value, { production: true }), /VITE_API_URL is required/);
  for (const value of ['//api.test', '/api', 'javascript:alert(1)', 'https://user:private@api.test', 'https://api.test?token=private', 'https://api.test/#private']) {
    assert.throws(() => resolveBackendUrl(value), (error) => /VITE_API_URL/.test(error.message) && !error.message.includes('private'));
  }
});

const clientHarness = async (responses = []) => {
  const { resolveBackendUrl } = await resolver();
  const calls = [];
  let session = { token: 'old', refreshToken: 'refresh', authMode: 'local' };
  const source = fs.readFileSync(path.join(root, 'frontend/src/services/client.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export const apiClient =', 'globalThis.apiClient =');
  const context = { API_BASE_URL: resolveBackendUrl('https://api.test///'), Map, JSON, Error, setTimeout,
    createRequestId: () => 'request-id', clearAuthSession: () => { session = {}; },
    readAuthSession: () => session, writeAuthSession: (value) => { session = value; }, subscribeAuthSession: () => {},
    localStorage: { getItem: () => 'project-one' }, sessionStorage: { length: 0 },
    fetch: async (url, options) => {
      calls.push({ url, options });
      const next = responses.shift() || { ok: true, body: { success: true } };
      return { ok: next.ok, status: next.status || 200, statusText: 'test', headers: { get: () => null }, json: async () => next.body };
    },
  };
  vm.runInNewContext(source, context);
  return { client: context.apiClient, calls };
};

test('shared client builds JSON and upload URLs without changing API versions, credentials or project scope', async () => {
  const { client, calls } = await clientHarness();
  await client.get('/api/dept/hr/dashboard', 'token');
  await client.post('/api/v1/projects/YARROWTECH/services', { name: 'service' }, 'token');
  await client.put('/api/dept/manager/tasks/one', {}, 'token');
  await client.patch('/api/v1/services/one', {}, 'token');
  await client.delete('/api/v1/services/one', 'token');
  await client.upload('/api/dept/media/upload', 'form-data', 'token');
  assert.deepEqual(calls.map((call) => call.options.method), ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'POST']);
  assert.equal(calls[0].url, 'https://api.test/api/dept/hr/dashboard');
  assert.equal(calls[1].url, 'https://api.test/api/v1/projects/YARROWTECH/services');
  for (const call of calls) {
    assert.equal(call.options.credentials, 'include');
    assert.equal(call.options.headers.Authorization, 'Bearer token');
    assert.equal(call.options.headers['x-project-id'], 'project-one');
  }
  assert.equal(calls[5].options.headers['Content-Type'], undefined);
});

test('expired-token retries keep the existing auth refresh endpoint and use the renewed token', async () => {
  const { client, calls } = await clientHarness([
    { ok: false, status: 401, body: { code: 'TOKEN_EXPIRED' } },
    { ok: true, body: { data: { token: 'renewed' } } },
    { ok: true, body: { success: true } },
  ]);
  await client.get('/api/dept/finance/dashboard', 'old');
  assert.equal(calls[1].url, 'https://api.test/api/auth/refresh-token');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[2].options.headers.Authorization, 'Bearer renewed');
});

test('cross-origin responses expose renewal and request-id headers without opening origins', async () => {
  const express = require('express');
  const cors = require('cors');
  const config = require('../config/cors');
  const app = express();
  app.use(cors(config));
  app.get('/probe', (req, res) => res.set('X-New-Token', 'test-token').set('x-request-id', 'test-request').json({ success: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const origin = config.allowedOrigins[0];
    const response = await fetch(`http://127.0.0.1:${server.address().port}/probe`, { headers: { Origin: origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    const exposed = response.headers.get('access-control-expose-headers').toLowerCase();
    assert.ok(exposed.includes('x-new-token'));
    assert.ok(exposed.includes('x-request-id'));
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    config.origin('https://untrusted.invalid', (error) => assert.match(error.message, /CORS blocked/));
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('invalid startup config exits before importing the app or starting DB/bootstrap work', () => {
  const loaded = [];
  const stopped = new Error('stopped');
  const source = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');
  assert.throws(() => vm.runInNewContext(source, {
    require: (name) => {
      loaded.push(name);
      if (name === './config/env') return { PORT: 5000 };
      if (name === './config/startupValidation') return { validateStartupConfig: () => { throw new Error('missing config'); } };
      return { fatal() {} };
    },
    process: { exit: (code) => { assert.equal(code, 1); throw stopped; } },
  }), (error) => error === stopped);
  assert.equal(loaded.includes('./app'), false);
});


test('outsourcing multipart override trims all trailing slashes and retains its distinct host', async () => {
  const calls = [];
  const source = fs.readFileSync(path.join(root, 'frontend/src/services/outsourcing.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replaceAll("import.meta.env.VITE_OUTSOURCING_PORTAL_URL", "' https://outsourcing.test/// '")
    .replace('export const outsourcingApi =', 'globalThis.outsourcingApi =');
  const context = { API_BASE_URL: 'https://central.test', apiClient: { clearCache() {} }, URLSearchParams, Date, String,
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ success: true }) }; },
  };
  vm.runInNewContext(source, context);
  await context.outsourcingApi.createEdifyEightStudyMaterial('token', 'form-data');
  assert.equal(calls[0].url, 'https://outsourcing.test/api/outsourcing/edifyeight/study-materials');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token');
});
