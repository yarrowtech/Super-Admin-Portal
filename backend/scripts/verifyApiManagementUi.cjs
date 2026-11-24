// UI-only verification. All API responses below are isolated test fixtures;
// this script never uses real credentials or changes the backend environment.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '../../frontend/dist');
const output = path.resolve(__dirname, '../artifacts/api-management-ui');
const projectId = '100000000000000000000001';
const secondProjectId = '100000000000000000000002';
const apiId = '200000000000000000000001';
const endpointId = '300000000000000000000001';
const portalId = '400000000000000000000001';
const connectionId = '500000000000000000000001';
let role = 'super_admin';
let failRegistry = false;
const submissions = [];
const registry = {
  projects: [{ _id: projectId, name: 'Alpha Learning', projectCode: 'ALPHA' }, { _id: secondProjectId, name: 'Beta Services', projectCode: 'BETA' }],
  apis: [{ _id: apiId, projectId, name: 'Alpha Learning API', namespace: 'alpha-00000000-0000-4000-8000-000000000001', baseUrl: 'https://provider.example.test/api', enabled: true, credentialConfigured: true, version: 'v1' }],
  endpoints: [{ _id: endpointId, apiId, providerIntegrationId: '', name: 'Approved customers', module: 'Customers', dataset: 'Profiles', path: '/customers', method: 'GET', operation: 'read', fields: ['name', 'email'], sharedFields: ['name'], shared: true, responseSchema: { name: 'string', email: 'string' }, requestSchema: {}, recordsPath: 'data' }],
  portals: [{ _id: portalId, name: 'Leadership Portal', slug: 'leadership', enabled: true, mcpEnabled: false }],
  connections: [{ _id: connectionId, apiId, portalId, status: 'Pending', testedAt: null, grants: [{ endpointId, fields: ['name'], operations: ['read'] }] }],
  syncJobs: [], events: [], portalOptions: ['ceo', 'finance'],
  existingIntegrations: [{
    id: 'fixture-srs', name: 'Existing Beta SRS API', projectId: secondProjectId,
    imported: false, configured: true, present: true, bearer: false, baseUrl: 'https://srs.example.test',
    fields: [{ key: 'FIXTURE_SRS_SIGNING_SECRET', label: 'Signing secret', type: 'secret', configured: true }],
  }, { id: 'fixture-adapter', name: 'Existing Learning API', projectId, imported: true, configured: true, present: true, bearer: true, baseUrl: 'https://provider.example.test/api', revision: '0'.repeat(64), note: 'This service token is shared with the learning adapter.', fields: [{ key: 'FIXTURE_API_URL', label: 'API URL', type: 'url', value: 'https://provider.example.test/api', configured: true }, { key: 'FIXTURE_API_TOKEN', label: 'Service token', type: 'secret', configured: true }] }],
  capabilities: { encryptionReady: true, mcp: true },
};
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const requested = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (requested !== root && !requested.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  const file = fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(root, 'index.html');
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

async function main() {
  fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(15000);
    const { scopeApiManagement } = await import('../../frontend/src/components/admin/apiManagementScope.js');
  const requestedPaths = []; const failures = []; page.on('requestfailed', req => failures.push(req.failure()?.errorText));
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(() => { localStorage.setItem('sap_token', 'isolated-ui-fixture-session'); sessionStorage.setItem('dashboard_workflow_super_admin', '{}'); sessionStorage.setItem('dashboard_workflow_admin', '{}'); });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      try {
        const url = new URL(request.url()); requestedPaths.push(`${request.method()} ${url.pathname}`);
        if (url.pathname.startsWith('/api/')) {
          const user = { _id: `ui-${role}`, id: `ui-${role}`, firstName: 'UI', lastName: 'Reviewer', role, email: 'ui@example.test', status: 'active' };
          if (url.pathname === '/api/api-management/state') {
            const selected = url.searchParams.get('project');
            const status = request.method() === 'OPTIONS' ? 200 : failRegistry ? 503 : selected && !registry.projects.some(project => project._id === selected) ? 404 : 200;
            const state = status === 200 ? scopeApiManagement(registry, selected) : { error: status === 404 ? 'Project not found' : 'Fixture registry unavailable' };
            await request.respond({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': request.headers().origin || origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'authorization,content-type,x-request-id,x-project-id,x-client-source', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'cache-control': 'no-store' }, body: JSON.stringify(state) }); return;
          }
          let data = url.pathname === '/api/auth/me' ? { data: { user } } : { success: true, data: [] };
          if (url.pathname === '/api/api-management/projects') data = { projects: registry.projects };
          if (!['GET', 'OPTIONS'].includes(request.method())) {
            const body = request.postData() ? JSON.parse(request.postData()) : {};
            submissions.push({ path: url.pathname, body });
            if (url.pathname.endsWith('/test')) { registry.connections[0].status = 'Not Connected'; registry.connections[0].testedAt = new Date().toISOString(); }
            if (url.pathname.endsWith('/rotate')) data = { token: 'fixture-one-time-credential-not-production' };
          }
          await request.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': request.headers().origin || origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'authorization,content-type,x-request-id,x-project-id,x-client-source', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'cache-control': 'no-store' }, body: JSON.stringify(data) }); return;
        }
        if (request.url().startsWith(origin) || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) await request.continue();
        else await request.abort();
      } catch { if (!request.isInterceptResolutionHandled()) await request.abort(); }
    });
    const click = async (text, scope = 'main') => {
      const clicked = await page.evaluate((text, scope) => {
        const button = [...document.querySelectorAll(`${scope} button`)].find(element => element.textContent.trim().endsWith(text) && !element.disabled && element.getBoundingClientRect().height > 0);
        if (!button) return false; button.click(); return true;
      }, text, scope);
      assert.ok(clicked, `Button unavailable: ${text}`);
    };
    const field = async label => {
      const id = await page.evaluate(label => [...document.querySelectorAll('main label')].find(element => element.textContent.trim() === label)?.htmlFor, label);
      assert.ok(id, `Field label missing: ${label}`); return `[id="${id}"]`;
    };
    const navigate = async name => {
      if (page.viewport().width < 1024) await page.select('#api-section-navigation', name);
      else await click(name, 'nav[aria-label="API Management"]');
      await page.waitForFunction(name => document.querySelector('main h1')?.textContent === name, {}, name);
    };
    const settled = () => page.waitForFunction(() => document.querySelector('main')?.getAttribute('aria-busy') === 'false');
    await page.goto(origin + '/admin/api-management', { waitUntil: 'networkidle2' });
    try { await page.waitForSelector('input[aria-label="Search projects"]'); } catch { await page.screenshot({ path: path.join(output, 'load-failure.png'), fullPage: true }); throw new Error(`Preview did not load: ${page.url()} ${await page.$eval('body', element => element.innerText.slice(0, 1400))} Errors: ${errors.join('; ')} Requests: ${requestedPaths.join('; ')} Failures: ${failures.join('; ')}`); }
    await page.type('input[aria-label="Search projects"]', 'Beta');
    assert.equal(await page.$$eval('main article', nodes => nodes.filter(node => node.querySelector('h3')?.textContent === 'Alpha Learning').length), 0);
    await page.$eval('input[aria-label="Search projects"]', element => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(element, ''); element.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.evaluate(async () => { await document.fonts.ready; await document.fonts.load('24px "Material Symbols Outlined"'); });
    await page.screenshot({ path: path.join(output, 'desktop-overview.png'), fullPage: true });
    const portalGroup = await page.$('button[aria-controls="api-nav-portal-connections"]');
    await portalGroup.click();
    assert.equal(await portalGroup.evaluate(button => button.getAttribute('aria-expanded')), 'false');
    await portalGroup.click();
    await page.select('select[aria-label="Project"]', projectId);
    await page.waitForFunction(project => new URLSearchParams(location.search).get('project') === project, {}, projectId);
    await navigate('API Endpoints'); await settled(); await click('Add endpoint');
    await page.type(await field('Endpoint name'), 'Draft endpoint');
    await page.type(await field('Module'), 'Customers');
    await page.type(await field('Dataset'), 'Draft profiles');
    await page.type(await field('Available fields'), 'name, email');
    await click('Save endpoint'); await settled();
    const saved = submissions.find(item => item.path.endsWith('/endpoints'));
    assert.deepEqual(saved.body.fields, ['name', 'email']);
    assert.deepEqual(saved.body.sharedFields, []); assert.equal(saved.body.shared, false);
    await navigate('Connection Configuration');
    await page.select(await field('Destination portal'), portalId);
    await click('Continue'); await click('Continue');
    assert.ok(await page.$eval('main', element => element.textContent.includes('Leadership Portal')));
    await click('Save reviewed connection'); await settled();
    await page.waitForFunction(() => document.querySelector('main h1')?.textContent === 'Portal API Mapping');
    await click('Test'); await settled();
    await click('Activate'); await page.waitForSelector('[role="dialog"]');
    assert.ok(await page.$eval('[role="dialog"]', element => element.textContent.includes('name')));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    await navigate('Connected Portals');
    await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('Project portal connections'));
    await navigate('Authentication'); await click('Issue key');
    await click('Issue new credential', '[role="dialog"]'); await settled();
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent.includes('fixture-one-time-credential'));
    const stored = await page.evaluate(() => Object.values({ ...localStorage, ...sessionStorage }).join(' '));
    assert.ok(!stored.includes('fixture-one-time-credential'));
    await click('I have saved this credential', '[role="dialog"]');
    await navigate('API Configuration');
    assert.equal(await page.$eval('main details', element => element.open), false, 'Existing credential editors should be collapsed initially');
    await page.evaluate(() => document.querySelector('main details summary').click());
    assert.equal(await page.$eval('input[type="password"]', element => element.value), '');
    await page.screenshot({ path: path.join(output, 'desktop-configuration.png'), fullPage: true });
    await page.setViewport({ width: 390, height: 844 });
    await navigate('API Dashboard'); await settled();
    assert.ok(await page.$eval('#api-section-navigation', element => element.getBoundingClientRect().height > 0));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile page overflows horizontally');
    await settled();
    await page.evaluate(async () => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); await Promise.allSettled(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished)); });
    await page.screenshot({ path: path.join(output, 'mobile-overview.png') });
    assert.ok(await page.$eval('header', element => element.getBoundingClientRect().top >= 64), 'Mobile fixed header overlaps the page header');
    await page.$eval('input[aria-label="Toggle dark mode"]', element => element.click());
    await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
    await navigate('Connection Configuration');
    await settled();
    await page.evaluate(async () => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); await Promise.allSettled(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished)); });
    await page.screenshot({ path: path.join(output, 'mobile-dark-connection.png') });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile form overflows horizontally');
    await page.goto(origin + `/admin/api-management/api-configuration?project=${secondProjectId}`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('No managed API registered'));
    const configuration = await page.$eval('main', element => element.innerText);
    for (const label of ['Existing Beta SRS API', 'Backend settings detected', 'Signing secret', 'Live connection unverified', 'Register with API Management']) {
      assert.ok(configuration.includes(label), `Missing configuration status: ${label}`);
    }
    assert.ok(!configuration.includes('Existing Learning API'));
    assert.equal(await page.$('main input[type="password"]'), null);
    const sidebarSections = await page.$$eval('nav[aria-label="API Management"] button[aria-label]', buttons => buttons.map(button => button.getAttribute('aria-label')));
    for (const section of sidebarSections) {
      await navigate(section);
      await settled();
      assert.equal(new URL(page.url()).searchParams.get('project'), secondProjectId);
      assert.ok(!(await page.$eval('main', element => element.innerText)).includes('Alpha Learning API'));
    }
    role = 'admin';
    await page.goto(origin + `/admin/api-management/connected-portals?project=${projectId}`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('Administrator'));
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('main button')].filter(element => /Issue key|Register portal|Rotate key/.test(element.textContent)).length), 0);
    await page.goto(origin + '/admin/api-management/api-configuration?project=invalid', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('Invalid project ID'));
    assert.equal(await page.$eval('select[aria-label="Project"]', select => select.options.length), 3);
    await page.goto(origin + '/admin/api-management/api-configuration?project=ffffffffffffffffffffffff', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('Project not found'));
    failRegistry = true;
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('The registry could not be loaded'));
    assert.ok(await page.evaluate(() => [...document.querySelectorAll('main button')].some(element => element.textContent.includes('Retry'))));
    assert.deepEqual(errors, []);
    console.log('API Management browser checks passed: project search/scope, endpoint draft, connection review, secret display, mobile/dark layout, admin read-only and load-error retry.');
    console.log(`UI fixture screenshots: ${output}`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(() => server.close());
