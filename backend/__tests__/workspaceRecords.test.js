const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const records = require('../services/workspaceRecords.service');
const Record = require('../models/WorkspaceRecord');
const user = { role: 'employee', metadata: { projectAssignments: [{ projectCode: 'EEC', permissions: ['workspace.write'] }] } };

test('workspace scope rejects sibling projects despite legacy fuzzy matching', () => {
  assert.equal(records.scope(user, 'EEC').projectId, 'EEC');
  assert.throws(() => records.scope(user, 'EEC_B2B'), { statusCode: 404 });
  assert.throws(() => records.scope(user, 'MATEBID'), { statusCode: 404 });
  assert.deepEqual(records.queryScope(user).projectId.$in, ['EEC']);
});
test('workspace writes require operation permission', () => {
  assert.throws(() => records.scope({ role: 'employee', assignedProjects: ['EEC'] }, 'EEC', true), { statusCode: 403 });
});
test('revoked exact assignment cannot inherit access from an active fuzzy sibling', () => {
  const member = { role: 'employee', assignedProjects: [{ projectCode: 'EEC_B2B', status: 'active' }, { projectCode: 'EEC', status: 'revoked' }] };
  assert.throws(() => records.scope(member, 'EEC'), { statusCode: 404 });
});
test('resource detail filters authorized project IDs in database query', async () => {
  const original = Record.findOne;
  const Project = require('../models/common/Project');
  const originalProjectFind = Project.find;
  Project.find = () => ({ select: () => ({ lean: async () => [] }) });
  const ready = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;
  let filter;
  Record.findOne = (value) => { filter = value; return { lean: async () => null }; };
  try {
    await assert.rejects(records.detail(user, '507f1f77bcf86cd799439011', 'customer'), { statusCode: 404 });
    assert.deepEqual(filter.projectId.$in, ['EEC']);
    assert.equal(filter.organizationId, 'HOUSE_OF_MUSA');
    assert.equal(filter.kind, 'customer');
  } finally { Record.findOne = original; Project.find = originalProjectFind; mongoose.connection.readyState = ready; }
});
test('database outage produces failure rather than empty success', async () => {
  const ready = mongoose.connection.readyState;
  mongoose.connection.readyState = 0;
  try { await assert.rejects(records.list(user, 'EEC', 'product'), { statusCode: 503 }); }
  finally { mongoose.connection.readyState = ready; }
});
test('resource model has tenant and external deduplication indexes', () => {
  assert.ok(Record.schema.indexes().some(([fields, options]) => fields.externalRecordId && fields.projectId && options.unique));
});
