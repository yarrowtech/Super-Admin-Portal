const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { marketingMapScope, resolveMapProject } = require('../middlewares/marketingMapScope.middleware');
const controller = require('../controllers/ceo/marketingImport.controller');
const service = require('../services/marketingImport.service');
const { applyFilters } = require('../services/marketingAnalytics.service');
const Project = require('../models/common/Project');
const MarketingImport = require('../models/marketing/MarketingImport');

test('EEC-B2B map rejects other projects across points, records, search and status while preserving general APIs', async () => {
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  let server;
  await mongoose.connect(mongod.getUri());
  try {
    const base = { description: 'test', startDate: new Date(), projectManager: new mongoose.Types.ObjectId() };
    const [eec, edify] = await Project.create([{ ...base, name: 'EEC-B2B', projectCode: 'EEC_B2B' }, { ...base, name: 'EdifyEight', projectCode: 'EDIFYEIGHT' }]);
    const common = { school: 'Shared school', locationRaw: 'Delhi', city: 'Delhi', state: 'Delhi', latitude: 28.6, longitude: 77.2, batchId: 'scope' };
    const [own, other] = await MarketingImport.create([{ ...common, projectId: eec._id, marketingStatus: { currentStage: 'EMAIL_SENT' } }, { ...common, projectId: edify._id, marketingStatus: { currentStage: 'WON' } }]);
    assert.equal((await resolveMapProject()).id, String(eec._id));
    const app = express(); app.use(express.json()); app.use((req, res, next) => { req.user = { id: String(new mongoose.Types.ObjectId()), role: 'ceo' }; next(); });
    app.use('/map', marketingMapScope);
    app.get('/map/points', controller.getImportedMarketingPoints);
    app.get('/map/records', controller.getImportedLocationRecords);
    app.get('/map/search', controller.searchImportedRecords);
    app.get('/map/records/:recordId', controller.getImportedRecord);
    app.patch('/map/records/:recordId/marketing-status', controller.updateMarketingStatus);
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/map`;
    const points = await (await fetch(`${url}/points`)).json();
    assert.equal(points.data.projectId, String(eec._id));
    assert.equal(points.data.total, 1);
    assert.equal(points.data.points[0].projectId, String(eec._id));
    assert.deepEqual(points.data.pipeline, [{ records: 1, stage: 'EMAIL_SENT' }]);
    const rows = await (await fetch(`${url}/records?city=Delhi`)).json();
    assert.equal(rows.data.items.length, 1);
    assert.equal(rows.data.items[0].projectId, String(eec._id));
    const search = await (await fetch(`${url}/search?search=Shared`)).json();
    assert.equal(search.data.items.length, 1);
    assert.equal(search.data.items[0].projectName, 'EEC-B2B');
    assert.equal((await fetch(`${url}/points?projectId=${edify._id}`)).status, 403);
    assert.equal((await fetch(`${url}/points?projectId=all`)).status, 403);
    assert.equal((await fetch(`${url}/records/${other._id}?projectId=${eec._id}`)).status, 404);
    assert.equal((await fetch(`${url}/records/${other._id}/marketing-status?projectId=${eec._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'LOST', expectedVersion: 0 }) })).status, 404);
    const ownRecord = await (await fetch(`${url}/records/${own._id}`)).json();
    assert.equal(ownRecord.data.projectName, 'EEC-B2B');
    assert.equal((await service.getImportedRecord({ projectIds: [String(edify._id)], recordId: String(other._id) })).marketingStatus.currentStage, 'WON');
    assert.equal(await MarketingImport.countDocuments(), 2);
    await Project.create({ ...base, name: 'Duplicate', projectCode: 'EEC-B2B' });
    await assert.rejects(resolveMapProject(), error => error.statusCode === 422);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect(); await mongod.stop();
  }
});

test('strict map platform filtering cannot use a matching label to hide a foreign ID; client fails closed on mixed payloads', async () => {
  const filters = { projectId: 'eec-id', projectCode: 'EEC_B2B', projectName: 'EEC-B2B', strictProject: true };
  const leads = [{ projectId: 'foreign-id', projectName: 'EEC-B2B' }, { projectId: 'EEC_B2B' }, { projectName: 'EEC-B2B' }];
  assert.equal(applyFilters(leads, filters).length, 2);
  const { scopedPayload, belongsToProject, isMapProject } = await import('../../frontend/src/components/ceo/marketing/mapProject.js');
  assert.equal(isMapProject({ code: 'EDIFYEIGHT', name: 'EEC-B2B' }), false);
  assert.equal(belongsToProject({ projectId: 'foreign-id' }, 'eec-id'), false);
  assert.throws(() => scopedPayload({ projectId: 'eec-id', points: [{ projectId: 'foreign-id' }] }, 'eec-id'), /Mixed-project/);
  assert.throws(() => scopedPayload({ points: [] }, 'eec-id'), /selected project/);
  assert.throws(() => scopedPayload({ projectId: 'eec-id', items: [{ projectId: 'foreign-id' }] }, 'eec-id'), /Mixed-project/);
});
