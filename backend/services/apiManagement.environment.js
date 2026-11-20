const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { fail, baseUrl, hash } = require('./apiManagement.security');

// These are adapters for names already consumed by the existing application.
// Clients cannot choose arbitrary environment variables or a filesystem path.
const definitions = [
  { id: 'edifyeight-teachers', name: 'EdifyEight Teacher API', projectCode: 'EEC', bearer: true,
    urlKey: 'EDIFYEIGHT_TEACHER_API_URL', tokenKey: 'EDIFYEIGHT_API_TOKEN',
    fields: [
      ['EDIFYEIGHT_API_URL', 'EdifyEight API root', 'url'],
      ['EDIFYEIGHT_TEACHER_API_URL', 'Teacher endpoint URL', 'url'],
      ['EDIFYEIGHT_API_TOKEN', 'Shared EdifyEight service token', 'secret'],
    ], sharedNote: 'The EdifyEight service token is also used by study materials.' },
  { id: 'edifyeight-study-materials', name: 'EdifyEight Study Material API', projectCode: 'EEC', bearer: true,
    urlKey: 'EDIFYEIGHT_STUDY_MATERIAL_API_URL', tokenKey: 'EDIFYEIGHT_API_TOKEN',
    fields: [['EDIFYEIGHT_STUDY_MATERIAL_API_URL', 'Study material endpoint URL', 'url'], ['EDIFYEIGHT_API_TOKEN', 'Shared EdifyEight service token', 'secret']],
    sharedNote: 'The EdifyEight service token is also used by the teacher API.' },
  { id: 'efnbmms-admin-management', name: 'EFNBMMS Admin Management API', projectCode: 'EFNBMMS', bearer: true,
    urlKey: 'EFNBMMS_ADMIN_MANAGEMENT_API_URL', tokenKey: 'EFNBMMS_API_TOKEN',
    fields: [['EFNBMMS_ADMIN_MANAGEMENT_API_URL', 'Admin management endpoint URL', 'url'], ['EFNBMMS_API_TOKEN', 'Shared EFNBMMS service token', 'secret']],
    sharedNote: 'Legacy aliases remain supported. EFNBMMS tokens may also supply the EdifyEight fallback when its own token is absent.' },
  { id: 'yarrowtech-srs', name: 'YarrowTech SRS API', projectCode: 'YARROWTECH', bearer: false,
    urlKey: 'SRS_API_BASE_URL',
    fields: [['SRS_API_BASE_URL', 'SRS API base URL', 'url'], ['SRS_API_KEY', 'API key', 'secret'], ['SRS_CLIENT_ID', 'Client ID', 'text'], ['SRS_SIGNING_SECRET', 'Signing secret', 'secret'], ['SRS_WEBHOOK_SECRET', 'Webhook secret', 'secret']],
    sharedNote: 'Existing signing settings are preserved. Provider resource contracts are still required before gateway data access.' },
  { id: 'marketing-platform', name: 'Marketing Platform API', projectCode: null, bearer: false,
    urlKey: 'MARKETING_PLATFORM_BASE_URL',
    fields: [['MARKETING_PLATFORM_BASE_URL', 'API base URL', 'url'], ['MARKETING_PLATFORM_API_KEY', 'API key', 'secret'], ['MARKETING_PLATFORM_TOKEN', 'Bearer token', 'secret']],
    sharedNote: 'Choose the owning project when registering this integration. Existing marketing analytics keep using the same settings.' },
];
const byId = integrationId => definitions.find(item => item.id === integrationId) || fail('Unknown existing integration', 404);
const aliases = {
  EFNBMMS_ADMIN_MANAGEMENT_API_URL: ['EFMBMMS_ADMIN_MANAGEMENT_API_URL'],
  EFNBMMS_API_TOKEN: ['EFMBMMS_API_TOKEN'],
  EDIFYEIGHT_API_URL: ['EFNBMMS_API_URL', 'EFMBMMS_API_URL'],
  EDIFYEIGHT_TEACHER_API_URL: ['EFNBMMS_TEACHER_API_URL', 'EFMBMMS_TEACHER_API_URL'],
  EDIFYEIGHT_API_TOKEN: ['EFNBMMS_API_TOKEN', 'EFMBMMS_API_TOKEN'],
};
function ownsProject(definition, project) {
  if (!definition.projectCode) return true;
  if (project.projectCode) return project.projectCode === definition.projectCode;
  const canonical = require('../utils/projectAccess').PROJECT_REGISTRY.find(item => item.code === definition.projectCode);
  const normalize = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return canonical ? [canonical.name, canonical.code, ...(canonical.aliases || [])].some(name => normalize(name) === normalize(project.name)) : false;
}

function createStore(filePath, runtime = process.env) {
  const read = () => {
    try { return fs.readFileSync(filePath, 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') return ''; fail('Project environment configuration is unavailable', 503); }
  };
  const values = () => ({ ...dotenv.parse(read()), ...runtime });
  const update = (updates, expectedRevision) => {
    const lockPath = `${filePath}.api-management.lock`;
    let lock; let temp;
    try {
      if (fs.existsSync(filePath) && fs.lstatSync(filePath).isSymbolicLink()) fail('Environment file links are not supported', 503);
      lock = fs.openSync(lockPath, 'wx', 0o600);
      const before = read();
      if (expectedRevision && expectedRevision !== hash(before)) fail('Environment changed. Refresh before saving.', 409);
      let after = before; const eol = before.includes('\r\n') ? '\r\n' : '\n';
      for (const [key, value] of Object.entries(updates)) {
        if (!/^[A-Z][A-Z0-9_]+$/.test(key) || typeof value !== 'string' || value.length > 4096 || /[\x00-\x1f\x7f]/.test(value) || (value.includes("'") && value.includes('"'))) fail('Invalid project environment value');
        const quoted = value.includes("'") ? `"${value}"` : `'${value}'`;
        // Replace duplicate definitions consistently; retain all unrelated bytes.
        const pattern = new RegExp(`^(?:[ \\t]*export[ \\t]+)?[ \\t]*${key}[ \\t]*=[^\\r\\n]*`, 'gm');
        for (const match of after.matchAll(pattern)) {
          const previous = match[0].slice(match[0].indexOf('=') + 1).trim();
          if (["'", '"', '`'].includes(previous[0]) && previous.indexOf(previous[0], 1) === -1) fail('Multi-line environment values require server-side migration before editing', 409);
        }
        if (pattern.test(after)) after = after.replace(pattern, () => `${key}=${quoted}`);
        else after += `${after && !after.endsWith('\n') ? eol : ''}${key}=${quoted}${eol}`;
      }
      if (after !== before) {
        temp = path.join(path.dirname(filePath), `.env.api-management-${crypto.randomUUID()}.tmp`);
        const fd = fs.openSync(temp, 'wx', 0o600);
        try { fs.writeFileSync(fd, after, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        if (read() !== before) fail('Environment changed. Refresh before saving.', 409);
        fs.renameSync(temp, filePath); temp = null;
      }
      for (const [key, value] of Object.entries(updates)) runtime[key] = value;
      return hash(after);
    } catch (error) {
      if (error.status) throw error;
      if (error.code === 'EEXIST') fail('Another environment update is in progress. Retry shortly.', 409);
      fail('The backend environment file could not be updated. Check its write permissions.', 503);
    } finally {
      if (temp) { try { fs.unlinkSync(temp); } catch { /* No secret values are logged. */ } }
      if (lock !== undefined) { fs.closeSync(lock); fs.unlinkSync(lockPath); }
    }
  };
  return { values, update, revision: () => hash(read()) };
}
let store = createStore(path.resolve(__dirname, '../.env'));
const effective = (key, values = store.values()) => [key, ...(aliases[key] || [])].map(name => values[name]).find(Boolean) || '';
function provider(definition, values = store.values()) {
  let url = effective(definition.urlKey, values);
  if (!url && definition.id === 'edifyeight-teachers') {
    const root = effective('EDIFYEIGHT_API_URL', values); if (root) url = `${root.replace(/\/$/, '')}/api/internal/teachers`;
  }
  if (!url && definition.id === 'edifyeight-study-materials') {
    const root = effective('EDIFYEIGHT_API_URL', values); if (root) url = `${root.replace(/\/$/, '')}/api/internal/study-materials`;
  }
  if (!url && definition.id === 'yarrowtech-srs') url = 'https://api.yarrowtech.in';
  return { baseUrl: url, token: definition.tokenKey ? effective(definition.tokenKey, values) : '', bearer: definition.bearer };
}
const keysForApi = api => ({ url: `PROJECT_API_${String(api._id).toUpperCase()}_BASE_URL`, token: `PROJECT_API_${String(api._id).toUpperCase()}_TOKEN` });
function gatewayConfiguration(api, integrationId) {
  if (integrationId) {
    if (!api.environmentIntegrationIds?.includes(integrationId)) fail('Provider integration belongs to a different project', 403);
    return provider(byId(integrationId));
  }
  if (api.environmentIntegrationId) return provider(byId(api.environmentIntegrationId));
  if (api.environmentManaged) {
    const keys = keysForApi(api); const values = store.values();
    return { baseUrl: values[keys.url] || api.baseUrl, token: values[keys.token] || '', bearer: true };
  }
  return null;
}
function inventory(projects, apis) {
  const values = store.values(); const revision = store.revision();
  return definitions.map(definition => {
    const api = apis.find(item => item.environmentIntegrationIds?.includes(definition.id));
    const project = api ? projects.find(item => String(item._id) === String(api.projectId)) : definition.projectCode ? projects.find(item => ownsProject(definition, item)) : null;
    const config = provider(definition, values);
    return {
      id: definition.id, name: definition.name, projectCode: definition.projectCode,
      projectId: project?._id || null, apiId: api?._id || null,
      imported: Boolean(api), present: definition.fields.some(([key]) => Boolean(effective(key, values))),
      configured: Boolean(config.baseUrl && (definition.bearer ? config.token : definition.fields.some(([key, , type]) => type === 'secret' && Boolean(effective(key, values))))),
      baseUrl: config.baseUrl, revision, bearer: definition.bearer, note: definition.sharedNote,
      fields: definition.fields.map(([key, label, type]) => ({ key, label, type, configured: Boolean(effective(key, values)), ...(type === 'secret' ? {} : { value: effective(key, values) }) })),
    };
  });
}
function updateExisting(integrationId, changes, revision) {
  const definition = byId(integrationId);
  for (const [key, value] of Object.entries(changes)) {
    const field = definition.fields.find(item => item[0] === key);
    if (!field) fail('This project setting cannot be edited here', 403);
    if (field[2] === 'url') changes[key] = baseUrl(value);
    if (!value.trim()) fail('Blank values cannot replace existing settings');
  }
  return store.update(changes, revision);
}
function writeApi(api, { url, token }) {
  if (api.environmentIntegrationId) {
    const definition = byId(api.environmentIntegrationId);
    if (!definition.bearer) fail('Use the existing integration credential fields for this provider');
    const changes = {};
    if (url !== undefined) changes[definition.urlKey] = url;
    if (token !== undefined) changes[definition.tokenKey] = token;
    return updateExisting(definition.id, changes);
  }
  const keys = keysForApi(api); const changes = {};
  if (url !== undefined) changes[keys.url] = url;
  if (token !== undefined) changes[keys.token] = token;
  return store.update(changes);
}
module.exports = { definitions, byId, ownsProject, inventory, updateExisting, writeApi, keysForApi, gatewayConfiguration, createStore,
  fingerprint(api, integrationId) { const config = gatewayConfiguration(api, integrationId); return config ? hash(JSON.stringify(config)) : null; },
  setStoreForTests(next) { if (process.env.NODE_ENV !== 'test') throw new Error('Test-only injection'); store = next; },
};
