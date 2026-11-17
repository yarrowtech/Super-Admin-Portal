/**
 * Tests for the CEO Agent integration (SSO handoff + ERP data sync API).
 *
 * The SSO token is verified against an INDEPENDENT reimplementation of the
 * spec's algorithm rather than against our own minter, so a mistake in our
 * implementation cannot pass by agreeing with itself.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.ERP_SSO_SECRET = 'test-sso-secret-do-not-use-in-prod';
process.env.ERP_DATA_API_KEY = 'test-data-api-key-abcdef';
process.env.ERP_ORG_ID = 'test-org-id-permanent';
process.env.ERP_ORG_NAME = 'Yarrowtech Test';
process.env.CEO_AGENT_URL = 'https://ceo-agent.example.com';

let mongod;
let server;
let baseUrl;
let CRMClient;
let CRMCommunication;
let Invoice;

const API_KEY = process.env.ERP_DATA_API_KEY;

const startAll = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'ceo_agent_test' });

  CRMClient = require('../models/crm/CRMClient');
  CRMCommunication = require('../models/crm/CRMCommunication');
  Invoice = require('../models/finance/Invoice');

  const app = express();
  app.use(express.json());
  app.use('/api', require('../routes/erpData.routes'));

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
};

const stopAll = async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop();
};

const authedGet = (path) => fetch(`${baseUrl}${path}`, {
  headers: { Authorization: `Bearer ${API_KEY}` },
}).then(async (r) => ({ status: r.status, body: await r.json() }));

// ---------------------------------------------------------------------------
// SSO token — no DB needed.
// ---------------------------------------------------------------------------

test('CEO Agent SSO token matches the spec algorithm exactly', async (t) => {
  const ssoService = require('../services/ceoAgent/ceoAgentSso.service');

  await t.test('token verifies against an independent implementation', () => {
    const { token } = ssoService.mintSsoToken({
      erpOrgId: 'org-123',
      erpUserId: 'user-456',
      email: 'a@b.com',
      name: 'Test User',
      orgName: 'Test Co',
    });

    // --- Independent verifier, written from the spec text only. ---
    const [payloadB64, signature] = token.split('.');
    const expectedSig = Buffer.from(
      crypto.createHmac('sha256', process.env.ERP_SSO_SECRET).update(payloadB64).digest()
    ).toString('base64url');

    assert.equal(signature, expectedSig, 'HMAC-SHA256 over the base64url payload must match');

    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    assert.equal(decoded.erpOrgId, 'org-123');
    assert.equal(decoded.erpUserId, 'user-456');
    assert.equal(decoded.email, 'a@b.com');
    assert.equal(decoded.name, 'Test User');
    assert.equal(decoded.orgName, 'Test Co');
  });

  await t.test('exp is epoch MILLISECONDS about five minutes out', () => {
    const before = Date.now();
    const { token } = ssoService.mintSsoToken({ erpOrgId: 'o', erpUserId: 'u' });
    const decoded = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));

    const delta = decoded.exp - before;
    assert.ok(delta > 4 * 60 * 1000 && delta <= 5 * 60 * 1000 + 1000, `exp delta was ${delta}ms`);
    // Milliseconds since epoch are 13 digits; a seconds-based exp would be 10.
    assert.equal(String(decoded.exp).length, 13, 'exp must be in milliseconds, not seconds');
  });

  await t.test('a tampered payload fails verification', () => {
    const { token } = ssoService.mintSsoToken({ erpOrgId: 'org-a', erpUserId: 'u' });
    const [, signature] = token.split('.');

    const forged = Buffer.from(JSON.stringify({
      erpOrgId: 'org-ATTACKER', erpUserId: 'u', email: '', name: '', orgName: '',
      exp: Date.now() + 60000,
    })).toString('base64url');

    assert.equal(ssoService.verifySsoToken(`${forged}.${signature}`), null);
  });

  await t.test('an expired token is rejected', () => {
    const payload = Buffer.from(JSON.stringify({
      erpOrgId: 'o', erpUserId: 'u', exp: Date.now() - 1000,
    })).toString('base64url');
    const sig = Buffer.from(
      crypto.createHmac('sha256', process.env.ERP_SSO_SECRET).update(payload).digest()
    ).toString('base64url');

    assert.equal(ssoService.verifySsoToken(`${payload}.${sig}`), null);
  });

  await t.test('a token signed with the wrong secret is rejected', () => {
    const payload = Buffer.from(JSON.stringify({
      erpOrgId: 'o', erpUserId: 'u', exp: Date.now() + 60000,
    })).toString('base64url');
    const sig = Buffer.from(
      crypto.createHmac('sha256', 'the-wrong-secret').update(payload).digest()
    ).toString('base64url');

    assert.equal(ssoService.verifySsoToken(`${payload}.${sig}`), null);
  });

  await t.test('launch URL points at CEO Agent with the token url-encoded', () => {
    const { token } = ssoService.mintSsoToken({ erpOrgId: 'o', erpUserId: 'u' });
    const url = ssoService.buildLaunchUrl(token);
    assert.ok(url.startsWith('https://ceo-agent.example.com/sso/erp?token='));
    assert.equal(new URL(url).searchParams.get('token'), token);
  });

  await t.test('erpOrgId comes from config and never from a mutable value', () => {
    const orgService = require('../services/ceoAgent/ceoAgentOrg.service');
    assert.equal(orgService.resolveOrgIdentity().erpOrgId, 'test-org-id-permanent');

    const saved = process.env.ERP_ORG_ID;
    delete process.env.ERP_ORG_ID;
    // Must fail loudly rather than invent an id that could later change.
    assert.throws(() => orgService.resolveOrgIdentity(), /ERP_ORG_ID is not configured/);
    process.env.ERP_ORG_ID = saved;
  });
});

// ---------------------------------------------------------------------------
// Data sync API.
// ---------------------------------------------------------------------------

test('CEO Agent ERP data sync API', async (t) => {
  await startAll();
  t.after(stopAll);

  const clients = await CRMClient.create([
    { name: 'Acme Co', department: 'marketing', email: 'acme@example.com', phone: '111', status: 'ACTIVE', source: 'referral' },
    { name: 'Globex', department: 'media', email: 'globex@example.com', phone: '222', status: 'ACTIVE' },
  ]);

  await Invoice.create([
    { invoiceNumber: 'INV-1', clientName: 'Acme Co', client: clients[0]._id, total: 1500, currency: 'INR', status: 'paid', issueDate: new Date('2026-01-10'), items: [{ description: 'Consulting', quantity: 3, rate: 500, amount: 1500 }] },
    { invoiceNumber: 'INV-2', clientName: 'Globex', client: clients[1]._id, total: 800, currency: 'INR', status: 'void', issueDate: new Date('2026-02-01') },
  ]);

  await t.test('rejects a request with no API key', async () => {
    const res = await fetch(`${baseUrl}/api/customers`);
    assert.equal(res.status, 401);
  });

  await t.test('rejects a wrong API key', async () => {
    const res = await fetch(`${baseUrl}/api/customers`, {
      headers: { Authorization: 'Bearer totally-wrong-key-xxxxx' },
    });
    assert.equal(res.status, 403);
  });

  await t.test('lists customers in the spec field shape', async () => {
    const { status, body } = await authedGet('/api/customers');
    assert.equal(status, 200);
    assert.equal(body.data.length, 2);

    const acme = body.data.find((c) => c.name === 'Acme Co');
    for (const field of ['id', 'name', 'email', 'phone', 'createdAt', 'updatedAt', 'tags']) {
      assert.ok(field in acme, `customer must expose "${field}"`);
    }
    assert.ok(Array.isArray(acme.tags));
    assert.equal(body.pagination.total, 2);
  });

  await t.test('supports incremental sync via updated_since', async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const { body } = await authedGet(`/api/customers?updated_since=${encodeURIComponent(future)}`);
    assert.equal(body.data.length, 0, 'nothing has been updated after "now + 1 min"');

    const past = new Date(Date.now() - 60_000).toISOString();
    const recent = await authedGet(`/api/customers?updated_since=${encodeURIComponent(past)}`);
    assert.equal(recent.body.data.length, 2);
  });

  await t.test('rejects an unparseable date instead of returning everything', async () => {
    const { status, body } = await authedGet('/api/customers?updated_since=not-a-date');
    assert.equal(status, 400);
    assert.match(body.error, /ISO8601/);
  });

  await t.test('paginates and caps page size', async () => {
    const { body } = await authedGet('/api/customers?page=1&page_size=1');
    assert.equal(body.data.length, 1);
    assert.equal(body.pagination.hasMore, true);
    assert.equal(body.pagination.totalPages, 2);

    const page2 = await authedGet('/api/customers?page=2&page_size=1');
    assert.equal(page2.body.data.length, 1);
    assert.notEqual(page2.body.data[0].id, body.data[0].id, 'page 2 must differ from page 1');

    const huge = await authedGet('/api/customers?page_size=99999');
    assert.ok(huge.body.pagination.pageSize <= 200, 'page size must be capped');
  });

  await t.test('maps invoices onto the order shape and status vocabulary', async () => {
    const { body } = await authedGet('/api/orders');
    assert.equal(body.data.length, 2);

    const paid = body.data.find((o) => o.reference === 'INV-1');
    assert.equal(paid.amount, 1500);
    assert.equal(paid.currency, 'INR');
    assert.equal(paid.status, 'paid');
    assert.equal(paid.customerId, String(clients[0]._id));
    assert.equal(paid.items[0].qty, 3);
    assert.equal(paid.items[0].price, 500);

    // 'void' is not in the spec's vocabulary; it must fold onto 'cancelled'.
    const voided = body.data.find((o) => o.reference === 'INV-2');
    assert.equal(voided.status, 'cancelled');
    assert.equal(voided.sourceStatus, 'void');
  });

  await t.test('reports products as unavailable rather than faking an empty catalogue', async () => {
    const { status, body } = await authedGet('/api/products');
    assert.equal(status, 501);
    assert.equal(body.code, 'CAPABILITY_NOT_AVAILABLE');
  });

  await t.test('advertises capabilities so CEO Agent can adapt', async () => {
    const { body } = await authedGet('/api/capabilities');
    assert.equal(body.data.customers.available, true);
    assert.equal(body.data.orders.available, true);
    assert.equal(body.data.products.available, false);
    assert.equal(body.data.marketingResults.available, true);
    assert.equal(body.data.pagination.style, 'page-number');
  });

  await t.test('writes marketing results back into the CRM', async () => {
    const res = await fetch(`${baseUrl}/api/marketing-results`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: 'camp-001',
        campaignName: 'Spring Push',
        channel: 'email',
        sentAt: new Date('2026-03-01').toISOString(),
        targetCustomerIds: [String(clients[0]._id), String(clients[1]._id)],
        metrics: { sent: 120, opened: 54, clicked: 12, replied: 3 },
      }),
    });
    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(body.data.recordedFor, 2);
    assert.equal(body.data.communicationsCreated, 2);

    // The timeline entry exists and carries the metrics.
    const comms = await CRMCommunication.find({ client: clients[0]._id }).lean();
    assert.equal(comms.length, 1);
    assert.equal(comms[0].type, 'email');
    assert.equal(comms[0].direction, 'outbound');
    assert.match(comms[0].body, /sent: 120/);
    // Department must be inherited from the client to satisfy its enum.
    assert.ok(['media', 'marketing'].includes(comms[0].department));

    // Attribution is stamped on the client record.
    const updated = await CRMClient.findById(clients[0]._id).lean();
    assert.equal(updated.campaignId, 'camp-001');
    assert.equal(updated.marketingChannel, 'email');
    assert.equal(updated.campaignSource, 'Spring Push');
  });

  await t.test('maps an unsupported channel onto a valid CRM type', async () => {
    const res = await fetch(`${baseUrl}/api/marketing-results`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: 'camp-002',
        channel: 'linkedin', // not in the CRMCommunication type enum
        targetCustomerIds: [String(clients[0]._id)],
        metrics: { sent: 10 },
      }),
    });
    assert.equal(res.status, 201);

    const comms = await CRMCommunication.find({ client: clients[0]._id }).sort({ createdAt: -1 }).lean();
    assert.equal(comms[0].type, 'message', 'linkedin must fold onto an allowed enum value');
    assert.match(comms[0].subject, /linkedin/, 'the real channel must still be visible');
  });

  await t.test('reports unknown customer ids instead of silently dropping them', async () => {
    const ghost = new mongoose.Types.ObjectId();
    const res = await fetch(`${baseUrl}/api/marketing-results`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: 'camp-003',
        channel: 'email',
        targetCustomerIds: [String(clients[0]._id), String(ghost), 'not-an-id'],
        metrics: { sent: 3 },
      }),
    });
    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(body.data.recordedFor, 1);
    assert.deepEqual(body.data.skipped.unknownCustomerIds, [String(ghost)]);
    assert.deepEqual(body.data.skipped.invalidCustomerIds, ['not-an-id']);
  });

  await t.test('rejects a malformed write-back payload', async () => {
    const post = (payload) => fetch(`${baseUrl}/api/marketing-results`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.equal((await post({ channel: 'email', targetCustomerIds: ['x'] })).status, 400);
    assert.equal((await post({ campaignId: 'c', targetCustomerIds: ['x'] })).status, 400);
    assert.equal((await post({ campaignId: 'c', channel: 'email', targetCustomerIds: [] })).status, 400);
  });
});
