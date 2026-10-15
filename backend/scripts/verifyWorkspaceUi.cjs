process.env.NODE_ENV = 'test';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');
const puppeteer = require('puppeteer');
const User = require('../models/auth/User');
const Session = require('../models/auth/Session');
const Record = require('../models/WorkspaceRecord');
const configuration = require('../services/workspaceConfiguration.service');

async function run() {
  const mongo = await MongoMemoryServer.create();
  let browser, server, testPage;
  const provider = require('../services/yarrowtechApi.service');
  const originalProbe = provider.probe;
  let healthFailure = false;
  provider.probe = async () => ({ status: 'blocked', syncReady: false, authenticationStatus: 'unverified',
    baseUrl: provider.inventory().providerBaseUrl, checkedAt: new Date(), reachable: !healthFailure,
    healthy: !healthFailure, ...(healthFailure ? {} : { httpStatus: 200 }),
    connectionStatus: healthFailure ? 'unreachable' : 'healthy',
    connectionMessage: healthFailure ? 'Could not reach the provider health endpoint.' : 'Provider health check passed. Authenticated data access is still unverified.',
    blockedBy: provider.CONTRACT_BLOCKER });
  try {
    await mongoose.connect(mongo.getUri());
    await Record.init(); await configuration.initialize();
    const admin = await User.create({ firstName: 'Workspace', lastName: 'Admin', email: 'ui@workspace.test', password: 'ValidPass123!', role: 'admin', isActive: true });
    const jti = randomUUID();
    await Session.create({ user: admin._id, jti, refreshTokenHash: 'fixture-only', expiresAt: new Date(Date.now() + 3600000) });
    const token = jwt.sign({ userId: String(admin._id), role: admin.role }, require('../config/jwt').accessSecret, { expiresIn: '1h', jwtid: jti });
    const app = express();
    app.use(express.json());
    app.get('/api/auth/me', (req, res) => res.json({ success: true, data: { user: { _id: String(admin._id), firstName: admin.firstName, role: 'admin', portalAccess: ['admin'] } } }));
    app.use('/api/v1', require('../routes/yarrowtech.routes'));
    app.use('/api/v1', require('../routes/organizationWorkspace.routes'));
    app.use('/api', (req, res) => res.json({ success: true, data: { items: [], projects: [] } }));
    app.use((error, req, res, next) => { void next; res.status(error.statusCode || 500).json({ success: false, error: error.message }); });
    const dist = path.resolve(__dirname, '../../frontend/dist');
    app.use(express.static(dist));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    testPage = page;
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.evaluateOnNewDocument((value) => localStorage.setItem('sap_token', value), token);
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) return url.origin === origin || url.protocol === 'data:' || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname) ? request.continue() : request.abort();
      const headers = { 'content-type': 'application/json', 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Content-Type, Authorization, x-request-id, x-client-source, x-project-id', 'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      try {
        const response = await fetch(origin + url.pathname + url.search, { method: request.method(), headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, ...(request.postData() ? { body: request.postData() } : {}) });
        await request.respond({ status: response.status, headers, body: await response.text() });
      } catch { await request.respond({ status: 500, headers, body: JSON.stringify({ error: 'Isolated API forwarding failed' }) }); }
    });
    await page.goto(origin + '/admin/projects/YARROWTECH/integrations', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Provider health: Not checked'));
    await page.$$eval('button', (buttons) => buttons.find((button) => button.textContent.trim() === 'Check provider health').click());
    await page.waitForFunction(() => document.body.innerText.includes('Provider health: Healthy (HTTP 200)'));
    assert.equal(await page.$$eval('button', (buttons) => buttons.find((button) => button.textContent.trim().endsWith('Sync')).disabled), true);
    assert.equal(await page.$eval('body', (body) => body.innerText.split('Synchronization needs verified provider resource endpoints, authentication instructions and response formats.').length - 1), 1);
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Provider health: Healthy (HTTP 200)'));
    healthFailure = true;
    await page.$$eval('button', (buttons) => buttons.find((button) => button.textContent.trim() === 'Check provider health').click());
    await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('Could not reach the provider'));
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Provider health: unreachable'));
    assert.equal(await require('../models/WorkspaceSync').Job.countDocuments({ integrationId: 'yarrowtech-srs' }), 0);
    await page.goto(origin + '/yarrowtech/services', { waitUntil: 'networkidle0' });
    await page.waitForSelector('button[aria-label="Add record"]');
    await page.click('button[aria-label="Add record"]');
    await page.waitForSelector('[role="dialog"] input');
    await page.type('[role="dialog"] input', 'Persistent UI service');
    await page.click('[role="dialog"] button[type="submit"]');
    await page.waitForFunction(() => document.body.innerText.includes('Persistent UI service') && !document.querySelector('[role="dialog"]'));
    assert.equal(await Record.countDocuments({ projectId: 'YARROWTECH', kind: 'service', name: 'Persistent UI service' }), 1);
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Persistent UI service'));
    await page.click('button[title="Edit record"]');
    await page.waitForSelector('[role="dialog"] input');
    await page.$eval('[role="dialog"] input', (input) => { input.focus(); input.select(); });
    await page.keyboard.type('Updated UI service');
    await page.click('[role="dialog"] button[type="submit"]');
    await page.waitForFunction(() => document.body.innerText.includes('Updated UI service') && !document.querySelector('[role="dialog"]'));
    const service = await Record.findOne({ projectId: 'YARROWTECH', kind: 'service' }).lean();
    assert.equal(service.history.length, 2);
    await page.goto(origin + '/admin/projects/MATEBID/services', { waitUntil: 'networkidle0' });
    assert.equal((await page.$eval('body', (body) => body.innerText)).includes('Updated UI service'), false);
    await page.goto(origin + '/yarrowtech/crm/activity', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('updated (service)'));
    for (const project of require('../utils/projectAccess').PROJECT_REGISTRY) {
      await page.goto(origin + '/admin/projects/' + project.code, { waitUntil: 'networkidle0' });
      await page.waitForFunction((name) => document.querySelector('main h1')?.textContent.toUpperCase().includes(name.toUpperCase()), {}, project.name);
      assert.equal(await page.$eval('main', (main) => main.innerText.includes('Internal server error')), false);
    }
    const localRecords = require('../services/workspaceRecords.service');
    const product = await localRecords.create(admin, 'YARROWTECH', 'product', { name: 'UI product' });
    const customer = await localRecords.create(admin, 'YARROWTECH', 'customer', { name: 'UI customer' });
    await require('../services/yarrowtechOperations.service').saveDelivery(admin, 'YARROWTECH', { name: 'UI delivery', serviceId: String(service._id), customerId: String(customer._id), tasks: [{ title: 'Delivery task', status: 'pending' }] });
    for (const suffix of ['/services/clients', '/services/projects', '/products/' + product._id, '/products/' + product._id + '/settings', '/crm/customers/' + customer._id, '/integrations/yarrowtech-srs', '/sync-history']) {
      await page.goto(origin + '/admin/projects/YARROWTECH' + suffix, { waitUntil: 'networkidle0' });
      await page.waitForSelector('main h1');
      assert.equal(await page.$eval('main', (main) => main.innerText.includes('Internal server error')), false);
    }
    await page.goto(origin + '/admin/projects/YARROWTECH/services/projects', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('UI delivery'));
    await page.goto(origin + '/admin/projects/YARROWTECH/services/clients', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('UI customer'));
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewport(viewport);
      await page.goto(origin + '/admin/projects/YARROWTECH/services', { waitUntil: 'networkidle0' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.$$eval('nav[aria-label="YarrowTech workspace"] a[aria-current="page"]', (links) => links.length), 1);
      if (viewport.width < 640) {
        assert.equal(await page.$eval('.yt-record-table tbody tr', (row) => getComputedStyle(row).display), 'grid');
      }
      fs.mkdirSync(path.resolve(__dirname, '../artifacts/workspace'), { recursive: true });
      await page.screenshot({ path: path.resolve(__dirname, `../artifacts/workspace/services-${viewport.width}.png`), fullPage: true });
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, checks: ['SRS health success/failure persist after reload', 'SRS blocker displayed once', 'Health success never enables unverified sync', 'Authenticated API', 'Create and edit persist', 'Refresh retains records', 'Cross-project UI isolation', 'Audit history', 'All ten project workspaces open', 'YarrowTech admin detail/settings/integration routes', 'Linked clients and deliveries', 'Desktop/mobile layout', 'No runtime errors'] }));
  } catch (error) {
    if (testPage) console.error((await testPage.$eval('body', (body) => body.innerText)).slice(-4000));
    throw error;
  } finally { provider.probe = originalProbe; if (browser) await browser.close(); if (server) await new Promise((resolve) => server.close(resolve)); await mongoose.disconnect(); await mongo.stop(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
