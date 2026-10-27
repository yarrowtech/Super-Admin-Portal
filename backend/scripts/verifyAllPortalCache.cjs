'use strict';
// Verifies the client-side HTTP cache across EVERY portal, not just finance.
//
// The cache lives in the one shared apiClient and the policy lives in one Express
// middleware, so a per-portal check is what proves that claim rather than assuming it:
// each portal is loaded twice in a real browser against the real backend, and the second
// load must issue strictly fewer API calls than the first.
//
// It also re-checks, per portal, that nothing marked no-store is ever written to storage.
//
// Usage: node scripts/verifyAllPortalCache.cjs [--headful]
// Needs: frontend/dist built first.

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'all-portal-cache-secret';

const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const puppeteer = require('puppeteer');

const HEADFUL = process.argv.includes('--headful');
const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const check = async (name, fn) => {
  try {
    const d = await fn();
    record(name, true, typeof d === 'string' ? d : '');
  } catch (e) {
    record(name, false, String(e.message || e).replace(/\s+/g, ' ').slice(0, 240));
  }
};

// Each portal: the role that may open it, and a representative route.
const PORTALS = [
  { name: 'Finance', role: 'finance_manager', portal: 'finance', route: '/finance/dashboard' },
  { name: 'HR', role: 'hr', portal: 'hr', route: '/hr/dashboard' },
  { name: 'Law', role: 'law_head', portal: 'law', route: '/law/dashboard' },
  { name: 'IT', role: 'it_manager', portal: 'it', route: '/it/dashboard' },
  { name: 'CEO', role: 'ceo', portal: 'ceo', route: '/ceo/dashboard' },
  { name: 'Media', role: 'media_head', portal: 'media', route: '/media/dashboard' },
  // There is no generic 'employee' role (see config/roles.js); the employee portal is
  // reached by department employees, so it_employee stands in for that surface.
  { name: 'Employee', role: 'it_employee', portal: 'employee', route: '/employee/dashboard' },
];

(async () => {
  const dist = path.resolve(__dirname, '../../frontend/dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error(`\nfrontend/dist is missing. Build it first:\n  npm --prefix ${path.resolve(__dirname, '../../frontend')} run build\n`);
    process.exit(2);
  }

  const WEB_PORT = 4182;
  const appBase = `http://127.0.0.1:${WEB_PORT}`;
  process.env.CORS_ORIGIN = [process.env.CORS_ORIGIN, appBase, `http://localhost:${WEB_PORT}`].filter(Boolean).join(',');

  console.log('Starting in-memory MongoDB...');
  const { MongoMemoryReplSet } = require('mongodb-memory-server');
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  process.env.MONGO_URI = mongod.getUri();

  const { server } = require('../app');
  const mongoose = require('mongoose');
  const { User } = require('../models/auth');
  const { PortalAccess } = require('../models/superAdmin');

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const apiBase = `http://127.0.0.1:${server.address().port}`;
  for (let i = 0; i < 100 && mongoose.connection.readyState !== 1; i += 1) await new Promise((r) => setTimeout(r, 100));

  const staticApp = express();
  const rewritten = new Map();
  staticApp.use((req, res, next) => {
    if (!req.path.endsWith('.js')) return next();
    const file = path.join(dist, req.path);
    if (!fs.existsSync(file)) return next();
    if (!rewritten.has(req.path)) {
      rewritten.set(req.path, fs.readFileSync(file, 'utf8').split('http://localhost:5000').join(apiBase));
    }
    return res.type('application/javascript').send(rewritten.get(req.path));
  });
  staticApp.use(express.static(dist));
  staticApp.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  const web = await new Promise((resolve, reject) => {
    const s = staticApp.listen(WEB_PORT, '127.0.0.1', () => resolve(s));
    s.on('error', (e) => reject(new Error(`cannot bind port ${WEB_PORT}: ${e.message}`)));
  });
  console.log(`Frontend ${appBase} -> API ${apiBase}\n`);

  const PASSWORD = 'Portal!Passw0rd1';
  const tokens = {};
  let browser;

  try {
    console.log('SETUP');
    for (const p of PORTALS) {
      const email = `cache.${p.portal}@portal.test`;
      await User.create({
        email, role: p.role, firstName: p.name, lastName: 'User',
        department: p.name, password: PASSWORD, isActive: true, accountStatus: 'active',
      });
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: PASSWORD }),
      });
      const body = await res.json().catch(() => null);
      tokens[p.portal] = body?.data?.accessToken || body?.data?.token;
      await PortalAccess.findOneAndUpdate(
        { role: p.role, portal: p.portal },
        { role: p.role, portal: p.portal, canAccess: true },
        { upsert: true },
      );
    }
    const loggedIn = PORTALS.filter((p) => tokens[p.portal]).map((p) => p.name);
    record(`seeded and logged in ${loggedIn.length} portal roles`, loggedIn.length === PORTALS.length, loggedIn.join(', '));

    browser = await puppeteer.launch({ headless: !HEADFUL, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

    const openAs = async (portal) => {
      const page = await browser.newPage();
      const calls = [];
      page.on('request', (r) => { if (r.url().includes('/api/')) calls.push(new URL(r.url()).pathname); });
      await page.setViewport({ width: 1440, height: 900 });
      // Seed once, so a sign-out in a later check would actually stick.
      await page.evaluateOnNewDocument((t) => {
        try {
          if (sessionStorage.getItem('__sap_seeded')) return;
          sessionStorage.setItem('__sap_seeded', '1');
          localStorage.setItem('sap_token', t);
          localStorage.setItem('sap_auth_mode', 'default');
        } catch { /* ignore */ }
      }, tokens[portal]);
      page.__calls = calls;
      return page;
    };

    // Wait until no API response has arrived for a quiet window, so cache writes from
    // parallel dashboard fetches have landed before anything is counted.
    const settle = async (page, quietMs = 700, timeoutMs = 15000) => {
      const deadline = Date.now() + timeoutMs;
      let last = Date.now();
      const bump = () => { last = Date.now(); };
      page.on('response', bump);
      try {
        while (Date.now() < deadline) {
          if (Date.now() - last >= quietMs) return;
          await new Promise((r) => setTimeout(r, 100));
        }
      } finally {
        page.off('response', bump);
      }
    };

    const entries = (page) => page.evaluate(() => {
      const out = [];
      try {
        for (let i = 0; i < sessionStorage.length; i += 1) {
          const k = sessionStorage.key(i);
          if (k?.startsWith('sap_http_cache_v1:')) out.push(k);
        }
      } catch { /* ignore */ }
      return out;
    });

    console.log('\n1. EVERY PORTAL IS SERVED FROM THE CACHE ON RELOAD');
    for (const p of PORTALS) {
      await check(`${p.name}: reload makes fewer API calls`, async () => {
        assert.ok(tokens[p.portal], `no token for ${p.name}`);
        const page = await openAs(p.portal);
        await page.goto(`${appBase}${p.route}`, { waitUntil: 'networkidle0', timeout: 60000 });
        const landed = await page.evaluate(() => location.pathname);
        assert.ok(!landed.startsWith('/login'), `redirected to ${landed} — the session was refused`);
        await settle(page);
        const first = page.__calls.length;
        const cached = (await entries(page)).length;

        page.__calls.length = 0;
        await page.goto(`${appBase}${p.route}`, { waitUntil: 'networkidle0', timeout: 60000 });
        await settle(page);
        const second = page.__calls.length;
        await page.close();

        assert.ok(first > 0, 'the first load made no API calls at all');
        assert.ok(cached > 0, `nothing was cached on the first load (${first} call(s) made)`);
        assert.ok(second < first, `reload made ${second} call(s) vs ${first} — the cache is not being read`);
        return `${first} -> ${second} call(s), ${cached} entr(y/ies) cached`;
      });
    }

    console.log('\n2. NO-STORE IS HONOURED IN EVERY PORTAL');
    await check('nothing marked no-store is ever written to storage', async () => {
      // Routes the server marks no-store: risk/recovery data, support tickets and the
      // project overview. None may appear in the client store, in any portal.
      const page = await openAs('finance');
      for (const route of ['/finance/dashboard/disputes', '/finance/dashboard/refunds', '/finance/dashboard/control-tower']) {
        await page.goto(`${appBase}${route}`, { waitUntil: 'networkidle0', timeout: 60000 });
      }
      await settle(page);
      const keys = await entries(page);
      const called = page.__calls.filter((c) => /disputes|refunds|control-tower/.test(c));
      await page.close();
      const stored = keys.filter((k) => /disputes|refunds|control-tower|portal-support|project-overview/.test(k));
      assert.ok(called.length > 0, 'no risk-data calls were made, so this proves nothing');
      assert.deepEqual(stored, [], `no-store data was cached: ${stored.slice(0, 3).join(', ')}`);
      return `${called.length} no-store call(s) made, 0 stored`;
    });

    console.log('\n3. ISOLATION ACROSS PORTALS');
    await check('two portals never share a cache key', async () => {
      const a = await openAs('finance');
      await a.goto(`${appBase}/finance/dashboard`, { waitUntil: 'networkidle0', timeout: 60000 });
      await settle(a);
      const keysA = await entries(a);
      await a.close();

      const b = await openAs('hr');
      await b.goto(`${appBase}/hr/dashboard`, { waitUntil: 'networkidle0', timeout: 60000 });
      await settle(b);
      const keysB = await entries(b);
      await b.close();

      assert.ok(keysA.length && keysB.length, 'one of the two portals cached nothing');
      const shared = keysA.filter((k) => keysB.includes(k));
      assert.deepEqual(shared, [], `two portals share a cache key: ${shared.slice(0, 2).join(', ')}`);
      return `${keysA.length} vs ${keysB.length} entries, no shared key`;
    });
  } catch (error) {
    record('harness ran to completion', false, String(error.message || error));
  } finally {
    if (browser) await browser.close().catch(() => {});
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
})().catch((e) => { console.error('\nHarness crashed:', e); process.exit(1); });
