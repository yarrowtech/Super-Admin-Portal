const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Project = require('../models/common/Project');
const Media = require('../models/department/Media');
const User = require('../models/auth/User');
const library = require('../modules/media/library.service');

test('Project libraries enforce isolation, typed relationships, recoverable revisions and personal workspaces', async () => {
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  try {
    const employee = new mongoose.Types.ObjectId(), colleague = new mongoose.Types.ObjectId(), headId = new mongoose.Types.ObjectId();
    await User.collection.insertMany([{ _id: employee, firstName: 'Marketing', role: 'media_marketing' }, { _id: colleague, firstName: 'Colleague', role: 'media_marketing' }, { _id: headId, firstName: 'Head', role: 'media_head' }]);
    const staff = { _id: employee, role: 'media_marketing' }, head = { _id: headId, role: 'media_head' };
    const [first, second] = await Project.create([
      { name: 'Project Alpha', projectCode: 'ALPHA', description: 'Alpha', projectManager: headId, startDate: new Date(), teamMembers: [{ employee }, { employee: colleague }] },
      { name: 'Future Project', projectCode: 'FUTURE', description: 'Future', projectManager: headId, startDate: new Date() },
    ]);
    const projectId = String(first._id);
    const campaign = await library.create(staff, { projectId, libraryKind: 'campaigns', title: 'Q4 Lead Generation', campaignStatus: 'Planning' });
    const logo = await library.create(staff, { projectId, libraryKind: 'brand', title: 'Primary Logo', subcategory: 'Primary Logo', storageUrl: 'https://fixture.invalid/logo-v1.png', tags: ['brand', 'q4'] });
    const post = await library.create(staff, { projectId, libraryKind: 'social', title: 'LinkedIn launch', campaignId: String(campaign._id), social: { platform: 'LinkedIn', contentType: 'Post', caption: 'Lead generation launch', creativeAssetId: String(logo._id) }, relatedIds: [String(logo._id)] });
    const other = await library.create(head, { projectId: String(second._id), libraryKind: 'creative', title: 'Private banner' });
    await Media.create({ projectId: first._id, title: 'Legacy Logo', category: '', metadata: { assetType: 'LOGO' }, section: 'asset', createdBy: employee });
    const overview = await library.overview(staff);
    assert.equal(overview.projects.length, 1); assert.equal(overview.categories.length, 8);
    assert.equal(overview.totals.brand, 2); assert.equal(overview.totals.social, 1); assert.equal(overview.totals.total, 4);
    assert.ok(overview.tags.includes('brand'));
    assert.equal((await library.overview(head)).projects.length, 2, 'Future projects use the same structure');
    await assert.rejects(library.list(staff, { projectId: String(second._id) }), /access/);
    await assert.rejects(library.detail(staff, String(other._id)), /access/);
    await assert.rejects(library.create(staff, { projectId, libraryKind: 'social', title: 'Invalid relationship', social: { platform: 'LinkedIn' }, relatedIds: [String(other._id)] }), /same project/);
    assert.equal((await library.list(staff, { search: 'Lead generation' })).pagination.total, 2, 'Search covers captions and campaigns');
    assert.equal((await library.list(staff, { kind: 'brand', limit: 1 })).pagination.total, 2);
    assert.equal((await library.list(staff, { platform: 'LinkedIn', assetType: 'Post' })).pagination.total, 1);
    assert.equal((await library.list(staff, { assetType: 'LOGO' })).pagination.total, 1);
    assert.equal((await library.detail(staff, String(campaign._id))).related[0].title, post.title);
    assert.equal((await library.detail(staff, String(logo._id))).related[0].title, post.title);
    await Media.updateOne({ _id: logo._id }, { $set: { approvalStatus: 'approved', status: 'Approved', approvedAt: new Date() } });
    const approvedLogo = await library.detail(staff, String(logo._id));
    const revision = await library.update(staff, String(logo._id), { expectedUpdatedAt: approvedLogo.updatedAt.toISOString(), storageUrl: 'https://fixture.invalid/logo-v2.png', versionNote: 'Updated symbol' });
    assert.equal(revision.version.history.length, 2);
    assert.equal(revision.version.history[0].snapshot.approval.status, 'approved');
    assert.equal(revision.version.history[1].snapshot.approval.status, 'draft');
    assert.equal(revision.version.history[0].snapshot.storageUrl, 'https://fixture.invalid/logo-v1.png');
    await assert.rejects(library.update(staff, String(logo._id), { expectedUpdatedAt: logo.updatedAt.toISOString(), title: 'Stale edit' }), /changed/);
    const restored = await library.action(staff, String(logo._id), { action: 'restore-version', number: 1, expectedUpdatedAt: revision.updatedAt.toISOString() });
    assert.equal(restored.storageUrl, 'https://fixture.invalid/logo-v1.png'); assert.equal(restored.version.history.length, 3);
    await library.action(staff, String(post._id), { action: 'favorite', enabled: true });
    assert.equal((await library.list(staff, { workspace: 'favorites' })).items[0].title, post.title);
    await assert.rejects(library.action(staff, String(post._id), { action: 'share', userId: String(headId) + 'bad' }), /allocated/);
    await library.action(staff, String(post._id), { action: 'share', userId: String(colleague) });
    assert.equal((await library.list({ _id: colleague, role: 'media_marketing' }, { workspace: 'shared' })).pagination.total, 1);
    const freshPost = await library.detail(staff, String(post._id));
    await assert.rejects(library.action(staff, String(post._id), { action: 'publish', expectedUpdatedAt: freshPost.updatedAt.toISOString() }), /Approval/);
    const archived = await library.action(staff, String(post._id), { action: 'archive', expectedUpdatedAt: freshPost.updatedAt.toISOString() });
    assert.equal((await library.list(staff, { kind: 'social' })).pagination.total, 0);
    assert.equal((await library.list(staff, { kind: 'archive' })).pagination.total, 1);
    const trashed = await library.action(staff, String(post._id), { action: 'trash', expectedUpdatedAt: archived.updatedAt.toISOString() });
    assert.equal((await library.list(staff, { workspace: 'trash' })).pagination.total, 1);
    assert.equal((await library.overview(staff)).totals.total, 3);
    await library.action(staff, String(post._id), { action: 'restore', expectedUpdatedAt: trashed.updatedAt.toISOString() });
    assert.equal((await library.list(staff, { workspace: 'trash' })).pagination.total, 0);
    await Media.updateOne({ _id: logo._id }, { $set: { approvalStatus: 'pending' } });
    assert.equal((await library.list(staff, { search: 'pending approval logo' })).pagination.total, 1);
    assert.equal((await library.list(staff, { relatedTo: String(campaign._id) })).pagination.total, 0, 'Archived children stay out of active related content');
    const pending = await library.detail(staff, String(logo._id));
    await assert.rejects(library.update(staff, String(logo._id), { title: 'Blocked edit', expectedUpdatedAt: pending.updatedAt.toISOString() }), /review/);
    assert.equal((await library.list(staff, { workspace: 'approvals' })).pagination.total, 1);
    assert.equal((await library.list(staff, { search: '.*' })).pagination.total, 0);
    const express = require('express');
    const app = express(); app.use(express.json()); app.use((req, res, next) => { req.user = staff; next(); });
    app.use('/library', require('../modules/media/library.routes'));
    const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
    try {
      const base = `http://127.0.0.1:${server.address().port}/library`;
      assert.equal((await fetch(`${base}/items?projectId=${second._id}`)).status, 403);
      assert.equal((await fetch(`${base}/items?limit=10000`)).status, 400);
      assert.equal((await fetch(`${base}/items/not-a-valid-id`)).status, 400);
      const response = await fetch(`${base}/overview`, { headers: { 'x-project-id': String(second._id) } });
      assert.equal((await response.json()).data.projects[0].id, projectId, 'Explicit library scope ignores unrelated stored portal headers');
      assert.equal((await fetch(`${base}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, title: 'Unsafe URL', libraryKind: 'creative', storageUrl: 'javascript:alert(1)' }) })).status, 400);
    } finally { await new Promise(resolve => server.close(resolve)); }

  } finally { await mongoose.disconnect(); await mongo.stop(); }
});
