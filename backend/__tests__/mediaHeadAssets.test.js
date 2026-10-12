const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Project = require('../models/common/Project');
const User = require('../models/auth/User');
const Media = require('../models/department/Media');
const { getHeadAssets } = require('../modules/media/headAssets.service');

test('Head assets preserve actual authors, global projects, current allocations and historical work', async () => {
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  try {
    const creator = new mongoose.Types.ObjectId(), editor = new mongoose.Types.ObjectId(), idle = new mongoose.Types.ObjectId();
    await User.collection.insertMany([
      { _id: creator, firstName: 'Alice', lastName: 'Creator', role: 'media_marketing', isActive: true },
      { _id: editor, firstName: 'Bob', lastName: 'Editor', role: 'media_head', isActive: true },
      { _id: idle, firstName: 'Idle', lastName: 'User', role: 'media_marketing', isActive: true },
    ]);
    const [project, other] = await Project.create([
      { name: 'YARROWTECH', projectCode: 'YARROWTECH', description: 'Company', startDate: new Date(), projectManager: editor, teamMembers: [{ employee: creator }, { employee: idle }] },
      { name: 'Other Global Project', projectCode: 'OTHER', description: 'Other', startDate: new Date(), projectManager: editor },
    ]);
    await Media.create([
      { title: 'Company Logo', section: 'asset', projectId: project._id, projectName: 'Incorrect legacy name', createdBy: creator, updatedBy: editor },
      { title: 'Old Video', section: 'video', projectId: other._id, createdBy: creator },
      { title: 'Exclude campaign', section: 'campaign', projectId: project._id, createdBy: creator },
    ]);
    await Media.collection.updateOne({ title: 'Old Video' }, { $set: { updatedAt: new Date(Date.now() - 8 * 86400000), approvalStatus: 'pending' } });
    const all = await getHeadAssets({});
    assert.equal(all.summary.total, 2);
    assert.equal(all.summary.missingFile, 2);
    assert.equal(all.summary.pending, 1);
    assert.equal(all.summary.stale, 1);
    const attention = await getHeadAssets({ attention: 'stale' });
    assert.equal(attention.pagination.total, 1);
    assert.equal(attention.items[0].title, 'Old Video');
    assert.equal(attention.summary.total, 2, 'Totals span every page and ignore attention filters');
    assert.equal((await getHeadAssets({ approvalStatus: 'pending' })).pagination.total, 1);
    assert.equal((await getHeadAssets({ approvalStatus: 'approved', attention: 'stale' })).pagination.total, 0);
    assert.equal((await getHeadAssets({ projectId: String(project._id) })).summary.stale, 0);
    assert.equal(all.pagination.total, 2);
    const logo = all.items.find(item => item.title === 'Company Logo');
    assert.equal(logo.projectName, 'YARROWTECH');
    assert.equal(logo.creatorName, 'Alice Creator'); assert.equal(logo.updatedByName, 'Bob Editor');
    assert.equal(logo.creatorCurrentlyAllocated, true);
    assert.equal(all.items.find(item => item.title === 'Old Video').creatorCurrentlyAllocated, false);
    assert.deepEqual(all.contributors.find(user => user.id === String(creator)).allocatedProjects.map(project => project.name), ['YARROWTECH']);
    assert.equal(all.contributors.find(user => user.id === String(idle)).recordCount, 0);
    assert.equal(all.contributors.find(user => user.id === String(editor)).recordCount, 1);
    assert.equal((await getHeadAssets({ userId: String(editor) })).items[0].title, 'Company Logo');
    const filtered = await getHeadAssets({ projectId: String(project._id), userId: String(creator), section: 'asset', search: 'Logo', limit: 1 });
    assert.equal(filtered.pagination.total, 1); assert.equal(filtered.items.length, 1);
    assert.equal(filtered.contributors.find(user => user.id === String(creator)).recordCount, 1);
    await Project.updateOne({ _id: project._id }, { $pull: { teamMembers: { employee: creator } } });
    const revoked = await getHeadAssets({ userId: String(creator) });
    assert.equal(revoked.pagination.total, 2);
    assert.ok(revoked.items.every(item => !item.creatorCurrentlyAllocated));
    assert.equal(revoked.contributors.find(user => user.id === String(creator)).allocatedProjects.length, 0);
    assert.equal((await getHeadAssets({ search: '.*' })).pagination.total, 0, 'Search is literal');
    assert.equal((await getHeadAssets({ limit: 1, page: 2 })).items.length, 1);
  } finally { await mongoose.disconnect(); await mongo.stop(); }
});

test('Head asset oversight excludes Marketing roles', () => {
  const { canViewMediaHead } = require('../modules/media/media.middleware');
  let status, allowed = false;
  const res = { status(code) { status = code; return this; }, json() {} };
  canViewMediaHead({ user: { role: 'media_marketing' } }, res, () => { allowed = true; });
  assert.equal(status, 403); assert.equal(allowed, false);
  canViewMediaHead({ user: { role: 'media_head' } }, res, () => { allowed = true; });
  assert.equal(allowed, true);
});
