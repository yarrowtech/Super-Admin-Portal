const test = require('node:test');
const assert = require('node:assert/strict');
const {
  attachOptionalProjectContext,
  extractProjectId,
  requireProjectContext,
} = require('../middlewares/project.middleware');

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

test('required project context rejects a path project outside the user assignment', () => {
  const req = {
    params: { projectId: 'project-b' },
    query: { projectId: 'project-a' },
    headers: {},
    body: {},
    user: { assignedProjects: [{ projectId: 'project-a' }] },
    baseUrl: '/api/law',
  };
  const res = responseStub();
  let nextCalled = false;
  requireProjectContext(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.error, 'No access to requested project');
});

test('optional project context rejects an explicitly unauthorized project', () => {
  const req = {
    params: {},
    query: { projectId: 'project-b' },
    headers: {},
    body: {},
    user: { assignedProjects: [{ projectId: 'project-a' }] },
  };
  const res = responseStub();
  let nextCalled = false;
  attachOptionalProjectContext(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.error, 'No access to requested project');
});

test('optional project context attaches an authorized project', () => {
  const req = {
    params: {},
    query: { projectId: 'project-a' },
    headers: {},
    body: {},
    user: { assignedProjects: [{ projectId: 'project-a' }] },
  };
  const res = responseStub();
  let nextCalled = false;
  attachOptionalProjectContext(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.projectId, 'project-a');
});
