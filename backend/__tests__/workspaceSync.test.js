process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/auth/User');
const service = require('../services/workspaceSync.service');
const { Job, External, State } = require('../models/WorkspaceSync');

test('durable sync performs isolated inbound upserts and outbound reconciliation', async () => {
  const mongo = await MongoMemoryServer.create();
  const adapter = service.adapters['edifyeight-teachers'];
  const original = { read: adapter.read, write: adapter.write, url: adapter.provider.getBaseUrl, token: adapter.provider.getServiceToken };
  let remote = { id: 'teacher-1', name: 'Before', status: 'active', password: 'must-never-persist', token: 'must-never-persist' };
  let writes = 0;
  adapter.provider.getBaseUrl = () => 'http://127.0.0.1:9999/teachers';
  adapter.provider.getServiceToken = () => 'fixture-secret';
  adapter.read = async () => ({ data: { items: [remote], pagination: { totalPages: 1 } } });
  adapter.write = async (id, payload) => { assert.equal(id, remote.id); writes += 1; remote = { ...remote, ...payload }; return { data: remote }; };
  try {
    await mongoose.connect(mongo.getUri());
    await Promise.all([Job.init(), External.init(), State.init()]);
    const admin = await User.create({ firstName: 'Workspace', lastName: 'Admin', email: 'sync@workspace.test', password: 'ValidPass123!', role: 'admin', isActive: true });
    const id = 'edifyeight-teachers';
    const one = await service.enqueue(admin, id, {});
    assert.equal(String((await service.enqueue(admin, id, {}))._id), String(one._id));
    assert.equal((await service.processOne()).status, 'succeeded');
    assert.equal(await External.countDocuments({ projectId: 'EEC', integrationId: id }), 1);
    const snapshot = await External.findOne({}).lean();
    assert.equal(snapshot.data.password, undefined); assert.equal(snapshot.data.token, undefined);
    await service.enqueue(admin, id, {}); await service.processOne();
    assert.equal(await External.countDocuments({}), 1);
    const update = await service.enqueue(admin, id, { direction: 'outbound', resourceId: remote.id, payload: { name: 'After' } });
    assert.equal(update.payload, undefined);
    await assert.rejects(service.enqueue(admin, id, { direction: 'outbound', resourceId: remote.id, payload: { name: 'Conflicting' } }), { statusCode: 409 });
    assert.equal((await service.processOne()).status, 'succeeded');
    assert.equal(writes, 1);
    assert.equal((await service.processOne()).status, 'succeeded');
    assert.equal((await External.findOne({}).lean()).name, 'After');
    assert.ok((await State.findOne({}).lean()).lastOutboundAt);
    await assert.rejects(service.jobDetail({ role: 'employee', assignedProjects: ['MATEBID'] }, String(one._id)), { statusCode: 404 });
    adapter.read = async () => { const error = new Error('token=fixture-secret'); error.status = 429; throw error; };
    const failing = await service.enqueue(admin, id, {});
    const pending = await service.processOne();
    assert.equal(pending.status, 'queued'); assert.equal(pending.error.includes('fixture-secret'), false);
    await Job.updateOne({ _id: failing._id }, { $set: { attempts: 2, availableAt: new Date(0) } });
    assert.equal((await service.processOne()).status, 'failed');
    assert.equal((await service.retry(admin, String(failing._id))).status, 'queued');
    await User.updateOne({ _id: admin._id }, { $set: { isActive: false } });
    assert.equal((await service.processOne()).status, 'failed');
  } finally {
    adapter.read = original.read; adapter.write = original.write;
    adapter.provider.getBaseUrl = original.url; adapter.provider.getServiceToken = original.token;
    await mongoose.disconnect(); await mongo.stop();
  }
});
test('unrecognized provider pagination is rejected', () => {
  assert.throws(() => service.unwrap({ data: { items: [{ id: '1' }], nextCursor: 'two' } }, 'teacher'), { statusCode: 409 });
  assert.throws(() => service.unwrap({ data: { unknown: [] } }, 'teacher'), { statusCode: 502 });
});
