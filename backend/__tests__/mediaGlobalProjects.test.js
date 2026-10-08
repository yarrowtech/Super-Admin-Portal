const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Project = require('../models/common/Project');
const service = require('../modules/media/media.service');
test('Media uses all global projects, including MATEBID and new names, while staff access stays assigned', async () => {
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  try {
    const manager = new mongoose.Types.ObjectId(), employee = new mongoose.Types.ObjectId();
    const base = { description: 'Global project', startDate: new Date(), projectManager: manager };
    const [matebid, custom] = await Project.create([{ ...base, name: 'MATEBID', projectCode: 'MATEBID' }, { ...base, name: 'New Global Initiative', projectCode: 'NEW_GLOBAL', teamMembers: [{ employee }] }]);
    const head = await service.listMediaHeadProjects({ limit: 100 });
    assert.equal(head.pagination.total, 2);
    assert.ok(head.items.some(item => String(item._id || item.id) === String(matebid._id) && item.name === 'MATEBID'));
    assert.ok(head.items.some(item => item.name === custom.name));
    const list = await service.listProjects({}, { role: 'media_head', _id: manager });
    assert.equal(list.pagination.total, 2);
    const staff = await service.listProjects({}, { role: 'media_marketing', _id: employee });
    assert.equal(staff.pagination.total, 1); assert.equal(String(staff.items[0]._id), String(custom._id));
    assert.equal(await service.hasMediaProjectAccess({ role: 'media_marketing', _id: employee }, matebid._id), false);
    const otherAccount = new mongoose.Types.ObjectId();
    const unassigned = { role: 'media_marketing', _id: otherAccount };
    assert.equal((await service.listProjects({}, unassigned)).pagination.total, 0);
    // Historical work and another user's assignments cannot grant this account access.
    assert.equal(await service.hasMediaProjectAccess(unassigned, custom._id), false);
    await Project.updateOne({ _id: custom._id }, { $push: { teamMembers: { employee: otherAccount } } });
    assert.equal((await service.listProjects({}, unassigned)).pagination.total, 1);
    assert.equal(await service.hasMediaProjectAccess(unassigned, custom._id), true);
    await Project.updateOne({ _id: custom._id }, { $pull: { teamMembers: { employee: otherAccount } } });
    assert.equal((await service.listProjects({}, unassigned)).pagination.total, 0);
    assert.equal(await service.hasMediaProjectAccess(unassigned, custom._id), false);
    assert.equal((await service.getProjectDetailForHead(String(custom._id))).project.name, custom.name);
    await Project.updateOne({ _id: custom._id }, { $set: { name: 'Renamed Global Initiative' } });
    assert.ok((await service.listMediaHeadProjects()).items.some(item => item.name === 'Renamed Global Initiative'));
    const { getGlobalProjectIdentities, applyGlobalProjectIdentity } = require('../services/globalProjectIdentity.service');
    const portal = applyGlobalProjectIdentity({ code: 'NEW_GLOBAL', name: 'Old catalogue name', accessGranted: false, launchUrl: 'https://fixture.invalid' }, await getGlobalProjectIdentities());
    assert.equal(portal.name, 'Renamed Global Initiative'); assert.equal(portal.projectId, String(custom._id));
    assert.equal(portal.accessGranted, false); assert.equal(portal.launchUrl, 'https://fixture.invalid');
    const { resolveCanonicalProjects } = await import('../../frontend/src/config/projectNames.js');
    const launchProjects = resolveCanonicalProjects([{ code: 'MATEBID', name: 'Global MATEBID name', projectId: String(matebid._id), accessGranted: true }]);
    assert.equal(launchProjects.find(project => project.code === 'MATEBID').name, 'Global MATEBID name');
  } finally { await mongoose.disconnect(); await mongo.stop(); }
});
