/**
 * End-to-end test for the MCP endpoint.
 *
 * Boots an in-memory Mongo, starts the real Express route on a real port, and
 * drives it with the real MCP client SDK over Streamable HTTP — so transport
 * framing, auth, scoping and redaction are all exercised the way a connected
 * third-party agent would exercise them.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

let mongod;
let server;
let baseUrl;
let mcpKeyService;
let CRMClient;
let User;

const startAll = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'mcp_test' });

  mcpKeyService = require('../services/mcp/mcpKey.service');
  CRMClient = require('../models/crm/CRMClient');
  User = require('../models/auth/User');

  const mcpRoutes = require('../routes/mcp.routes');
  const app = express();
  app.use('/mcp', express.json(), mcpRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/mcp`;
};

const stopAll = async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop();
};

/** Builds a connected MCP client using the official SDK. */
const connectClient = async (key) => {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');

  const transport = new StreamableHTTPClientTransport(new URL(baseUrl), {
    requestInit: { headers: { Authorization: `Bearer ${key}` } },
  });
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(transport);
  return { client, transport };
};

const parse = (result) => JSON.parse(result.content[0].text);

test('MCP endpoint: discovery, querying, scoping, redaction and auth', async (t) => {
  await startAll();
  t.after(stopAll);

  // Seed data the agent should be able to read.
  await CRMClient.create([
    { name: 'Alpha Corp', department: 'media', status: 'ACTIVE' },
    { name: 'Beta Ltd', department: 'media', status: 'ACTIVE' },
    { name: 'Gamma Inc', department: 'marketing', status: 'INACTIVE' },
  ]);

  // Seed a user carrying a credential that must never leave the process.
  await User.create({
    firstName: 'Test',
    lastName: 'Person',
    email: 'mcp-test@example.com',
    password: 'super-secret-value-9999',
    role: 'it_employee',
  });

  const { plaintext: fullKey } = await mcpKeyService.issueKey({ label: 'test-full' });

  await t.test('rejects a request with no key', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    assert.equal(res.status, 401);
  });

  await t.test('rejects a forged key', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer sap_mcp_deadbeef_forged' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    assert.equal(res.status, 403);
  });

  await t.test('lists exactly the five read-only tools', async () => {
    const { client, transport } = await connectClient(fullKey);
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name).sort();
    assert.deepEqual(names, ['aggregate_dataset', 'count_dataset', 'describe_dataset', 'list_datasets', 'query_dataset']);
    // The connecting product only exposes tools marked read-only.
    assert.ok(tools.every((tool) => tool.annotations?.readOnlyHint === true), 'every tool must be read-only');
    await transport.close();
  });

  await t.test('discovers datasets and describes their fields', async () => {
    const { client, transport } = await connectClient(fullKey);

    const list = parse(await client.callTool({ name: 'list_datasets', arguments: {} }));
    assert.ok(list.count > 30, `expected a broad catalogue, got ${list.count}`);
    assert.ok(list.datasets.some((d) => d.dataset === 'crm_clients'));
    assert.ok(list.datasets.some((d) => d.dataset === 'finance_invoices'));

    const described = parse(await client.callTool({ name: 'describe_dataset', arguments: { dataset: 'crm_clients' } }));
    assert.equal(described.dataset, 'crm_clients');
    assert.ok(described.fields.length > 0);

    await transport.close();
  });

  await t.test('queries, filters, counts and aggregates real rows', async () => {
    const { client, transport } = await connectClient(fullKey);

    const all = parse(await client.callTool({ name: 'query_dataset', arguments: { dataset: 'crm_clients' } }));
    assert.equal(all.total, 3);
    assert.equal(all.rows.length, 3);

    const filtered = parse(await client.callTool({
      name: 'query_dataset',
      arguments: { dataset: 'crm_clients', filter: { status: 'ACTIVE' }, fields: ['companyName', 'status'] },
    }));
    assert.equal(filtered.total, 2);
    assert.ok(filtered.rows.every((row) => row.status === 'ACTIVE'));

    const counted = parse(await client.callTool({
      name: 'count_dataset',
      arguments: { dataset: 'crm_clients', filter: { status: 'INACTIVE' } },
    }));
    assert.equal(counted.total, 1);

    const agg = parse(await client.callTool({
      name: 'aggregate_dataset',
      arguments: { dataset: 'crm_clients', groupBy: 'status' },
    }));
    const active = agg.buckets.find((b) => b.key === 'ACTIVE');
    assert.equal(active.value, 2);

    await transport.close();
  });

  await t.test('never returns credential fields', async () => {
    const { client, transport } = await connectClient(fullKey);
    const result = await client.callTool({ name: 'query_dataset', arguments: { dataset: 'users' } });
    const raw = result.content[0].text;
    assert.ok(!raw.includes('super-secret-value'), 'plaintext password must not appear');
    const payload = JSON.parse(raw);
    for (const row of payload.rows) {
      assert.equal(row.password, undefined, 'password field must be stripped');
    }
    await transport.close();
  });

  await t.test('blocks dangerous query operators', async () => {
    const { client, transport } = await connectClient(fullKey);
    const result = await client.callTool({
      name: 'query_dataset',
      arguments: { dataset: 'crm_clients', filter: { $where: 'this.companyName.length > 0' } },
    });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /not permitted/i);
    await transport.close();
  });

  await t.test('enforces per-key scope', async () => {
    const { plaintext: crmOnly } = await mcpKeyService.issueKey({ label: 'crm-only', scopes: ['crm'] });
    const { client, transport } = await connectClient(crmOnly);

    const list = parse(await client.callTool({ name: 'list_datasets', arguments: {} }));
    assert.ok(list.datasets.every((d) => d.domain === 'crm'), 'scoped key must only see its domain');

    const denied = await client.callTool({ name: 'query_dataset', arguments: { dataset: 'finance_invoices' } });
    assert.equal(denied.isError, true);
    assert.match(denied.content[0].text, /outside this key's scope/i);

    await transport.close();
  });

  await t.test('caps result size regardless of requested limit', async () => {
    const { client, transport } = await connectClient(fullKey);
    const result = parse(await client.callTool({
      name: 'query_dataset',
      arguments: { dataset: 'crm_clients', limit: 5000 },
    }));
    assert.ok(result.limit <= 200, 'limit must be clamped');
    await transport.close();
  });

  await t.test('revoking a key immediately denies access', async () => {
    const { record, plaintext } = await mcpKeyService.issueKey({ label: 'to-revoke' });

    const { client, transport } = await connectClient(plaintext);
    const before = await client.listTools();
    assert.ok(before.tools.length > 0);
    await transport.close();

    await mcpKeyService.revokeKey(record._id);

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${plaintext}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    assert.equal(res.status, 403);
  });
});
