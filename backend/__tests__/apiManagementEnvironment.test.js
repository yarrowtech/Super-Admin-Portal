process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const environment = require('../services/apiManagement.environment');

test('environment writes preserve unrelated bytes, reject injection and conflicts, and never return secrets', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-env-store-'));
  const file = path.join(dir, '.env');
  const original = "# Keep original comments\r\nJWT_SECRET='unchanged # fixture'\r\nEDIFYEIGHT_API_TOKEN='old-token'\r\nCUSTOM_SETTING=untouched\r\n";
  fs.writeFileSync(file, original); const runtime = {};
  const store = environment.createStore(file, runtime);
  try {
    environment.setStoreForTests(store);
    const before = store.revision();
    const inventory = environment.inventory([{ _id: 'project', name: 'EdifyEight', projectCode: 'EEC' }], []);
    assert.equal(inventory.find(i => i.id === 'edifyeight-teachers').projectId, 'project');
    assert.ok(!JSON.stringify(inventory).includes('old-token'));
    const logged = require('../logger/sanitize').sanitizeForLog({ settings: { EDIFYEIGHT_API_TOKEN: 'never-log-this', SRS_SIGNING_SECRET: 'never-log-signing', PROJECT_API_ABC_TOKEN: 'never-log-generated', EDIFYEIGHT_TEACHER_API_URL: 'https://teachers.example' } });
    assert.ok(!JSON.stringify(logged).includes('never-log'));
    assert.equal(logged.settings.EDIFYEIGHT_TEACHER_API_URL, 'https://teachers.example');
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    environment.updateExisting('edifyeight-teachers', { EDIFYEIGHT_API_TOKEN: 'new-token-#-value' }, before);
    const after = fs.readFileSync(file, 'utf8');
    assert.ok(after.startsWith("# Keep original comments\r\nJWT_SECRET='unchanged # fixture'\r\n"));
    assert.ok(after.endsWith('CUSTOM_SETTING=untouched\r\n'));
    assert.equal(store.values().EDIFYEIGHT_API_TOKEN, 'new-token-#-value');
    assert.equal(runtime.EDIFYEIGHT_API_TOKEN, 'new-token-#-value');
    assert.throws(() => environment.updateExisting('edifyeight-teachers', { EDIFYEIGHT_API_TOKEN: 'stale-token' }, before), { status: 409 });
    assert.throws(() => environment.updateExisting('edifyeight-teachers', { JWT_SECRET: 'forbidden' }, store.revision()), { status: 403 });
    assert.throws(() => environment.updateExisting('edifyeight-teachers', { EDIFYEIGHT_API_TOKEN: 'token\nJWT_SECRET=injected' }, store.revision()), { status: 400 });
    assert.equal(fs.readFileSync(file, 'utf8'), after);
    const api = { _id: '0123456789abcdef01234567', environmentManaged: true };
    environment.writeApi(api, { url: 'https://provider.example', token: 'fixture-managed-token' });
    environment.clearApi({ ...api, environmentIntegrationId: 'edifyeight-teachers' });
    assert.equal(runtime[environment.keysForApi(api).token], 'fixture-managed-token');
    environment.clearApi(api);
    assert.equal(runtime[environment.keysForApi(api).token], undefined);
    assert.equal(fs.readFileSync(file, 'utf8'), after);
    fs.writeFileSync(file + '.api-management.lock', '');
    assert.throws(() => store.update({ EDIFYEIGHT_API_TOKEN: 'locked-out' }), { status: 409 });
    fs.unlinkSync(file + '.api-management.lock');
    assert.equal(fs.readdirSync(dir).length, 1);
  } finally { fs.unlinkSync(file); fs.rmdirSync(dir); }
});

test('existing integration readers observe frontend environment changes without reloading modules', () => {
  const keys = ['EDIFYEIGHT_API_TOKEN', 'EDIFYEIGHT_TEACHER_API_URL', 'MARKETING_PLATFORM_BASE_URL', 'MARKETING_PLATFORM_TOKEN'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-env-runtime-')); const file = path.join(dir, '.env');
  fs.writeFileSync(file, '# isolated runtime fixture\n');
  const store = environment.createStore(file, process.env);
  try {
    const env = require('../config/env');
    const teachers = require('../services/edifyEightTeacher.service');
    const marketing = require('../integrations/marketingPlatform/client');
    store.update({ EDIFYEIGHT_API_TOKEN: 'runtime-token-before', EDIFYEIGHT_TEACHER_API_URL: 'https://teachers.example/before', MARKETING_PLATFORM_BASE_URL: 'https://marketing.example/before', MARKETING_PLATFORM_TOKEN: 'marketing-before' });
    assert.equal(env.EDIFYEIGHT_API_TOKEN, 'runtime-token-before');
    assert.equal(teachers.getBaseUrl(), 'https://teachers.example/before');
    store.update({ EDIFYEIGHT_API_TOKEN: 'runtime-token-after', EDIFYEIGHT_TEACHER_API_URL: 'https://teachers.example/after', MARKETING_PLATFORM_BASE_URL: 'https://marketing.example/after', MARKETING_PLATFORM_TOKEN: 'marketing-after' });
    assert.equal(teachers.getServiceToken(), 'runtime-token-after');
    assert.equal(teachers.getBaseUrl(), 'https://teachers.example/after');
    assert.equal(marketing.describe().baseUrl, 'https://marketing.example/after');
    assert.ok(!JSON.stringify(marketing.describe()).includes('marketing-after'));
  } finally {
    for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
    fs.unlinkSync(file); fs.rmdirSync(dir);
  }
});
