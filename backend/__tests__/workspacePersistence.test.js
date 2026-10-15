const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const service = require('../services/workspaceRecords.service');
const Record = require('../models/WorkspaceRecord');

test('workspace persistence, relationships, cancellation and external uniqueness', async () => {
  const mongo = await MongoMemoryServer.create();
  try {
    await mongoose.connect(mongo.getUri());
    await Record.init();
    const admin = { role: 'admin', _id: new mongoose.Types.ObjectId() };
    const product = await service.create(admin, 'YARROWTECH', 'product', { name: 'Test product' });
    const customer = await service.create(admin, 'YARROWTECH', 'customer', { name: 'Test customer' });
    const plan = await service.create(admin, 'YARROWTECH', 'plan', { name: 'Monthly plan', productId: String(product._id), amountMinor: 19900, currency: 'INR', billingInterval: 'monthly' });
    const subscription = await service.create(admin, 'YARROWTECH', 'subscription', { name: 'Test subscription', productId: String(product._id), customerId: String(customer._id), planId: String(plan._id) });
    assert.equal(subscription.amountMinor, 19900);
    await service.update(admin, String(plan._id), 'plan', { amountMinor: 29900, version: plan.__v });
    assert.equal((await service.detail(admin, String(subscription._id), 'subscription')).amountMinor, 19900);
    await assert.rejects(service.update(admin, String(plan._id), 'plan', { amountMinor: 99900, version: plan.__v }), { statusCode: 409 });
    const first = await service.create(admin, 'YARROWTECH', 'service', { name: 'Retry-safe service', idempotencyKey: 'same-key-123' });
    const second = await service.create(admin, 'YARROWTECH', 'service', { name: 'Retry-safe service', idempotencyKey: 'same-key-123' });
    assert.equal(String(first._id), String(second._id));
    await assert.rejects(service.create(admin, 'YARROWTECH', 'service', { name: 'Different', idempotencyKey: 'same-key-123' }), { statusCode: 409 });
    assert.equal((await service.list(admin, 'YARROWTECH', 'subscription')).total, 1);
    assert.equal((await service.cancel(admin, String(subscription._id))).status, 'cancelled');
    assert.equal((await service.cancel(admin, String(subscription._id))).status, 'cancelled');
    await assert.rejects(service.create(admin, 'MATEBID', 'ticket', { name: 'Invalid relationship', productId: String(product._id) }), { statusCode: 400 });
    const outsider = { role: 'employee', assignedProjects: ['MATEBID'] };
    await assert.rejects(service.detail(outsider, String(customer._id), 'customer'), { statusCode: 404 });
    assert.equal((await service.list(outsider, 'MATEBID', 'customer')).total, 0);
    const external = { organizationId: 'HOUSE_OF_MUSA', brandId: 'YARROWTECH', projectId: 'YARROWTECH', kind: 'customer', name: 'External', source: 'provider', integrationId: 'test', externalRecordId: 'one' };
    await Record.create(external);
    await assert.rejects(Record.create(external), { code: 11000 });
    assert.equal((await service.detail(admin, String(product._id), 'product')).name, 'Test product');
    await assert.rejects(service.detail(admin, String(product._id), 'product', false, 'MATEBID'), { statusCode: 404 });
  } finally { await mongoose.disconnect(); await mongo.stop(); }
});
