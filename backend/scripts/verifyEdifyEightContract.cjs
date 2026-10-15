process.env.NODE_ENV = 'test';
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function run() {
  const source = path.resolve(process.argv[2] || '');
  const providerRequire = createRequire(path.join(source, 'package.json'));
  const nativeMongoose = providerRequire('mongoose');
  const express = providerRequire('express');
  const mongo = await MongoMemoryServer.create();
  let server;
  try {
    process.env.SUPER_ADMIN_PORTAL_SERVICE_TOKEN = 'isolated-contract-token';
    process.env.EDIFYEIGHT_API_TOKEN = 'isolated-contract-token';
    const load = (file) => import(pathToFileURL(path.join(source, file)).href);
    const teachers = await load('src/routes/internal/teachers.js');
    const materials = await load('src/routes/internal/studyMaterials.js');
    await nativeMongoose.connect(mongo.getUri(), { dbName: 'provider_contract' });
    const remoteTeacher = await nativeMongoose.model('User').create({ name: 'Contract teacher', email: 'contract@example.test', phone: '9999999999', password: 'fixture-hash', role: 'teacher' });
    const remoteMaterial = await nativeMongoose.model('StudyMaterial').create({ title: 'Contract material', class: '10', board: 'CBSE', subject: 'Maths', category: 'Notes', pdfUrl: 'https://fixture.invalid/test.pdf', pdfPublicId: 'fixture-only', accessLevel: 'premium', isFree: false, price: 199 });
    const app = express(); app.use(express.json());
    app.use('/api/internal/teachers', teachers.default); app.use('/api/internal/study-materials', materials.default);
    server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    process.env.EDIFYEIGHT_TEACHER_API_URL = origin + '/api/internal/teachers';
    process.env.EDIFYEIGHT_STUDY_MATERIAL_API_URL = origin + '/api/internal/study-materials';
    await mongoose.connect(mongo.getUri(), { dbName: 'portal_contract' });
    const User = require('../models/auth/User');
    const sync = require('../services/workspaceSync.service');
    const { Job, External, State } = require('../models/WorkspaceSync');
    await Promise.all([Job.init(), External.init(), State.init()]);
    const actor = await User.create({ firstName: 'Contract', lastName: 'Admin', email: 'contract@portal.test', password: 'ValidPass123!', role: 'admin', isActive: true });
    for (const integrationId of ['edifyeight-teachers', 'edifyeight-study-materials']) {
      assert.equal((await sync.testConnection(actor, integrationId)).status, 'connected');
      await sync.enqueue(actor, integrationId, {});
      assert.equal((await sync.processOne()).status, 'succeeded');
    }
    await sync.enqueue(actor, 'edifyeight-teachers', { direction: 'outbound', resourceId: String(remoteTeacher._id), payload: { name: 'Updated contract teacher' } });
    assert.equal((await sync.processOne()).status, 'succeeded');
    assert.equal((await sync.processOne()).status, 'succeeded');
    assert.equal((await nativeMongoose.model('User').findById(remoteTeacher._id).lean()).name, 'Updated contract teacher');
    assert.equal((await External.findOne({ integrationId: 'edifyeight-teachers' }).lean()).name, 'Updated contract teacher');
    await sync.enqueue(actor, 'edifyeight-study-materials', { direction: 'outbound', resourceId: String(remoteMaterial._id), payload: { title: 'Updated contract material' } });
    assert.equal((await sync.processOne()).status, 'succeeded');
    assert.equal((await sync.processOne()).status, 'succeeded');
    const saved = await nativeMongoose.model('StudyMaterial').findById(remoteMaterial._id).lean();
    assert.equal(saved.title, 'Updated contract material'); assert.equal(saved.price, 199); assert.equal(saved.accessLevel, 'premium');
    await nativeMongoose.model('User').deleteOne({ _id: remoteTeacher._id });
    await sync.enqueue(actor, 'edifyeight-teachers', {}); await sync.processOne();
    assert.equal((await External.findOne({ integrationId: 'edifyeight-teachers' }).lean()).present, false);
    console.log(JSON.stringify({ passed: true, checks: ['Native provider service authentication', 'Both inbound mappings', 'Teacher PUT and reconciliation', 'Material PUT preserves billing/access fields', 'Deletion tombstones'], database: 'disposable only' }));
  } finally { if (server) await new Promise((resolve) => server.close(resolve)); await nativeMongoose.disconnect(); await mongoose.disconnect(); await mongo.stop(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
