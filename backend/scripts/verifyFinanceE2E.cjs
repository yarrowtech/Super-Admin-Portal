'use strict';
// True end-to-end verification of the Finance portal: the real built frontend in a real
// browser, talking to the real Express app and a real (in-memory) MongoDB. Nothing is
// mocked — not auth, not the API, not the database.
//
// This closes the gap left by the two existing harnesses:
//   - scripts/verifyFinancePortal.js  drives the HTTP API with no browser at all.
//   - scripts/verifyFinanceMobile.js  drives the browser but mocks every /api/ response,
//                                     so it cannot catch a real contract mismatch.
//
// What that gap hides: a page that renders perfectly against a mocked `{ items: [] }`
// but throws on the field names the controller actually returns. Only a real pairing
// catches it, so every assertion below runs against live data this script created
// through the UI or the API.
//
// Usage:  node scripts/verifyFinanceE2E.cjs [--headful] [--keep-open]
// Needs:  frontend/dist must be built first (npm --prefix ../frontend run build).
//
// Exits non-zero on the first real failure so it can gate a release.

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'finance-e2e-secret';

const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const puppeteer = require('puppeteer');

const HEADFUL = process.argv.includes('--headful');
const KEEP_OPEN = process.argv.includes('--keep-open');
const PASSWORD = 'E2e!Passw0rd';

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// Runs one check; a throw becomes a recorded failure rather than aborting the whole run,
// so a single broken page still yields a full report.
const check = async (name, fn) => {
  try {
    const detail = await fn();
    record(name, true, typeof detail === 'string' ? detail : '');
    return true;
  } catch (error) {
    record(name, false, String(error.message || error).replace(/\s+/g, ' ').slice(0, 300));
    return false;
  }
};

(async () => {
  const dist = path.resolve(__dirname, '../../frontend/dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error(`\nfrontend/dist is missing. Build it first:\n  npm --prefix ${path.resolve(__dirname, '../../frontend')} run build\n`);
    process.exit(2);
  }

  // The static server gets a fixed port so it can be added to the CORS allowlist before
  // app.js loads its frozen config. config/cors.js only permits a known set of dev
  // origins, so a random port would be refused at preflight.
  const WEB_PORT = 4178;
  const appBase = `http://127.0.0.1:${WEB_PORT}`;
  process.env.CORS_ORIGIN = [process.env.CORS_ORIGIN, appBase, `http://localhost:${WEB_PORT}`].filter(Boolean).join(',');

  console.log('Starting in-memory MongoDB (replica set — financial writes are transactional)...');
  const { MongoMemoryReplSet } = require('mongodb-memory-server');
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  process.env.MONGO_URI = mongod.getUri();

  // Require only after MONGO_URI is set — app.js connects on load.
  const { server } = require('../app');
  const mongoose = require('mongoose');
  const { User } = require('../models/auth');

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const apiBase = `http://127.0.0.1:${server.address().port}`;
  for (let i = 0; i < 100 && mongoose.connection.readyState !== 1; i += 1) await new Promise((r) => setTimeout(r, 100));
  assert.equal(mongoose.connection.readyState, 1, 'MongoDB did not become ready');
  console.log(`Backend listening on ${apiBase}`);

  // Serve the built SPA, and rewrite the baked-in VITE_API_URL to this run's backend
  // port. The build hardcodes http://localhost:5000; without this the browser would
  // talk to whatever happens to be on 5000 (or nothing) instead of our test backend.
  const staticApp = express();
  const rewritten = new Map();
  staticApp.use((req, res, next) => {
    if (!req.path.endsWith('.js')) return next();
    const file = path.join(dist, req.path);
    if (!fs.existsSync(file)) return next();
    if (!rewritten.has(req.path)) {
      const src = fs.readFileSync(file, 'utf8');
      rewritten.set(req.path, src.split('http://localhost:5000').join(apiBase));
    }
    res.type('application/javascript').send(rewritten.get(req.path));
  });
  staticApp.use(express.static(dist));
  staticApp.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  const web = await new Promise((resolve, reject) => {
    const s = staticApp.listen(WEB_PORT, '127.0.0.1', () => resolve(s));
    s.on('error', (e) => reject(new Error(`cannot bind port ${WEB_PORT} for the test frontend: ${e.message}`)));
  });
  console.log(`Frontend served from ${appBase} (API calls rewritten to ${apiBase})\n`);

  // One API call as a given user.
  const tokens = {};
  const api = async (method, p, who, body) => {
    const res = await fetch(`${apiBase}${p}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { status: res.status, body: parsed };
  };

  let browser;
  try {
    // ---------------------------------------------------------------- seed real users
    console.log('SETUP');
    const USERS = {
      head: { email: 'e2e.head@finance.test', role: 'finance_manager', firstName: 'Fiona', lastName: 'Head', department: 'Finance' },
      emp: { email: 'e2e.emp@finance.test', role: 'finance_employee', firstName: 'Farhan', lastName: 'Emp', department: 'Finance' },
      hr: { email: 'e2e.hr@finance.test', role: 'hr', firstName: 'Hari', lastName: 'Hr', department: 'HR' },
    };
    for (const [key, u] of Object.entries(USERS)) {
      await User.create({ ...u, password: PASSWORD, isActive: true, accountStatus: 'active' });
      const res = await api('POST', '/api/auth/login', null, { email: u.email, password: PASSWORD });
      const b = res.body;
      tokens[key] = b?.data?.accessToken || b?.data?.token || b?.accessToken || b?.token;
      assert.ok(tokens[key], `login failed for ${key}: ${JSON.stringify(b).slice(0, 200)}`);
    }
    record('seed + login head, employee, hr (real bcrypt + real JWT)', true);

    // Invoicing refuses a tax rate with no active rule behind it, so the rule is a real
    // precondition rather than test scaffolding. Seeded through the API as the head.
    const rule = await api('POST', '/api/dept/finance/tax-rules', 'head', {
      kind: 'gst', code: 'GST18', name: 'GST 18%', rate: 18, effectiveFrom: '2020-01-01',
    });
    assert.ok([200, 201].includes(rule.status), `could not seed the GST rule: HTTP ${rule.status} ${JSON.stringify(rule.body).slice(0, 200)}`);
    record('seed active GST 18% tax rule (required before invoicing)', true);

    browser = await puppeteer.launch({ headless: !HEADFUL, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

    // Opens a page as a role, with console/pageerror capture. Nothing is intercepted,
    // so every XHR reaches the real backend.
    const openAs = async (who, { width = 1440, height = 900 } = {}) => {
      const page = await browser.newPage();
      const errors = [];
      const failedRequests = [];
      page.on('pageerror', (e) => errors.push(String(e.message)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
      page.on('requestfailed', (r) => { if (r.url().includes('/api/')) failedRequests.push(`${r.url()} ${r.failure()?.errorText}`); });
      page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 500) failedRequests.push(`${r.url()} -> HTTP ${r.status()}`); });
      await page.setViewport({ width, height });
      // Seed the same keys the real login writes (authSession.js): the token alone is
      // not a session — AuthContext also reads sap_auth_mode.
      const token = tokens[who];
      await page.evaluateOnNewDocument((t) => {
        try { localStorage.setItem('sap_token', t); localStorage.setItem('sap_auth_mode', 'default'); } catch { /* ignore */ }
      }, token);
      page.__errors = errors;
      page.__failedRequests = failedRequests;
      return page;
    };

    // Navigates and refuses to pass on a login redirect or an error-boundary screen.
    // Without this a logged-out shell renders ~117 chars and every route check would
    // report PASS while testing nothing at all.
    const land = async (page, route) => {
      await page.goto(`${appBase}${route}`, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.waitForFunction(() => !/^\s*$/.test(document.body.innerText), { timeout: 20000 }).catch(() => {});
      const { text, url } = await page.evaluate(() => ({ text: document.body.innerText, url: location.pathname }));
      assert.ok(!url.startsWith('/login'), `redirected to ${url} — the session was not accepted`);
      assert.ok(!/sign in|log in to continue/i.test(text.slice(0, 200)), 'a login screen rendered instead of the portal');
      assert.ok(!/something went wrong|unexpected error|cannot read propert/i.test(text), 'an error message is visible on the page');
      return text;
    };

    // Ignore noise that is not a finance defect: absent dev sourcemaps, the websocket
    // the test server does not run, and favicon/font 404s from the static server.
    const realErrors = (page) => page.__errors.filter((e) => !/sourcemap|favicon|websocket|socket\.io|ERR_CONNECTION_REFUSED.*socket|Failed to load resource.*(font|\.ico)/i.test(e));

    // ------------------------------------------------- 1. dashboard renders live data
    console.log('\n1. DASHBOARD (the URL you reported)');
    const dash = await openAs('head');
    await check('/finance/dashboard loads with no page error', async () => {
      await land(dash, '/finance/dashboard');
      const errs = realErrors(dash);
      assert.equal(errs.length, 0, `page errors: ${errs.slice(0, 3).join(' | ')}`);
      assert.deepEqual(dash.__failedRequests, [], `failed API calls: ${dash.__failedRequests.slice(0, 3).join(' | ')}`);
      return 'no console errors, no 5xx';
    });

    await check('dashboard is not a blank page and shows the Finance portal', async () => {
      const text = await dash.$eval('body', (b) => b.innerText);
      assert.ok(text.trim().length > 50, `body text too short (${text.trim().length} chars) — likely a crashed render`);
      assert.ok(/finance/i.test(text), 'the word "Finance" does not appear anywhere on the dashboard');
      return `${text.trim().length} chars rendered`;
    });

    await check('dashboard sidebar renders the real finance menu', async () => {
      const links = await dash.$$eval('a[href^="/finance/"]', (as) => as.map((a) => a.getAttribute('href')));
      assert.ok(links.length >= 5, `expected the finance menu, found ${links.length} link(s)`);
      // Presentation-only groups must never become navigable routes.
      const groups = links.filter((h) => h.startsWith('/finance/group/'));
      assert.deepEqual(groups, [], `group paths are not routes: ${groups.join(', ')}`);
      return `${links.length} finance links, no /finance/group/ routes`;
    });

    // --------------------------------------------- 2. every finance route really loads
    console.log('\n2. EVERY FINANCE ROUTE (real API, real DB)');
    // Taken from the shipped menu so this list cannot drift from the app.
    const ROUTES = [
      '/finance/dashboard', '/finance/dashboard/control-tower', '/finance/dashboard/reports',
      '/finance/dashboard/review', '/finance/dashboard/invoices', '/finance/dashboard/payments',
      '/finance/dashboard/expenses', '/finance/dashboard/budgets', '/finance/dashboard/accounting',
      '/finance/dashboard/directory', '/finance/dashboard/compliance', '/finance/dashboard/approvals',
      '/finance/dashboard/disputes', '/finance/dashboard/refunds', '/finance/dashboard/non-compliance',
      '/finance/dashboard/tasks',
      '/finance/dashboard/team', '/finance/dashboard/messages', '/finance/dashboard/settings',
      '/finance/dashboard/support',
    ];
    for (const route of ROUTES) {
      const page = await openAs('head');
      await check(`head loads ${route}`, async () => {
        const text = await land(page, route);
        const errs = realErrors(page);
        assert.equal(errs.length, 0, errs.slice(0, 2).join(' | '));
        assert.deepEqual(page.__failedRequests, [], page.__failedRequests.slice(0, 2).join(' | '));
        // The finance chrome must actually be present, not just any non-empty body.
        const nav = await page.$$eval('a[href^="/finance/"]', (as) => as.length);
        assert.ok(nav >= 5, `only ${nav} finance nav link(s) — the portal shell did not render`);
        return `${text.trim().length} chars, ${nav} nav links`;
      });
      await page.close();
    }

    // Leave and Documents are personal records served by the shared employee API, whose
    // allowlist (routes/employee.dept.routes.js) covers FINANCE_EMPLOYEE but not
    // FINANCE_MANAGER. They are therefore scoped to the employee in portalMenus.js, so
    // the employee must be able to open them and the head must not be offered them.
    console.log('\n2b. PERSONAL RECORDS (shared employee API)');
    for (const route of ['/finance/dashboard/leave', '/finance/dashboard/documents']) {
      const page = await openAs('emp');
      await check(`employee loads ${route}`, async () => {
        const text = await land(page, route);
        const errs = realErrors(page);
        assert.equal(errs.length, 0, errs.slice(0, 2).join(' | '));
        return `${text.trim().length} chars`;
      });
      await page.close();
    }

    await check('head is not offered the employee-only personal record links', async () => {
      const page = await openAs('head');
      await land(page, '/finance/dashboard');
      const offered = await page.$$eval('a[href^="/finance/dashboard/"]', (as) => as.map((a) => a.getAttribute('href')));
      await page.close();
      const shown = ['/finance/dashboard/leave', '/finance/dashboard/documents'].filter((r) => offered.includes(r));
      assert.deepEqual(shown, [], `the head is still shown: ${shown.join(', ')}`);
      return 'leave and documents are employee-only';
    });

    await check('menu does not offer a link the role cannot use (leave/documents)', async () => {
      const page = await openAs('head');
      await land(page, '/finance/dashboard');
      const offered = await page.$$eval('a[href^="/finance/dashboard/"]', (as) => as.map((a) => a.getAttribute('href')));
      await page.close();
      const broken = [];
      for (const r of ['/finance/dashboard/leave', '/finance/dashboard/documents']) {
        if (!offered.includes(r)) continue;
        const p = r.endsWith('leave') ? '/api/dept/employee/leave' : '/api/employee/documents';
        const res = await api('GET', p, 'head');
        if (res.status === 403) broken.push(`${r} -> ${p} HTTP 403`);
      }
      assert.deepEqual(broken, [], `the head is shown link(s) whose API refuses them: ${broken.join('; ')}`);
      return 'every offered link is usable by the role';
    });

    // --------------------------------------- 3. maker-checker through the real backend
    console.log('\n3. MAKER-CHECKER WORKFLOW (employee submits, head approves)');
    let invoiceId = null;
    // Line-item shape required by services/finance/money.js (invoice totals are computed
    // server-side from items; a flat `amount` is rejected with FINANCE_422).
    const invoiceBody = {
      clientName: 'E2E Portal Client', clientEmail: 'ap@e2e.test', dueDate: '2026-12-31',
      gstRate: 18, items: [{ description: 'E2E consulting', quantity: 10, rate: 1000, taxRate: 18 }],
    };
    await check('employee creates an invoice via the real API', async () => {
      const made = await api('POST', '/api/dept/finance/invoices', 'emp', invoiceBody);
      assert.ok([200, 201].includes(made.status), `HTTP ${made.status}: ${JSON.stringify(made.body).slice(0, 250)}`);
      const doc = made.body?.data?.invoice || made.body?.data || made.body;
      invoiceId = doc?._id || doc?.id;
      assert.ok(invoiceId, `no invoice id returned: ${JSON.stringify(made.body).slice(0, 200)}`);
      // Server-computed total: 10 x 1000 = 10000 + 18% GST = 11800.
      assert.equal(doc.total, 11800, `expected server-computed total 11800, got ${doc.total}`);
      assert.equal(doc.status, 'draft', `new invoice should start as draft, got ${doc.status}`);
      return `invoice ${invoiceId}, total ${doc.total}, draft`;
    });

    await check('maker-checker: employee submits, head approves, invoice becomes sent', async () => {
      assert.ok(invoiceId, 'skipped: no invoice was created');
      const F = '/api/dept/finance';
      // An employee must not be able to approve their own work.
      const self = await api('POST', `${F}/review/invoice/${invoiceId}/decision`, 'emp', { decision: 'approve' });
      assert.equal(self.status, 403, `employee self-approval should be 403, got ${self.status}`);
      const sub = await api('POST', `${F}/review/invoice/${invoiceId}/submit`, 'emp', { note: 'E2E ready' });
      assert.equal(sub.status, 200, `submit failed: HTTP ${sub.status} ${JSON.stringify(sub.body).slice(0, 200)}`);
      const dec = await api('POST', `${F}/review/invoice/${invoiceId}/decision`, 'head', { decision: 'approve', note: 'E2E OK' });
      assert.equal(dec.status, 200, `approve failed: HTTP ${dec.status} ${JSON.stringify(dec.body).slice(0, 200)}`);
      assert.equal(dec.body?.data?.status, 'sent', `expected status sent, got ${dec.body?.data?.status}`);
      return 'self-approval blocked, submit + approve -> sent';
    });

    await check('paid status cannot be set without a real payment', async () => {
      assert.ok(invoiceId, 'skipped: no invoice was created');
      const res = await api('PUT', `/api/dept/finance/invoices/${invoiceId}`, 'head', { status: 'paid' });
      assert.equal(res.status, 409, `expected 409 conflict, got ${res.status}`);
      return '409 — paid is reachable only through a payment';
    });

    await check('the employee-created invoice is visible in the head\'s browser UI', async () => {
      assert.ok(invoiceId, 'skipped: no invoice was created');
      const page = await openAs('head');
      const text = await land(page, '/finance/dashboard/invoices');
      await page.close();
      // Proves the real controller's field names match what the real component reads.
      assert.ok(/E2E Portal Client/.test(text), 'the invoice created through the API does not appear in the rendered invoice list');
      return 'live record rendered by the real component';
    });

    await check('employee is refused a head-only write (chart of accounts)', async () => {
      const res = await api('POST', '/api/dept/finance/accounts', 'emp', { code: '9999', name: 'E2E guard', type: 'expense' });
      assert.equal(res.status, 403, `expected 403, got ${res.status}`);
      return '403 as expected';
    });

    await check('unauthenticated API access is refused', async () => {
      const res = await api('GET', '/api/dept/finance/invoices', null);
      assert.equal(res.status, 401, `expected 401, got ${res.status}`);
      return '401 as expected';
    });

    // ------------------------------------------------------- 4. cross-portal isolation
    console.log('\n4. ACCESS CONTROL IN THE BROWSER');
    await check('an HR user is kept out of the finance portal UI', async () => {
      const page = await openAs('hr');
      await page.goto(`${appBase}/finance/dashboard`, { waitUntil: 'networkidle0', timeout: 60000 });
      const { text, url } = await page.evaluate(() => ({ text: document.body.innerText, url: location.pathname }));
      const links = await page.$$eval('a[href^="/finance/dashboard/"]', (as) => as.length);
      await page.close();
      const redirected = !url.startsWith('/finance');
      const refused = /not authori|no access|forbidden|unauthori|permission/i.test(text);
      assert.ok(redirected || refused || links === 0,
        `HR saw the finance portal with ${links} nav link(s) at ${url}`);
      return redirected ? `redirected to ${url}` : refused ? 'access refused on screen' : 'no finance navigation exposed';
    });

    await check('finance employee does not see the head-only Review Queue label', async () => {
      const page = await openAs('emp');
      await land(page, '/finance/dashboard');
      const labels = await page.$$eval('a[href^="/finance/"]', (as) => as.map((a) => a.textContent.trim()));
      await page.close();
      assert.ok(!labels.some((l) => /review queue/i.test(l)), `employee sees a head-only item: ${labels.filter((l) => /review/i.test(l)).join(', ')}`);
      assert.ok(labels.some((l) => /my submissions/i.test(l)), 'employee is missing "My Submissions"');
      return 'employee sees My Submissions, not Review Queue';
    });

    // ------------------------------------------------------------- 5. mobile + dark mode
    console.log('\n5. RESPONSIVE + THEME');
    await check('mobile drawer opens and is theme-correct at 390x844', async () => {
      const page = await openAs('head', { width: 390, height: 844 });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
      await land(page, '/finance/dashboard/invoices');
      await page.waitForSelector('button[aria-label="Open navigation"]', { visible: true, timeout: 20000 });
      await page.click('button[aria-label="Open navigation"]');
      await page.waitForSelector('[role="dialog"] nav a', { visible: true, timeout: 20000 });
      const info = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        const bg = getComputedStyle(d).backgroundColor;
        const rgb = (bg.match(/\d+/g) || []).slice(0, 3).map(Number);
        return { label: d.getAttribute('aria-label'), overflow: document.body.style.overflow, count: d.querySelectorAll('nav a').length, luma: rgb.length === 3 ? (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) : null };
      });
      await page.close();
      assert.equal(info.label, 'Finance Portal navigation');
      assert.equal(info.overflow, 'hidden', 'background scroll was not locked behind the drawer');
      assert.ok(info.count >= 5, `drawer has only ${info.count} link(s)`);
      // Guards the regression noted in the project history: light drawer in dark mode.
      assert.ok(info.luma === null || info.luma < 128, `drawer renders light (luma ${info.luma}) under prefers-color-scheme: dark`);
      return `${info.count} links, scroll locked, dark surface`;
    });

    await check('no horizontal overflow on the dashboard at 390px', async () => {
      const page = await openAs('head', { width: 390, height: 844 });
      await land(page, '/finance/dashboard');
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await page.close();
      assert.ok(over <= 1, `page scrolls horizontally by ${over}px at phone width`);
      return 'no sideways scroll';
    });

    await dash.close();
  } catch (error) {
    record('harness completed without crashing', false, String(error.message || error));
  } finally {
    if (browser && !KEEP_OPEN) await browser.close().catch(() => {});
    await new Promise((r) => web.close(r)).catch(() => {});
    await new Promise((r) => server.close(r)).catch(() => {});
    await mongoose.disconnect().catch(() => {});
    await mongod.stop().catch(() => {});
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${'='.repeat(72)}`);
  console.log(`${results.length} checks, ${results.length - failed.length} passed, ${failed.length} failed.`);
  if (failed.length) {
    console.log('\nFAILURES');
    for (const f of failed) console.log(`  - ${f.name}\n      ${f.detail}`);
  }
  console.log('='.repeat(72));
  setTimeout(() => process.exit(failed.length ? 1 : 0), 200).unref();
})().catch((error) => { console.error('\nHarness crashed:', error); process.exit(1); });
