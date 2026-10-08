const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const service = require('../services/marketingImport.service');
const MarketingImport = require('../models/marketing/MarketingImport');
const Project = require('../models/common/Project');

test('journey is per-record, audited, scoped, concurrency-safe and filterable independently of coordinates', async () => {
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(mongod.getUri());
  try {
    const project = await Project.create({ name: 'Journey project', projectCode: 'JOURNEY', description: 'x', startDate: new Date(), status: 'in-progress', projectManager: new mongoose.Types.ObjectId() });
    const scope = [String(project._id)];
    const actor = { id: String(new mongoose.Types.ObjectId()), role: 'ceo', name: 'Outreach owner' };
    const records = await MarketingImport.create([
      { projectId: project._id, school: 'School A', locationRaw: 'Delhi', city: 'Delhi', state: 'Delhi', latitude: 28.6, longitude: 77.2, batchId: 'journey', email: 'first@example.com' },
      { projectId: project._id, school: 'School A', locationRaw: 'Delhi', city: 'Delhi', state: 'Delhi', latitude: 28.6, longitude: 77.2, batchId: 'journey', email: 'second@example.com' },
      { projectId: project._id, school: 'School B', locationRaw: 'Unknown', batchId: 'journey' },
    ]);
    const config = service.getMarketingJourneyConfig(actor);
    assert.equal(config.stages.length, 15);
    assert.equal(config.canUpdate, true);
    assert.equal(service.getMarketingJourneyConfig({ role: 'media_sales' }).canUpdate, false);
    const before = await service.getImportedRecord({ projectIds: scope, recordId: String(records[0]._id) });
    assert.equal(before.marketingStatus.currentStage, null);
    assert.deepEqual(before.marketingStatus.history, []);
    assert.equal(before.mapped, true);
    const change = { projectIds: scope, recordId: before.id, actor, stage: 'EMAIL_SENT', expectedVersion: 0 };
    await assert.rejects(service.updateMarketingStatus({ ...change, actor: { ...actor, role: 'media_sales' } }), error => error.statusCode === 403);
    await assert.rejects(service.updateMarketingStatus({ ...change, projectIds: [String(new mongoose.Types.ObjectId())] }), error => error.statusCode === 404);
    await assert.rejects(service.updateMarketingStatus({ ...change, stage: 'Mapped' }), error => error.statusCode === 422);
    await assert.rejects(service.updateMarketingStatus({ ...change, scheduledAt: 'invalid date' }), error => error.statusCode === 422);
    const sent = await service.updateMarketingStatus(change);
    assert.equal(sent.marketingStatus.version, 1);
    assert.equal(sent.marketingStatus.history.length, 1);
    assert.equal(sent.marketingStatus.history[0].stage, 'EMAIL_SENT');
    assert.equal(String(sent.marketingStatus.history[0].actorId), actor.id);
    assert.equal(sent.marketingStatus.history[0].actorName, actor.name);
    assert.ok(sent.marketingStatus.history[0].timestamp instanceof Date);
    assert.equal((await service.updateMarketingStatus({ ...change, expectedVersion: 1 })).marketingStatus.history.length, 1, 'identical saves do not append duplicate events');
    await assert.rejects(service.updateMarketingStatus(change), error => error.statusCode === 409);
    const fixed = await service.updateMarketingStatus({ ...change, expectedVersion: 1, stage: 'MEETING_FIXED', scheduledAt: '2026-10-20T00:00:00+05:30', note: 'Confirmed by school' });
    assert.deepEqual(fixed.marketingStatus.history.map(event => event.stage), ['EMAIL_SENT', 'MEETING_FIXED']);
    assert.equal(fixed.marketingStatus.history[1].note, 'Confirmed by school');
    assert.equal(fixed.marketingStatus.scheduledAt.toISOString(), '2026-10-19T18:30:00.000Z');
    assert.equal((await service.getImportedRecord({ projectIds: scope, recordId: String(records[1]._id) })).marketingStatus.currentStage, null, 'another contact at the same school is independent');
    const all = await service.getImportedMapPoints(scope);
    assert.equal(all.total, 3);
    assert.equal(all.pipeline.find(item => item.stage === 'MEETING_FIXED').records, 1);
    assert.equal(all.pipeline.find(item => item.stage === 'NOT_RECORDED').records, 2);
    assert.deepEqual(all.points[0].marketingStages.sort(), ['MEETING_FIXED', 'NOT_RECORDED']);
    const filtered = await service.getImportedMapPoints(scope, { marketingStage: 'MEETING_FIXED' });
    assert.equal(filtered.total, 1);
    assert.equal(filtered.points[0].records, 1);
    assert.ok(!JSON.stringify(filtered).includes('first@example.com'));
    assert.equal((await service.getLocationRecords({ projectIds: scope, city: 'Delhi', marketingStage: 'MEETING_FIXED' })).items[0].marketingStatus.currentStage, 'MEETING_FIXED');
    assert.equal((await service.searchImportedRecords({ projectIds: scope, search: 'School', marketingStage: 'MEETING_FIXED' })).items.length, 1);
    assert.equal((await service.getImportedMapPoints(scope, { marketingStage: 'MEETING_FIXED,NOT_RECORDED' })).total, 3);
    assert.equal((await service.getImportedMapPoints(scope, { marketingStage: 'NOT_RECORDED' })).unresolved, 1);
    await assert.rejects(service.getImportedMapPoints(scope, { marketingStage: 'UNKNOWN' }), error => error.statusCode === 422);
    const races = await Promise.allSettled(['REPLY_RECEIVED', 'ON_HOLD'].map(stage => service.updateMarketingStatus({ ...change, recordId: String(records[1]._id), stage })));
    assert.equal(races.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(races.find(result => result.status === 'rejected').reason.statusCode, 409);
    const lost = await service.updateMarketingStatus({ ...change, recordId: String(records[2]._id), stage: 'ON_HOLD' });
    assert.equal(lost.mapped, false);
    assert.equal(lost.marketingStatus.currentStage, 'ON_HOLD');
    assert.equal((await service.getUnmappedRecords({ projectIds: scope, marketingStage: 'ON_HOLD' })).items[0].marketingStatus.currentStage, 'ON_HOLD');
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});

test('timeline reflects only recorded events, and a negative branch does not imply conversion', async () => {
  const { journeyRows, stageInfo, formatJourneyDate } = await import('../../frontend/src/components/ceo/marketing/journeyData.js');
  const stages = service.getMarketingJourneyConfig({ role: 'ceo' }).stages;
  const rows = journeyRows({ currentStage: 'MEETING_FIXED', history: [{ stage: 'EMAIL_SENT', timestamp: '2026-10-01' }, { stage: 'MEETING_FIXED', timestamp: '2026-10-08' }] }, stages);
  assert.equal(rows.find(row => row.id === 'EMAIL_SENT').state, 'completed');
  assert.equal(rows.find(row => row.id === 'LEAD_IDENTIFIED').state, 'pending');
  assert.equal(rows.find(row => row.id === 'MEETING_FIXED').state, 'current');
  assert.equal(rows.find(row => row.id === 'WON').state, 'pending');
  assert.ok(!rows.some(row => row.id === 'LOST'));
  const lost = journeyRows({ currentStage: 'LOST', history: [{ stage: 'LOST', timestamp: '2026-10-08' }] }, stages);
  assert.equal(lost.find(row => row.id === 'LOST').state, 'current');
  assert.equal(lost.find(row => row.id === 'WON').state, 'pending');
  assert.equal(stageInfo(null, stages).label, 'Not recorded');
  assert.ok(formatJourneyDate('2026-10-19T18:30:00.000Z').includes('20 Oct 2026'));
});
