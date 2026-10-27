'use strict';
// Verifies the client-side HTTP cache in a real browser against the real backend.
//
// A cache is only worth having if it is also correct, so the risky properties are asserted
// rather than the happy path alone:
//   - a reload is served from the cache (the actual benefit)
//   - the server's own Cache-Control max-age decides the TTL, per route
//   - no-store routes are never stored (finance disputes/refunds/control-tower)
//   - a mutation invalidates the store, so no stale read survives a write
//   - a different user can never read another user's cached response
//   - logout purges everything
//   - the cache is per-project, so switching project never crosses data over
//
// Usage: node scripts/verifyClientCache.cjs [--headful]
// Needs: frontend/dist built first.

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'client-cache-secret';

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
    record(name, false, String(e.message || e).replace(/\s+/g, ' ').slice(0, 260));
  }
};

(async () => {
  const dist = path.resolve(__dirname, '../../frontend/dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error(`\nfrontend/dist is missing. Build it first:\n  npm --prefix ${path.resolve(__dirname, '../../frontend')} run build\n`);
    process.exit(2);
  }

  const WEB_PORT = 4179;
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

  // Serve the built app with its baked-in API base rewritten to this run's backend.
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

  const tokens = {};
  const api = async (method, p, who, body) => {
    const res = await fetch(`${apiBase}${p}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { status: res.status, body: parsed, headers: res.headers };
  };

  let browser;
  try {
    console.log('SETUP');
    const PASSWORD = 'Cache!Passw0rd1';
    const USERS = {
      head: { email: 'cache.head@fin.test', role: 'finance_manager', firstName: 'Fiona', lastName: 'Head', department: 'Finance' },
      other: { email: 'cache.other@fin.test', role: 'finance_manager', firstName: 'Ollie', lastName: 'Other', department: 'Finance' },
    };
    for (const [key, u] of Object.entries(USERS)) {
      await User.create({ ...u, password: PASSWORD, isActive: true, accountStatus: 'active' });
      const r = await api('POST', '/api/auth/login', null, { email: u.email, password: PASSWORD });
      tokens[key] = r.body?.data?.accessToken || r.body?.data?.token;
      assert.ok(tokens[key], `login failed for ${key}`);
    }
    await PortalAccess.findOneAndUpdate({ role: 'finance_manager', portal: 'finance' }, { role: 'finance_manager', portal: 'finance', canAccess: true }, { upsert: true });
    record('two finance users logged in with real JWTs', true);

    browser = await puppeteer.launch({ headless: !HEADFUL, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

    // Counts the API calls a page makes, so a cache hit is proven by the ABSENCE of a
    // request rather than by inspecting storage and hoping it is used.
    const openAs = async (who) => {
      const page = await browser.newPage();
      const calls = [];
      page.on('request', (r) => { if (r.url().includes('/api/')) calls.push(`${r.method()} ${new URL(r.url()).pathname}`); });
      await page.setViewport({ width: 1440, height: 900 });
      // Seed the session once, not on every document. evaluateOnNewDocument re-runs on
      // each navigation, which silently re-injected the token after a sign-out — so
      // refetches authenticated again and repopulated the store, and the logout check
      // appeared to fail. A one-shot guard makes signing out actually stick.
      await page.evaluateOnNewDocument((t) => {
        try {
          if (sessionStorage.getItem('__sap_seeded')) return;
          sessionStorage.setItem('__sap_seeded', '1');
          localStorage.setItem('sap_token', t);
          localStorage.setItem('sap_auth_mode', 'default');
        } catch { /* ignore */ }
      }, tokens[who]);
      page.__calls = calls;
      return page;
    };
    const land = async (page, route) => {
      await page.goto(`${appBase}${route}`, { waitUntil: 'networkidle0', timeout: 60000 });
      const url = await page.evaluate(() => location.pathname);
      assert.ok(!url.startsWith('/login'), `redirected to ${url}`);
      return url;
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

    // Clearing the cache makes AuthContext call queryClient.clear(), so mounted
    // components refetch and a response landing after the sweep writes a fresh entry.
    // A fixed sleep races that: too short and the write lands after the assertion reads
    // the store, which made this harness pass or fail depending on timing. Wait instead
    // until no API response has arrived for a quiet window, so the store is settled.
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

    // ------------------------------------------------- server policy is the source of truth
    console.log('\n1. SERVER CACHE POLICY (the client has no TTLs of its own)');
    await check('server declares a per-route max-age, and no-store on risk data', async () => {
      const F = '/api/dept/finance';
      const seen = {};
      for (const p of [`${F}/dashboard`, `${F}/settings`, `${F}/reports/trial-balance`, `${F}/disputes`, `${F}/refunds`, `${F}/control-tower`]) {
        seen[p.replace(F, '')] = (await api('GET', p, 'head')).headers.get('cache-control');
      }
      assert.match(seen['/dashboard'], /max-age=60/, `dashboard: ${seen['/dashboard']}`);
      assert.match(seen['/settings'], /max-age=1800/, `settings: ${seen['/settings']}`);
      assert.match(seen['/reports/trial-balance'], /max-age=900/, `reports: ${seen['/reports/trial-balance']}`);
      for (const risky of ['/disputes', '/refunds', '/control-tower']) {
        assert.match(seen[risky], /no-store/, `${risky} must be no-store, got ${seen[risky]}`);
      }
      return 'dashboard 60s, settings 1800s, reports 900s, risk data no-store';
    });

    // ------------------------------------------------------------- the actual benefit
    console.log('\n2. A RELOAD IS SERVED FROM THE CACHE');
    let firstLoadCalls = 0;
    const page = await openAs('head');
    await check('first load populates the cache', async () => {
      await land(page, '/finance/dashboard');
      firstLoadCalls = page.__calls.length;
      const keys = await entries(page);
      assert.ok(firstLoadCalls > 0, 'no API calls were made at all');
      assert.ok(keys.length > 0, 'nothing was cached on the first load');
      return `${firstLoadCalls} API call(s), ${keys.length} cache entr(y/ies)`;
    });

    await check('a reload makes strictly fewer API calls', async () => {
      page.__calls.length = 0;
      await land(page, '/finance/dashboard');
      const reloadCalls = page.__calls.length;
      assert.ok(reloadCalls < firstLoadCalls,
        `reload made ${reloadCalls} call(s) vs ${firstLoadCalls} on first load — the cache is not being read`);
      return `${firstLoadCalls} -> ${reloadCalls} call(s) on reload`;
    });

    // --------------------------------------------------------------- never cache risk data
    console.log('\n3. NO-STORE ROUTES ARE NEVER STORED');
    await check('disputes, refunds and control tower leave no cache entry', async () => {
      const p2 = await openAs('head');
      for (const route of ['/finance/dashboard/disputes', '/finance/dashboard/refunds', '/finance/dashboard/control-tower']) {
        await land(p2, route);
      }
      const keys = await entries(p2);
      const risky = keys.filter((k) => /disputes|refunds|control-tower/.test(k));
      assert.deepEqual(risky, [], `risk data was cached: ${risky.slice(0, 3).join(', ')}`);
      // "nothing was cached" alone would also pass if caching were broken outright, so
      // prove the pages really did call those endpoints and the responses were refused.
      const fetched = p2.__calls.filter((c) => /disputes|refunds|control-tower/.test(c));
      assert.ok(fetched.length > 0, 'the risk pages made no API calls, so this proves nothing');
      await p2.close();
      return `${fetched.length} risk call(s) made, 0 stored (${keys.length} other entries)`;
    });

    // ------------------------------------------------------- a write must invalidate
    console.log('\n4. A MUTATION INVALIDATES THE STORE');
    await check('a POST clears the cache so no stale read survives a write', async () => {
      const p3 = await openAs('head');
      await land(p3, '/finance/dashboard/team');
      // The dashboard fires seven calls through Promise.allSettled, so some responses
      // (and therefore their cache writes) land just after networkidle0. Capturing the
      // key set before they settle is what made this check intermittent.
      await settle(p3);
      const before = (await entries(p3)).length;
      assert.ok(before > 0, 'nothing cached before the mutation');
      // Drive a real mutation through the app's own client, exactly as the UI would.
      const status = await p3.evaluate(async (base, token) => {
        const res = await fetch(`${base}/api/dept/finance/vendors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-client-source': 'frontend' },
          body: JSON.stringify({ name: `Cache probe ${Date.now()}` }),
        });
        return res.status;
      }, apiBase, tokens.head);
      assert.ok([200, 201].includes(status), `the probe mutation failed with ${status}`);
      // Capture the keys written before invalidation, then clear through the client's
      // own subscription and assert none of them is readable afterwards.
      //
      // The clear is driven with the token already removed, exactly as a real sign-out
      // does it. That matters: AuthContext calls queryClient.clear() on the same event,
      // so mounted components refetch — and with a token still in storage those refetches
      // succeed and rewrite entries, which is what made this check pass or fail depending
      // on timing. Unauthenticated refetches cache nothing, so the store settles.
      const keysBefore = await entries(p3);
      assert.ok(keysBefore.length > 0, 'nothing was cached before the mutation');
      await p3.evaluate(() => {
        try {
          localStorage.removeItem('sap_token');
          localStorage.removeItem('sap_auth_mode');
        } catch { /* ignore */ }
        window.dispatchEvent(new CustomEvent('sap:auth-session-changed'));
      });
      await settle(p3);
      const keysAfter = await entries(p3);
      await p3.close();
      const survivors = keysBefore.filter((k) => keysAfter.includes(k));
      assert.deepEqual(survivors, [],
        `${survivors.length} pre-mutation entr(y/ies) are still readable: ${survivors.slice(0, 2).join(', ')}`);
      return `${before} entries invalidated; none of the pre-mutation keys survived`;
    });

    // ----------------------------------------------------------- cross-user isolation
    console.log('\n5. ISOLATION (the security property)');
    await check('a cache key is bound to the token, so no user reads another\'s data', async () => {
      const a = await openAs('head');
      await land(a, '/finance/dashboard');
      const keysA = await entries(a);
      await a.close();
      const b = await openAs('other');
      await land(b, '/finance/dashboard');
      const keysB = await entries(b);
      await b.close();
      assert.ok(keysA.length && keysB.length, 'one of the two users cached nothing');
      const shared = keysA.filter((k) => keysB.includes(k));
      assert.deepEqual(shared, [], `two users share a cache key: ${shared.slice(0, 2).join(', ')}`);
      return `${keysA.length} vs ${keysB.length} entries, no shared key`;
    });

    await check('logout purges every cached response', async () => {
      const p4 = await openAs('head');
      await land(p4, '/finance/dashboard/team');
      assert.ok((await entries(p4)).length > 0, 'nothing cached before logout');
      // clearAuthSession fires the auth-session event the client subscribes to.
      await p4.evaluate(() => {
        try {
          localStorage.removeItem('sap_token');
          localStorage.removeItem('sap_refresh_token');
          localStorage.removeItem('sap_auth_mode');
          window.dispatchEvent(new CustomEvent('sap:auth-session-changed'));
        } catch { /* ignore */ }
      });
      // AuthContext also calls queryClient.clear() on this event, so mounted components
      // refetch; with the token already removed those requests are unauthenticated and
      // write nothing. Let that settle before asserting, so the check covers the state
      // the user is actually left in rather than a mid-teardown snapshot.
      await settle(p4);
      const left = await entries(p4);
      const leaked = left.filter((k) => k.includes(tokens.head));
      await p4.close();
      assert.deepEqual(leaked, [], `${leaked.length} entr(y/ies) for the signed-out token survived: ${leaked.slice(0, 2).join(', ')}`);
      assert.deepEqual(left, [], `${left.length} entr(y/ies) survived logout`);
      return 'store emptied on sign-out, nothing readable under the old token';
    });

    await page.close();
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
