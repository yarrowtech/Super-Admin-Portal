'use strict';
// Browser verification of the built finance UI. API responses are explicitly mocked;
// database and authorization behavior are covered separately by the finance HTTP tests.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const puppeteer = require('puppeteer');

(async () => {
  const app = express();
  const dist = path.resolve(__dirname, '../../frontend/dist');
  // The build bakes in VITE_API_URL (http://localhost:5000), so every API call is
  // cross-origin from this static server. The client sends x-request-id and
  // x-client-source, which makes those calls preflighted, and request interception
  // never answers the OPTIONS preflight — so the request is blocked, auth bootstrap
  // fails and the app redirects to /login before any portal chrome renders.
  //
  // Rewriting that base to THIS server's own origin makes the calls same-origin, so no
  // preflight is involved. It must be the real origin and never an empty string:
  // frontend/src/config/backend.js throws 'VITE_API_URL is required for a production
  // frontend build' on an empty value, which kills the whole React tree and leaves an
  // empty <div id="root">.
  let origin = '';
  const rewritten = new Map();
  app.use((req, res, next) => {
    if (!req.path.endsWith('.js')) return next();
    const file = path.join(dist, req.path);
    if (!fs.existsSync(file)) return next();
    if (!rewritten.has(req.path)) {
      rewritten.set(req.path, fs.readFileSync(file, 'utf8').split('http://localhost:5000').join(origin));
    }
    return res.type('application/javascript').send(rewritten.get(req.path));
  });
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    for (const role of ['finance_manager', 'finance_employee']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width: 390, height: 844 });
      // Both keys are required: readAuthSession (frontend/src/lib/authSession.js) reads
      // sap_auth_mode alongside the token, so seeding the token alone leaves no session.
      await page.evaluateOnNewDocument(() => {
        localStorage.setItem('sap_token', 'mobile-verification-token');
        localStorage.setItem('sap_auth_mode', 'default');
      });
      await page.setRequestInterception(true);
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/')) {
          let data = { items: [], rows: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 1 } };
          if (url.pathname === '/api/auth/me') data = { user: { _id: '507f1f77bcf86cd799439011', role, firstName: 'Finance', lastName: 'Tester', email: 'finance@example.test', department: 'Finance' } };
          if (url.pathname === '/api/notifications') data = [];
          return request.respond({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
        }
        if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return request.abort();
        return request.continue();
      });
      const base = `http://127.0.0.1:${server.address().port}`;
      await page.goto(`${base}/finance/dashboard/invoices`, { waitUntil: 'networkidle0' });
      const openSelector = 'button[aria-label="Open navigation"]';
      await page.waitForSelector(openSelector, { visible: true });
      await page.click(openSelector);
      await page.waitForSelector('[role="dialog"] nav a', { visible: true });
      const navigation = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return { label: dialog.getAttribute('aria-label'), links: [...dialog.querySelectorAll('nav a')].map(a => ({ href: a.getAttribute('href'), label: a.textContent })), overflow: document.body.style.overflow };
      });
      assert.equal(navigation.label, 'Finance Portal navigation');
      assert.equal(navigation.overflow, 'hidden');
      assert.ok(navigation.links.every(link => !link.href.startsWith('/finance/group/')), 'presentation-only groups must not become mobile routes');
      assert.ok(navigation.links.some(link => link.href === '/finance/dashboard/support'));
      assert.ok(navigation.links.some(link => link.label.includes(role === 'finance_manager' ? 'Review Queue' : 'My Submissions')));
      assert.equal(navigation.links.some(link => link.label.includes('Approval Rules')), role === 'finance_manager');
      // The drawer moves focus inside itself on a setTimeout(..., 0), so immediately
      // after it renders focus is still on the trigger. Pressing Shift+Tab then walks
      // the page behind the overlay instead of wrapping within the trap. Wait for focus
      // to actually land in the drawer before testing the trap.
      await page.waitForFunction(
        () => document.querySelector('[role="dialog"]')?.contains(document.activeElement),
        { timeout: 10000 },
      );
      // Puppeteer has no combined 'Shift+Tab' key: the modifier is held around the press.
      await page.keyboard.down('Shift');
      await page.keyboard.press('Tab');
      await page.keyboard.up('Shift');
      // The control holds a Material Symbols icon ligature before its label, so
      // textContent reads 'logoutLogout'. Match the label rather than the exact string.
      assert.match(await page.evaluate(() => document.activeElement.textContent.trim()), /Logout$/, 'focus wraps to the last drawer control');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close navigation');
      await page.keyboard.press('Escape');
      assert.equal(await page.$('[role="dialog"]'), null);
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Open navigation');
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      await page.click(openSelector);
      await page.click('[role="dialog"] a[href="/finance/dashboard/payments?status=recorded"]');
      await page.waitForFunction(() => location.pathname.endsWith('/payments') && location.search === '?status=recorded');
      assert.equal(await page.$('[role="dialog"]'), null, 'navigation closes after selecting a route');
      await page.click(openSelector);
      const selected = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] nav a')].filter(a => a.className.includes('text-white')).map(a => a.getAttribute('href')));
      assert.deepEqual(selected, ['/finance/dashboard/payments?status=recorded'], 'only the selected status is highlighted');
      await page.click('[role="dialog"] a[href="/finance/dashboard/payments?status=reconciled"]');
      await page.waitForFunction(() => location.search === '?status=reconciled');
      assert.equal(await page.$('[role="dialog"]'), null, 'same-page filter navigation closes the drawer');
      assert.deepEqual(errors, [], 'no browser runtime errors');
      console.log(`PASS ${role}: mobile routes, role visibility, focus trap, Escape, scroll lock and status navigation`);
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
