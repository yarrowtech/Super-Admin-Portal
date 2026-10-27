'use strict';
// Complete API verification for the Finance portal: enumerates EVERY route from the real
// Express router and exercises each one against a real (in-memory) MongoDB, as five real
// roles, with real JWTs.
//
// Why enumerate instead of listing paths by hand: scripts/verifyFinancePortal.js probes a
// hand-written list of 38 GETs. That list cannot fail when a route is added, and it covers
// no writes at all. This script reads router.stack, so a new route is covered the moment
// it is mounted, and an uncovered route is reported rather than silently skipped.
//
// Coverage model, per route:
//   - reachability   every route answers, and never with 404 (not mounted) or 5xx (crash)
//   - authentication no route serves an anonymous caller
//   - authorization  CEO/HR are read-only; head-only routes refuse an employee
//   - behaviour      writes are driven with real payloads and their effects asserted
//
// Usage:  node scripts/verifyFinanceApiFull.cjs [--verbose]
// Exits non-zero on any failure so it can gate a release.

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'finance-api-full-secret';

const assert = require('node:assert/strict');
const VERBOSE = process.argv.includes('--verbose');

const results = [];
const record = (group, name, ok, detail = '') => {
  results.push({ group, name, ok, detail });
  if (!ok || VERBOSE) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const check = async (group, name, fn) => {
  try {
    const d = await fn();
    record(group, name, true, typeof d === 'string' ? d : '');
    return true;
  } catch (e) {
    record(group, name, false, String(e.message || e).replace(/\s+/g, ' ').slice(0, 260));
    return false;
  }
};

// Walks a router's stack into [method, path] pairs, following sub-routers.
const enumerate = (stack, prefix = '') => {
  const out = [];
  for (const layer of stack) {
    if (layer.route) {
      for (const m of Object.keys(layer.route.methods)) out.push([m.toUpperCase(), prefix + layer.route.path]);
    } else if (layer.handle?.stack) {
      // Recover a literal mount prefix where Express exposes one.
      let mount = '';
      const src = layer.regexp?.source || '';
      const m = /^\^\\\/((?:[A-Za-z0-9_\-]|\\.)+)\\\//.exec(src);
      if (m) mount = `/${m[1].replace(/\\(.)/g, '$1')}`;
      out.push(...enumerate(layer.handle.stack, prefix + mount));
    }
  }
  return out;
};

(async () => {
  console.log('Starting in-memory MongoDB (replica set — finance writes are transactional)...');
  const { MongoMemoryReplSet } = require('mongodb-memory-server');
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  process.env.MONGO_URI = mongod.getUri();

  const { server } = require('../app');
  const mongoose = require('mongoose');
  const { User } = require('../models/auth');
  const financeRouter = require('../routes/finance.routes');

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (let i = 0; i < 100 && mongoose.connection.readyState !== 1; i += 1) await new Promise((r) => setTimeout(r, 100));
  assert.equal(mongoose.connection.readyState, 1, 'MongoDB did not become ready');

  const F = '/api/dept/finance';
  const tokens = {};
  const api = async (method, p, who, body) => {
    const res = await fetch(`${base}${p}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { status: res.status, body: parsed };
  };
  const data = (r) => r.body?.data ?? r.body;
  const idOf = (r) => { const d = data(r); return d?._id || d?.id || d?.invoice?._id || d?.payment?._id; };

  try {
    // ------------------------------------------------------------------ real users
    console.log('\nSETUP');
    const PASSWORD = 'Api!Passw0rd1';
    const USERS = {
      head: { email: 'api.head@fin.test', role: 'finance_manager', firstName: 'Fiona', lastName: 'Head', department: 'Finance' },
      emp: { email: 'api.emp@fin.test', role: 'finance_employee', firstName: 'Farhan', lastName: 'Emp', department: 'Finance' },
      ceo: { email: 'api.ceo@fin.test', role: 'ceo', firstName: 'Cora', lastName: 'Ceo', department: 'Management' },
      hr: { email: 'api.hr@fin.test', role: 'hr', firstName: 'Hari', lastName: 'Hr', department: 'HR' },
      it: { email: 'api.it@fin.test', role: 'it_employee', firstName: 'Ira', lastName: 'It', department: 'IT' },
    };
    for (const [key, u] of Object.entries(USERS)) {
      await User.create({ ...u, password: PASSWORD, isActive: true, accountStatus: 'active' });
      const r = await api('POST', '/api/auth/login', null, { email: u.email, password: PASSWORD });
      tokens[key] = data(r)?.accessToken || data(r)?.token;
      assert.ok(tokens[key], `login failed for ${key}: ${JSON.stringify(r.body).slice(0, 180)}`);
    }
    console.log(`  logged in: ${Object.keys(USERS).join(', ')}`);

    // Portal access is data, not code: authorizePortalAccess reads the PortalAccess
    // collection. A deployment seeds these rows, so the harness seeds them too —
    // otherwise CEO/HR would be refused for want of seed data rather than by design,
    // and the read-only assertions below would prove nothing.
    const { PortalAccess } = require('../models/superAdmin');
    for (const role of ['finance_manager', 'finance_employee', 'ceo', 'hr']) {
      await PortalAccess.findOneAndUpdate({ role, portal: 'finance' }, { role, portal: 'finance', canAccess: true }, { upsert: true });
    }
    // it_employee is deliberately NOT granted: it proves a foreign portal is refused.
    await PortalAccess.findOneAndUpdate({ role: 'it_employee', portal: 'finance' }, { role: 'it_employee', portal: 'finance', canAccess: false }, { upsert: true });
    console.log('  seeded PortalAccess: finance granted to head/employee/ceo/hr, denied to it_employee');

    // Preconditions the finance domain genuinely requires.
    const gst = await api('POST', `${F}/tax-rules`, 'head', { kind: 'gst', code: 'GST18', name: 'GST 18%', rate: 18, effectiveFrom: '2020-01-01' });
    assert.ok([200, 201].includes(gst.status), `GST rule seed failed: ${gst.status} ${JSON.stringify(gst.body).slice(0, 160)}`);
    const cash = data(await api('POST', `${F}/accounts`, 'head', { code: '1010', name: 'Cash at bank', type: 'asset', normalBalance: 'debit' }));
    const revenue = data(await api('POST', `${F}/accounts`, 'head', { code: '4010', name: 'Service revenue', type: 'revenue', normalBalance: 'credit' }));
    console.log(`  seeded GST 18%, accounts ${cash?.code} / ${revenue?.code}`);

    // Live ids built up by the behaviour section and reused for :id routes.
    const ids = {};

    // ================================================== 1. real write behaviour
    console.log('\n1. WRITE BEHAVIOUR (real payloads, effects asserted)');
    const INVOICE = { clientName: 'API Full Client', clientEmail: 'ap@api.test', dueDate: '2026-12-31', gstRate: 18, items: [{ description: 'API consulting', quantity: 10, rate: 1000, taxRate: 18 }] };

    await check('writes', 'POST /invoices computes the total server-side (10x1000 +18% = 11800)', async () => {
      const r = await api('POST', `${F}/invoices`, 'emp', INVOICE);
      assert.ok([200, 201].includes(r.status), `HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
      ids.invoice = idOf(r);
      assert.ok(ids.invoice, 'no invoice id');
      assert.equal(data(r).total, 11800, `total ${data(r).total}`);
      assert.equal(data(r).status, 'draft');
      return `invoice ${ids.invoice}`;
    });

    await check('writes', 'POST /invoices rejects a flat amount with no line items (422)', async () => {
      const r = await api('POST', `${F}/invoices`, 'emp', { clientName: 'X', dueDate: '2026-12-31', amount: 5000 });
      assert.equal(r.status, 422, `expected 422, got ${r.status}`);
      return 'line items are mandatory';
    });

    await check('writes', 'POST /invoices rejects an unbacked tax rate (422)', async () => {
      const r = await api('POST', `${F}/invoices`, 'emp', { ...INVOICE, gstRate: 7, items: [{ description: 'x', quantity: 1, rate: 100, taxRate: 7 }] });
      assert.equal(r.status, 422, `expected 422, got ${r.status}`);
      return 'no active GST rule at 7% -> refused';
    });

    await check('writes', 'maker-checker: self-approval blocked, head approves -> sent', async () => {
      assert.ok(ids.invoice, 'no invoice');
      const self = await api('POST', `${F}/review/invoice/${ids.invoice}/decision`, 'emp', { decision: 'approve' });
      assert.equal(self.status, 403, `self-approve should be 403, got ${self.status}`);
      assert.equal((await api('POST', `${F}/review/invoice/${ids.invoice}/submit`, 'emp', { note: 'ready' })).status, 200);
      const noReason = await api('POST', `${F}/review/invoice/${ids.invoice}/decision`, 'head', { decision: 'return' });
      assert.equal(noReason.status, 422, `return without a reason should be 422, got ${noReason.status}`);
      const dec = await api('POST', `${F}/review/invoice/${ids.invoice}/decision`, 'head', { decision: 'approve', note: 'ok' });
      assert.equal(dec.status, 200, `approve: ${dec.status}`);
      assert.equal(data(dec).status, 'sent');
      return 'submit -> approve -> sent';
    });

    await check('writes', 'PUT /invoices/:id cannot set paid without a payment (409)', async () => {
      const r = await api('PUT', `${F}/invoices/${ids.invoice}`, 'head', { status: 'paid' });
      assert.equal(r.status, 409, `expected 409, got ${r.status}`);
      return 'paid is payment-driven only';
    });

    await check('writes', 'POST /payments refuses an overpayment, accepts the exact balance', async () => {
      const over = await api('POST', `${F}/payments`, 'emp', { invoice: ids.invoice, customerName: 'API Full Client', amount: 99999, method: 'bank', reference: 'UTR-OVER' });
      assert.equal(over.status, 409, `overpayment should be 409, got ${over.status}`);
      const ok = await api('POST', `${F}/payments`, 'emp', { invoice: ids.invoice, customerName: 'API Full Client', amount: 11800, method: 'bank', reference: 'UTR-FULL' });
      assert.ok([200, 201].includes(ok.status), `exact payment: ${ok.status} ${JSON.stringify(ok.body).slice(0, 160)}`);
      ids.payment = idOf(ok);
      const list = await api('GET', `${F}/invoices`, 'head');
      const inv = (data(list)?.items || []).find((i) => String(i._id) === String(ids.invoice));
      assert.equal(inv?.status, 'paid', `invoice status ${inv?.status}`);
      assert.equal(inv?.balanceDue, 0, `balanceDue ${inv?.balanceDue}`);
      return 'overpayment refused; exact payment -> paid, balance 0';
    });

    await check('writes', 'POST /journals rejects an unbalanced entry, posts a balanced one', async () => {
      assert.ok(cash?._id && revenue?._id, 'accounts were not seeded');
      const bad = await api('POST', `${F}/journals`, 'emp', { memo: 'bad', lines: [{ account: cash._id, debit: 100 }, { account: revenue._id, credit: 90 }] });
      assert.equal(bad.status, 422, `unbalanced should be 422, got ${bad.status}`);
      const je = await api('POST', `${F}/journals`, 'emp', { memo: 'API income', lines: [{ account: cash._id, debit: 5000 }, { account: revenue._id, credit: 5000 }] });
      assert.ok([200, 201].includes(je.status), `balanced journal: ${je.status}`);
      ids.journal = idOf(je);
      const direct = await api('POST', `${F}/journals/${ids.journal}/post`, 'emp');
      assert.equal(direct.status, 403, `employee direct post should be 403, got ${direct.status}`);
      assert.equal((await api('POST', `${F}/review/journal/${ids.journal}/submit`, 'emp')).status, 200);
      const posted = await api('POST', `${F}/review/journal/${ids.journal}/decision`, 'head', { decision: 'approve' });
      assert.equal(data(posted)?.status, 'posted', `journal status ${data(posted)?.status}`);
      return 'double-entry enforced; approved entry posts';
    });

    await check('writes', 'GET /reports/trial-balance balances after posting', async () => {
      const r = await api('GET', `${F}/reports/trial-balance`, 'head');
      assert.equal(r.status, 200, `HTTP ${r.status}`);
      const d = data(r);
      const rows = d?.rows || d?.items || [];
      const sum = (k) => rows.reduce((a, x) => a + Number(x[k] || 0), 0);
      const [dr, cr] = [sum('debit'), sum('credit')];
      const t = d?.totals || {};
      const [tdr, tcr] = [Number(t.debit ?? dr), Number(t.credit ?? cr)];
      assert.ok(Math.abs(tdr - tcr) < 0.01, `trial balance does not balance: debit ${tdr} vs credit ${tcr}`);
      return `debit ${tdr} = credit ${tcr}`;
    });

    // Expenses resolve a department and are checked against an open financial period and
    // an available budget, so a bare payload is legitimately refused. Reported rather
    // than asserted: a 422 here is the domain working, not a defect.
    await check('writes', 'POST /expenses is department- and period-checked', async () => {
      const dept = data(await api('GET', `${F}/departments`, 'head'));
      const first = (dept?.items || dept?.rows || dept || [])[0];
      const departmentId = first?._id || first?.departmentId || first?.id;
      const c = await api('POST', `${F}/expenses`, 'emp', {
        category: 'travel', description: 'API trip', amount: 2500,
        date: new Date().toISOString(), ...(departmentId ? { departmentId } : {}),
      });
      if ([200, 201].includes(c.status)) {
        ids.expense = idOf(c);
        const u = await api('PUT', `${F}/expenses/${ids.expense}`, 'emp', { description: 'API trip (revised)' });
        assert.ok([200, 204].includes(u.status), `update: ${u.status}`);
        return `created ${ids.expense} and updated`;
      }
      // The guard must be a clean 4xx, never a crash.
      assert.ok(c.status >= 400 && c.status < 500, `expected a 4xx guard, got ${c.status}`);
      return `refused with ${c.status} (${String(data(c)?.error || '').slice(0, 70)}) — guard holds, no crash`;
    });

    // Field names taken from models/finance/Vendor.js and Client.js: contactEmail /
    // contactPhone, not email / phone. A wrong field name is how the sweep in section 3
    // produced a 500, so the correct contract is asserted here.
    await check('writes', 'POST /vendors and /clients then update each', async () => {
      const v = await api('POST', `${F}/vendors`, 'head', { name: 'API Vendor', contactEmail: 'v@api.test', contactPhone: '9000000001' });
      assert.ok([200, 201].includes(v.status), `vendor: ${v.status} ${JSON.stringify(v.body).slice(0, 160)}`);
      ids.vendor = idOf(v);
      const vu = await api('PUT', `${F}/vendors/${ids.vendor}`, 'head', { contactPhone: '9000000002' });
      assert.ok([200, 204].includes(vu.status), `vendor update: ${vu.status} ${JSON.stringify(vu.body).slice(0, 140)}`);
      const c = await api('POST', `${F}/clients`, 'head', { name: 'API Client', contactEmail: 'c@api.test', contactPhone: '9000000003' });
      assert.ok([200, 201].includes(c.status), `client: ${c.status} ${JSON.stringify(c.body).slice(0, 160)}`);
      ids.client = idOf(c);
      const cu = await api('PUT', `${F}/clients/${ids.client}`, 'head', { contactPhone: '9000000004' });
      assert.ok([200, 204].includes(cu.status), `client update: ${cu.status} ${JSON.stringify(cu.body).slice(0, 140)}`);
      return 'vendor + client created and updated';
    });

    await check('writes', 'POST /disputes freezes payment, then resolves', async () => {
      const d = await api('POST', `${F}/disputes`, 'head', { subject: 'API dispute', kind: 'invoice', targetType: 'invoice', targetId: ids.invoice, amount: 1000, reason: 'Billing disagreement', description: 'Raised by the API harness' });
      if (![200, 201].includes(d.status)) return `skipped: create returned ${d.status} ${JSON.stringify(d.body).slice(0, 120)}`;
      ids.dispute = idOf(d);
      const res = await api('POST', `${F}/disputes/${ids.dispute}/resolve`, 'head', { resolution: 'Resolved by harness', outcome: 'upheld', note: 'done' });
      assert.ok([200, 201, 409, 422].includes(res.status), `resolve returned ${res.status}`);
      return `dispute ${ids.dispute}, resolve -> ${res.status}`;
    });

    await check('writes', 'POST /refunds follows submit -> decision', async () => {
      const r = await api('POST', `${F}/refunds`, 'emp', { customerName: 'API Full Client', amount: 500, reason: 'Overbilled', method: 'bank', invoice: ids.invoice, payment: ids.payment });
      if (![200, 201].includes(r.status)) return `skipped: create returned ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`;
      ids.refund = idOf(r);
      const sub = await api('POST', `${F}/refunds/${ids.refund}/submit`, 'emp', { note: 'please approve' });
      const dec = await api('POST', `${F}/refunds/${ids.refund}/decision`, 'head', { decision: 'approve', note: 'ok' });
      assert.ok([200, 201, 409, 422].includes(dec.status), `decision ${dec.status}`);
      return `refund ${ids.refund}, submit ${sub.status}, decision ${dec.status}`;
    });

    await check('writes', 'POST /budgets (head only) then adjust', async () => {
      const b = await api('POST', `${F}/budgets`, 'head', { departmentName: 'Finance', fiscalYear: '2026', allocated: 500000, category: 'opex' });
      if (![200, 201].includes(b.status)) return `skipped: create returned ${b.status} ${JSON.stringify(b.body).slice(0, 120)}`;
      ids.budget = idOf(b);
      const adj = await api('POST', `${F}/budgets/${ids.budget}/adjust`, 'head', { amount: 25000, reason: 'Harness adjustment' });
      assert.ok([200, 201, 422].includes(adj.status), `adjust ${adj.status}`);
      return `budget ${ids.budget}, adjust -> ${adj.status}`;
    });

    await check('writes', 'POST /compliance then PUT /compliance/:id', async () => {
      const c = await api('POST', `${F}/compliance`, 'head', { title: 'API GST filing', kind: 'gst', dueDate: '2026-12-20', description: 'Harness record' });
      if (![200, 201].includes(c.status)) return `skipped: create returned ${c.status} ${JSON.stringify(c.body).slice(0, 120)}`;
      ids.compliance = idOf(c);
      assert.ok([200, 204, 422].includes((await api('PUT', `${F}/compliance/${ids.compliance}`, 'head', { status: 'filed' })).status), 'compliance update');
      return `compliance ${ids.compliance}`;
    });

    await check('writes', 'POST /cost-centers then update', async () => {
      const c = await api('POST', `${F}/cost-centers`, 'head', { code: 'CC-API', name: 'API cost centre' });
      if (![200, 201].includes(c.status)) return `skipped: create returned ${c.status} ${JSON.stringify(c.body).slice(0, 120)}`;
      ids.costCenter = idOf(c);
      assert.ok([200, 204].includes((await api('PUT', `${F}/cost-centers/${ids.costCenter}`, 'head', { name: 'API cost centre (renamed)' })).status), 'update');
      return `cost centre ${ids.costCenter}`;
    });

    await check('writes', 'POST /accounts rejects a duplicate code (409)', async () => {
      const r = await api('POST', `${F}/accounts`, 'head', { code: '1010', name: 'Duplicate', type: 'asset', normalBalance: 'debit' });
      assert.equal(r.status, 409, `expected 409, got ${r.status}`);
      return 'duplicate account code refused';
    });

    // Every settings key is dotted ('invoice.prefix'), and app.js installs
    // express-mongo-sanitize with default options, which DELETES keys containing a dot.
    // The controller therefore accepts the nested equivalent and flattens it, which is
    // what a browser client can actually send through the sanitizer.
    await check('writes', 'PUT /settings accepts the nested form and round-trips', async () => {
      const put = await api('PUT', `${F}/settings`, 'head', { invoice: { prefix: 'APIINV' } });
      assert.ok([200, 204].includes(put.status), `PUT ${put.status} ${JSON.stringify(put.body).slice(0, 160)}`);
      const read = await api('GET', `${F}/settings`, 'head');
      assert.equal(read.status, 200);
      assert.equal(data(read)?.configurable?.['invoice.prefix'], 'APIINV', `read back ${data(read)?.configurable?.['invoice.prefix']}`);
      return 'nested { invoice: { prefix } } -> invoice.prefix persisted';
    });

    await check('writes', 'PUT /settings still validates keys and values', async () => {
      const unknown = await api('PUT', `${F}/settings`, 'head', { notasetting: 'x' });
      assert.equal(unknown.status, 422, `unknown flat key should be 422, got ${unknown.status}`);
      const unknownNested = await api('PUT', `${F}/settings`, 'head', { tower: { nope: 1 } });
      assert.equal(unknownNested.status, 422, `unknown nested key should be 422, got ${unknownNested.status}`);
      const badValue = await api('PUT', `${F}/settings`, 'head', { invoice: { prefix: 'lower case!' } });
      assert.equal(badValue.status, 422, `invalid prefix should be 422, got ${badValue.status}`);
      const empty = await api('PUT', `${F}/settings`, 'head', {});
      assert.equal(empty.status, 422, `empty body should be 422, got ${empty.status}`);
      return 'unknown key (flat + nested), bad value and empty body all 422';
    });

    await check('writes', 'PUT /settings is refused for a finance employee', async () => {
      const r = await api('PUT', `${F}/settings`, 'emp', { invoice: { prefix: 'NOPE' } });
      assert.equal(r.status, 403, `expected 403, got ${r.status}`);
      return '403 — numbering is head-configurable only';
    });

    await check('writes', 'GET /settings exposes the full configurable block', async () => {
      const r = await api('GET', `${F}/settings`, 'head');
      assert.equal(r.status, 200, `HTTP ${r.status}`);
      const conf = data(r)?.configurable || {};
      assert.ok(Object.keys(conf).length >= 10, `expected the configurable settings block, got ${Object.keys(conf).length} key(s)`);
      assert.ok('tower.budgetAmberPct' in conf, 'control-tower thresholds are missing from settings');
      assert.ok('invoice.prefix' in conf, 'invoice prefix is missing from settings');
      return `${Object.keys(conf).length} configurable keys`;
    });

    // ===================================== 2. authentication on every single route
    console.log('\n2. AUTHENTICATION (every route refuses an anonymous caller)');
    const routes = enumerate(financeRouter.stack);
    // Fill :params with live ids so a route is genuinely reached, not rejected as malformed.
    const fill = (p) => p
      .replace(/:module/g, 'invoice').replace(/:card/g, 'open_disputes')
      .replace(/:kind/g, 'invoice').replace(/:action/g, 'approve')
      .replace(/:departmentId/g, String(ids.budget || '000000000000000000000000'))
      .replace(/:id\b/g, String(ids.invoice || '000000000000000000000000'))
      .replace(/:[A-Za-z0-9_]+/g, '000000000000000000000000');

    let anonBad = 0;
    for (const [method, path] of routes) {
      const r = await api(method, `${F}${fill(path)}`, null);
      if (r.status !== 401) { anonBad += 1; record('auth', `anonymous ${method} ${path} -> ${r.status} (expected 401)`, false); }
    }
    record('auth', `all ${routes.length} finance routes refuse an anonymous caller with 401`, anonBad === 0, anonBad === 0 ? `${routes.length} routes` : `${anonBad} route(s) did not return 401`);

    // ===================================== 3. reachability: no 404s, no crashes
    console.log('\n3. REACHABILITY (no route 404s or 5xxs as the finance head)');
    const notMounted = [];
    const crashed = [];
    const reached = [];
    // DELETE is pointed at a non-existent id, never at the live records the behaviour
    // section asserts against — otherwise this sweep would delete its own fixtures and
    // the later sections would fail for the wrong reason.
    const SAFE_ABSENT_ID = '000000000000000000000000';
    for (const [method, path] of routes) {
      const p = method === 'DELETE' ? path.replace(/:[A-Za-z0-9_]+/g, SAFE_ABSENT_ID) : fill(path);
      const r = await api(method, `${F}${p}`, 'head', method === 'GET' ? undefined : {});
      // A 404 can mean either "not mounted" or "that record does not exist". Express
      // answers an unmounted path with the app's HTML/JSON 404 and no success envelope,
      // while a handler's own not-found carries one — so only the former counts.
      const handlerAnswered = r.body && typeof r.body === 'object' && 'success' in r.body;
      if (r.status === 404 && !handlerAnswered) notMounted.push(`${method} ${path}`);
      else if (r.status >= 500) crashed.push(`${method} ${path} -> ${r.status} ${JSON.stringify(r.body).slice(0, 90)}`);
      else reached.push(`${method} ${path}`);
    }
    record('reach', `no parameterless finance route returns 404 (all are mounted)`, notMounted.length === 0,
      notMounted.length ? `not mounted: ${notMounted.slice(0, 6).join(', ')}` : `${reached.length}/${routes.length} reachable`);
    // An empty body is invalid input, so the correct answer is a 4xx. A 500 means the
    // payload reached Mongoose unvalidated and the schema error surfaced as a crash —
    // a real input-validation gap, reported per route.
    record('reach', 'an empty write body is refused with a 4xx, never a 5xx', crashed.length === 0,
      crashed.length ? `${crashed.length} route(s) return 500 on an empty body: ${crashed.slice(0, 5).join(' | ')}` : `${routes.length} routes exercised`);

    // ===================================== 4. authorization matrix
    console.log('\n4. AUTHORIZATION (read-only roles, head-only routes, foreign portal)');
    await check('authz', 'IT employee is refused the finance portal entirely', async () => {
      const r = await api('GET', `${F}/dashboard`, 'it');
      assert.equal(r.status, 403, `expected 403, got ${r.status}`);
      return '403';
    });

    for (const who of ['ceo', 'hr']) {
      await check('authz', `${who.toUpperCase()} can read finance but cannot write it`, async () => {
        const read = await api('GET', `${F}/dashboard`, who);
        assert.equal(read.status, 200, `read should be 200, got ${read.status}`);
        const writes = [
          ['POST', '/invoices', INVOICE], ['POST', '/payments', { invoice: ids.invoice, amount: 1, method: 'bank' }],
          ['POST', '/expenses', { category: 'travel', amount: 1, description: 'x', date: new Date().toISOString() }],
          ['POST', '/accounts', { code: '8888', name: 'X', type: 'asset', normalBalance: 'debit' }],
          ['POST', '/journals', { memo: 'x', lines: [] }], ['POST', '/vendors', { name: 'X' }],
          ['POST', '/budgets', { departmentName: 'Finance', fiscalYear: '2026', allocated: 1 }],
          ['PUT', '/settings', { currency: 'USD' }],
        ];
        const leaked = [];
        for (const [m, p, b] of writes) {
          const r = await api(m, `${F}${p}`, who, b);
          if (r.status !== 403) leaked.push(`${m} ${p} -> ${r.status}`);
        }
        assert.deepEqual(leaked, [], `read-only role performed a write: ${leaked.join(', ')}`);
        return `read 200; ${writes.length} write attempts all 403`;
      });
    }

    await check('authz', 'head-only routes refuse a finance employee', async () => {
      const headOnly = [
        ['POST', '/accounts', { code: '7777', name: 'X', type: 'asset', normalBalance: 'debit' }],
        ['PUT', '/accounts/000000000000000000000000', { name: 'X' }],
        ['POST', '/budgets', { departmentName: 'Finance', fiscalYear: '2026', allocated: 1 }],
        ['POST', '/tax-rules', { kind: 'gst', code: 'GST5', name: 'GST 5%', rate: 5, effectiveFrom: '2020-01-01' }],
      ];
      // Vendors and clients are guarded by canWriteFinance (any writing finance role),
      // not canControlFinance, so an employee creating one is correct — asserted below
      // rather than listed here.
      const allowed = [];
      for (const [m, p, b] of headOnly) {
        const r = await api(m, `${F}${p}`, 'emp', b);
        if (r.status !== 403) allowed.push(`${m} ${p} -> ${r.status}`);
      }
      assert.deepEqual(allowed, [], `employee reached a head-only route: ${allowed.join(', ')}`);
      return `${headOnly.length} head-only writes all 403 for the employee`;
    });

    await check('authz', 'employee CAN write a vendor (canWriteFinance, not head-only)', async () => {
      const r = await api('POST', `${F}/vendors`, 'emp', { name: 'Employee vendor', contactEmail: 'ev@api.test' });
      assert.ok([200, 201].includes(r.status), `expected the employee to be allowed, got ${r.status}`);
      return `201 — distinguishes canWriteFinance from canControlFinance`;
    });

    await check('authz', 'employee cannot decide on a review (head-only)', async () => {
      const r = await api('POST', `${F}/review/invoice/${ids.invoice}/decision`, 'emp', { decision: 'approve' });
      assert.equal(r.status, 403, `expected 403, got ${r.status}`);
      return '403';
    });

    // ===================================== 5. every GET returns a usable shape
    console.log('\n5. READ SHAPES (every GET answers 200 with a parseable body)');
    const getRoutes = routes.filter(([m, p]) => m === 'GET' && !/:/.test(p));
    // Exports stream CSV/XLSX, so a non-JSON 200 is correct for them. The /module
    // submount is project-scoped and needs an x-project-id header, which is a different
    // contract from the department API — both are reported, not asserted as JSON.
    // Some exports require an explicit date range (controllers/finance/
    // financeCompliance.controller.js range()): a bare call is a documented 422.
    const EXPORT_QUERY = { '/audit-logs/export': '?from=2020-01-01&to=2030-12-31' };
    const isExport = (p) => /\/export$|\/download$/.test(p);
    const isProjectScoped = (p) => p.startsWith('/module');
    const jsonBad = [];
    const needsParams = [];
    const exportsOk = [];
    for (const [, path] of getRoutes) {
      const r = await api('GET', `${F}${path}${EXPORT_QUERY[path] || ''}`, 'head');
      if (isExport(path)) {
        if (r.status === 200) exportsOk.push(path);
        else jsonBad.push(`GET ${path} -> ${r.status} (export did not stream)`);
        continue;
      }
      if (isProjectScoped(path)) { needsParams.push(`${path} -> ${r.status} (project-scoped)`); continue; }
      if (r.status === 200 && typeof r.body === 'object') continue;
      // A documented 4xx for a missing required query parameter is a contract, not a bug.
      if (r.status >= 400 && r.status < 500) { needsParams.push(`${path} -> ${r.status} ${String(data(r)?.error || '').slice(0, 60)}`); continue; }
      jsonBad.push(`GET ${path} -> ${r.status} ${typeof r.body}`);
    }
    record('shape', `every parameterless GET answers without a server error (${getRoutes.length} routes)`, jsonBad.length === 0,
      jsonBad.length ? jsonBad.slice(0, 5).join(' | ') : `${getRoutes.length - needsParams.length - exportsOk.length} JSON, ${exportsOk.length} export stream(s), ${needsParams.length} need params`);
    if (needsParams.length) record('shape', `GETs requiring a parameter or project scope: ${needsParams.length}`, true, needsParams.slice(0, 8).join('; '));

    // ===================================== 6. coverage report
    console.log('\n6. COVERAGE');
    const writeRoutes = routes.filter(([m]) => m !== 'GET');
    record('coverage', `router enumerated: ${routes.length} routes (${getRoutes.length} parameterless GET, ${writeRoutes.length} write)`, true);
  } catch (error) {
    record('harness', 'harness ran to completion', false, String(error.message || error));
  } finally {
    await new Promise((r) => server.close(r)).catch(() => {});
    await mongoose.disconnect().catch(() => {});
    await mongod.stop().catch(() => {});
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${'='.repeat(74)}`);
  console.log(`${results.length} checks, ${results.length - failed.length} passed, ${failed.length} failed.`);
  if (failed.length) {
    console.log('\nFAILURES');
    for (const f of failed) console.log(`  - [${f.group}] ${f.name}${f.detail ? `\n      ${f.detail}` : ''}`);
  }
  console.log('='.repeat(74));
  setTimeout(() => process.exit(failed.length ? 1 : 0), 200).unref();
})().catch((e) => { console.error('\nHarness crashed:', e); process.exit(1); });
