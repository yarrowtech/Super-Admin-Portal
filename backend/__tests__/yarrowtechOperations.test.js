process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');
const records = require('../services/workspaceRecords.service');
const operations = require('../services/yarrowtechOperations.service');
const provider = require('../services/yarrowtechApi.service');
const { Details, Delivery, Payment } = require('../models/YarrowtechOperations');
const User = require('../models/auth/User');
const Session = require('../models/auth/Session');

test('YarrowTech operations persist settings, linked deliveries, archives and scoped payment reads', async () => {
  const mongo = await MongoMemoryServer.create();
  let server;
  try {
    await mongoose.connect(mongo.getUri());
    await Promise.all([Details.init(), Delivery.init(), Payment.init()]);
    const admin = await User.create({ firstName: 'YarrowTech', lastName: 'Admin', role: 'admin', email: 'yarrowtech@example.test', password: 'ValidPass123!' });
    const service = await records.create(admin, 'YARROWTECH', 'service', { name: 'Delivery service' });
    const customer = await records.create(admin, 'YARROWTECH', 'customer', { name: 'Linked client' });
    const otherCustomer = await records.create(admin, 'MATEBID', 'customer', { name: 'Other project client' });
    const product = await records.create(admin, 'YARROWTECH', 'product', { name: 'Product' });
    const otherProduct = await records.create(admin, 'MATEBID', 'product', { name: 'Other product' });
    await operations.saveSettings(admin, String(product._id), { productCode: 'YT-ONE', category: 'Operations', releaseVersion: '1.0', notificationsEnabled: false });
    assert.equal((await operations.getSettings(admin, String(product._id))).settings.productCode, 'YT-ONE');
    await assert.rejects(operations.saveSettings(admin, String(otherProduct._id), { category: 'Forbidden' }), { statusCode: 404 });
    const delivery = await operations.saveDelivery(admin, 'YARROWTECH', { name: 'Client delivery', serviceId: String(service._id), customerId: String(customer._id), tasks: [{ title: 'Deliver', status: 'pending' }] });
    const retryBody = { name: 'Retry-safe delivery', serviceId: String(service._id), customerId: String(customer._id), idempotencyKey: 'delivery-key-001' };
    const retryOne = await operations.saveDelivery(admin, 'YARROWTECH', retryBody);
    const retryTwo = await operations.saveDelivery(admin, 'YARROWTECH', retryBody);
    assert.equal(String(retryOne._id), String(retryTwo._id));
    assert.equal((await operations.clients(admin, 'YARROWTECH', {})).total, 1);
    assert.equal((await operations.deliveries(admin, 'YARROWTECH', { serviceId: String(service._id) })).total, 2);
    await operations.saveDelivery(admin, 'YARROWTECH', { status: 'completed', tasks: [{ title: 'Deliver', status: 'completed' }] }, String(delivery._id));
    assert.equal((await Delivery.findById(delivery._id).lean()).tasks[0].status, 'completed');
    await assert.rejects(operations.saveDelivery(admin, 'YARROWTECH', { status: 'on_hold', version: 0 }, String(delivery._id)), { statusCode: 409 });
    await assert.rejects(operations.saveDelivery(admin, 'YARROWTECH', { name: 'Invalid team', serviceId: String(service._id), customerId: String(customer._id), teamIds: [null] }), { statusCode: 400 });
    await assert.rejects(operations.saveDelivery(admin, 'YARROWTECH', { name: 'Bad link', serviceId: String(service._id), customerId: String(otherCustomer._id) }), { statusCode: 404 });
    await operations.archive(admin, String(service._id), 'service');
    assert.equal((await records.list(admin, 'YARROWTECH', 'service')).total, 0);
    assert.equal((await records.list(admin, 'YARROWTECH', 'service', { status: 'archived' })).total, 1);
    await assert.rejects(records.update(admin, String(service._id), 'service', { status: 'active' }), { statusCode: 409 });
    assert.equal((await records.detail(admin, String(service._id), 'service')).history.at(-1).action, 'archived');
    await assert.rejects(operations.archive(admin, String(otherProduct._id), 'product'), { statusCode: 404 });
    const plan = await records.create(admin, 'YARROWTECH', 'plan', { name: 'Plan', productId: String(product._id), currency: 'INR', amountMinor: 10000, billingInterval: 'monthly' });
    const subscription = await records.create(admin, 'YARROWTECH', 'subscription', { name: 'Subscription', productId: String(product._id), customerId: String(customer._id), planId: String(plan._id) });
    assert.equal((await operations.payments(admin, String(subscription._id), {})).total, 0);
    await Payment.create({ organizationId: 'HOUSE_OF_MUSA', projectId: 'YARROWTECH', subscriptionId: subscription._id, integrationId: 'isolated-fixture', externalTransactionId: 'receipt-001', status: 'pending', amountMinor: 10000, currency: 'INR' });
    assert.equal((await operations.payments(admin, String(subscription._id), { search: 'receipt-001' })).total, 1);
    const member = { role: 'it_employee', assignedProjects: ['MATEBID'] };
    await assert.rejects(operations.getSettings(member, String(product._id)), { statusCode: 404 });
    const jti = randomUUID();
    await Session.create({ user: admin._id, jti, refreshTokenHash: 'fixture', expiresAt: new Date(Date.now() + 3600000) });
    const token = jwt.sign({ userId: String(admin._id) }, require('../config/jwt').accessSecret, { jwtid: jti, expiresIn: '1h' });
    const app = express(); app.use(express.json());
    app.use('/api/v1', require('../routes/yarrowtech.routes')); app.use('/api/v1', require('../routes/organizationWorkspace.routes'));
    app.use((error, req, res, next) => { void next; res.status(error.statusCode || 500).json({ success: false, error: error.message }); });
    server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
    const origin = `http://127.0.0.1:${server.address().port}/api/v1`;
    const response = await fetch(origin + '/projects/YARROWTECH/activity', { headers: { authorization: `Bearer ${token}` } });
    const audit = await response.json(); assert.equal(response.status, 200); assert.ok(audit.data.items.some((item) => item.kind === 'settings'));
    const blocked = await fetch(origin + '/integrations/yarrowtech-srs/sync', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: '{}' });
    assert.equal(blocked.status, 409); assert.equal((await blocked.json()).code, 'YARROWTECH_CONTRACT_UNVERIFIED');
    assert.equal(await require('../models/WorkspaceSync').Job.countDocuments({ projectId: 'YARROWTECH' }), 0);
  } finally { if (server) await new Promise((resolve) => server.close(resolve)); await mongoose.disconnect(); await mongo.stop(); }
});

test('SRS public probe never transmits configured credentials or invents capabilities', async () => {
  const keys = ['SRS_API_BASE_URL', 'SRS_API_KEY', 'SRS_CLIENT_ID', 'SRS_SIGNING_SECRET', 'SRS_WEBHOOK_SECRET'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const originalFetch = global.fetch;
  try {
    for (const key of keys) process.env[key] = key === 'SRS_API_BASE_URL' ? 'https://api.yarrowtech.in' : 'sensitive-test-' + key;
    const inventory = provider.inventory();
    assert.equal(inventory.status, 'blocked'); assert.deepEqual(inventory.capabilities, []);
    for (const key of keys.slice(1)) assert.equal(JSON.stringify(inventory).includes(process.env[key]), false);
    let request;
    global.fetch = async (url, options) => { request = { url, options }; return new Response('Provider is running', { status: 200 }); };
    const result = await provider.probe();
    assert.equal(result.reachable, true); assert.equal(result.status, 'blocked');
    assert.deepEqual(Object.keys(request.options.headers), ['Accept']);
    assert.throws(provider.rejectUnverifiedOperation, { code: 'YARROWTECH_CONTRACT_UNVERIFIED', statusCode: 409 });
  } finally { global.fetch = originalFetch; for (const key of keys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; } }
});
