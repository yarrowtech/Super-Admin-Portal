const test = require('node:test');
const assert = require('node:assert/strict');
const {
  attachOptionalProjectContext,
  extractProjectId,
  requireProjectContext,
} = require('../middlewares/project.middleware');
const Project = require('../models/common/Project');

const PROJECT_A = '64b00000000000000000000a';
const PROJECT_B = '64b00000000000000000000b';

const withProjectLookup = async (projects, run) => {
  const original = Project.findById;
  Project.findById = (id) => ({
    select: () => ({ lean: async () => projects[String(id)] || null }),
  });
  try { await run(); } finally { Project.findById = original; }
};

const responseStub = () => ({
  statusCode: 200,
  payload: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.payload = payload;
    return this;
  },
});

test('path project id cannot be overridden by query, header, or body scope', () => {
  const req = {
    params: { projectId: 'project-b' },
    query: { projectId: 'project-a' },
    headers: { 'x-project-id': 'project-a' },
    body: { projectId: 'project-a' },
  };
  assert.equal(extractProjectId(req), 'project-b');
});

test('required project context rejects a path project outside the user assignment', async () => {
  const req = {
    params: { projectId: PROJECT_B },
    query: { projectId: PROJECT_A },
    headers: {},
    body: {},
    user: { assignedProjects: [{ projectId: PROJECT_A }] },
    baseUrl: '/api/law',
  };
  const res = responseStub();
  let nextCalled = false;
  await withProjectLookup({ [PROJECT_B]: { _id: PROJECT_B, name: 'B', projectCode: 'B' } }, async () => {
    await requireProjectContext(req, res, () => { nextCalled = true; });
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.error, 'No access to requested project');
});

test('optional project context rejects an explicitly unauthorized project', async () => {
  const req = {
    params: {},
    query: { projectId: PROJECT_B },
    headers: {},
    body: {},
    user: { assignedProjects: [{ projectId: PROJECT_A }] },
  };
  const res = responseStub();
  let nextCalled = false;
  await withProjectLookup({ [PROJECT_B]: { _id: PROJECT_B, name: 'B', projectCode: 'B' } }, async () => {
    await attachOptionalProjectContext(req, res, () => { nextCalled = true; });
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.error, 'No access to requested project');
});

test('optional project context attaches an authorized project', async () => {
  const req = {
    params: {},
    query: { projectId: PROJECT_A },
    headers: {},
    body: {},
    user: { assignedProjects: [{ projectId: PROJECT_A }] },
  };
  const res = responseStub();
  let nextCalled = false;
  await withProjectLookup({ [PROJECT_A]: { _id: PROJECT_A, name: 'A', projectCode: 'A' } }, async () => {
    await attachOptionalProjectContext(req, res, () => { nextCalled = true; });
  });
  assert.equal(nextCalled, true);
  assert.equal(req.projectId, PROJECT_A);
});

test('required context rejects malformed and nonexistent canonical ids', async () => {
  for (const [projectId, expectedStatus] of [['EdifyEight', 400], [PROJECT_A, 404]]) {
    const req = { params: {}, query: { projectId }, headers: {}, body: {}, user: {}, baseUrl: '/api/law' };
    const res = responseStub();
    await withProjectLookup({}, async () => { await requireProjectContext(req, res, () => {}); });
    assert.equal(res.statusCode, expectedStatus);
  }
});
