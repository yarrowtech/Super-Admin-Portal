const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const links = require('../middlewares/lawTaskLinks');
const Task = require('../models/common/Task');
const Project = require('../models/common/Project');
const LegalDocument = require('../models/law/LegalDocument.v2');
const LegalDocumentVersion = require('../models/law/LegalDocumentVersion.v2');

// End-to-end rules for the Law "head shares a project document → employee edits it" flow.

let mongod;
const oid = () => new mongoose.Types.ObjectId();
const headId = oid();
const empId = oid();
const otherEmpId = oid();
const projectA = oid();
const projectB = oid();

const users = {
  head: { _id: headId, id: headId, role: 'law_head', firstName: 'Law', lastName: 'Head' },
  emp: { _id: empId, id: empId, role: 'law_employee', firstName: 'Emp', lastName: 'One' },
  other: { _id: otherEmpId, id: otherEmpId, role: 'law_employee', firstName: 'Emp', lastName: 'Two' },
};

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});

// Runs a middleware; resolves with { res, nextCalled, req }.
const run = async (fn, { user, body = {}, params = {}, query = {} }) => {
  const req = { user, body, params, query };
  const res = makeRes();
  let nextCalled = false;
  await fn(req, res, (err) => { if (err) throw err; nextCalled = true; });
  return { req, res, nextCalled };
};

const makeDoc = (over = {}) => LegalDocument.create({
  title: 'MSA', type: 'Agreement', scope: 'project', projectId: projectA, projectName: 'Alpha',
  latestContent: '<p>v1</p>', status: 'Draft', ...over,
});

const makeTask = (over = {}) => Task.create({
  title: 'Work on MSA', description: 'Update it', assignedTo: empId, assignedBy: headId,
  dueDate: new Date(Date.now() + 86400000), project: projectA, ...over,
});

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
test.after(async () => { await mongoose.disconnect(); await mongod.stop(); });
test.beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  // Raw inserts: only the ids matter here, not the Project schema's required fields.
  await Project.collection.insertMany([{ _id: projectA, name: 'Alpha' }, { _id: projectB, name: 'Beta' }]);
});

test('head may link only live legal documents of the task project', async () => {
  const docA = await makeDoc();
  const docB = await makeDoc({ projectId: projectB, title: 'Other project doc' });
  const archived = await makeDoc({ title: 'Old', isArchived: true });

  const ok = await run(links.validateLinkedItems, { user: users.head, body: { project: String(projectA), linkedItems: [{ module: 'document', recordId: String(docA._id), canEdit: true }] } });
  assert.equal(ok.nextCalled, true);
  assert.deepEqual(ok.req.validatedLinkedItems.map((l) => l.canEdit), [true]);
  assert.equal(ok.req.validatedProject, String(projectA));

  const wrongProject = await run(links.validateLinkedItems, { user: users.head, body: { project: String(projectA), linkedItems: [{ module: 'document', recordId: String(docB._id) }] } });
  assert.equal(wrongProject.res.statusCode, 400);

  const noProject = await run(links.validateLinkedItems, { user: users.head, body: { linkedItems: [{ module: 'document', recordId: String(docA._id) }] } });
  assert.equal(noProject.res.statusCode, 400);

  const contract = await run(links.validateLinkedItems, { user: users.head, body: { project: String(projectA), linkedItems: [{ module: 'contract', recordId: String(oid()) }] } });
  assert.equal(contract.res.statusCode, 400);

  const archivedLink = await run(links.validateLinkedItems, { user: users.head, body: { project: String(projectA), linkedItems: [{ module: 'document', recordId: String(archived._id) }] } });
  assert.equal(archivedLink.res.statusCode, 404);

  const byEmployee = await run(links.validateLinkedItems, { user: users.emp, body: { linkedItems: [] } });
  assert.equal(byEmployee.res.statusCode, 403);
});

test('updating a task reuses its stored project and blocks moving away from linked documents', async () => {
  const docA = await makeDoc();
  const task = await makeTask({ linkedItems: [{ module: 'document', recordId: docA._id, canEdit: true }] });

  const toggle = await run(links.validateLinkedItems, { user: users.head, params: { id: String(task._id) }, body: { linkedItems: [{ module: 'document', recordId: String(docA._id), canEdit: false }] } });
  assert.equal(toggle.nextCalled, true);
  assert.equal(toggle.req.validatedLinkedItems[0].canEdit, false);

  const move = await run(links.validateLinkedItems, { user: users.head, params: { id: String(task._id) }, body: { project: String(projectB) } });
  assert.equal(move.res.statusCode, 400);
});

test('linkable list requires a project and returns only its live documents', async () => {
  await makeDoc({ title: 'A1' });
  await makeDoc({ title: 'A-archived', isArchived: true });
  await makeDoc({ title: 'B1', projectId: projectB });

  const missing = await run(links.listLinkableItems, { user: users.head, query: {} });
  assert.equal(missing.res.statusCode, 400);

  const list = await run(links.listLinkableItems, { user: users.head, query: { projectId: String(projectA) } });
  assert.deepEqual(list.res.body.data.map((d) => d.title), ['A1']);
  assert.ok(list.res.body.data.every((d) => d.module === 'document'));

  const asEmployee = await run(links.listLinkableItems, { user: users.emp, query: { projectId: String(projectA) } });
  assert.equal(asEmployee.res.statusCode, 403);
});

test('assignee with edit rights sees the body, saves a version and adds notes; others cannot', async () => {
  const doc = await makeDoc();
  const task = await makeTask({ linkedItems: [{ module: 'document', recordId: doc._id, canEdit: true }] });
  const params = { taskId: String(task._id), recordId: String(doc._id) };

  const detail = await run(links.getTaskItem, { user: users.emp, params });
  assert.equal(detail.res.statusCode, 200);
  assert.equal(detail.res.body.data.canEdit, true);
  assert.equal(detail.res.body.data.content, '<p>v1</p>');
  assert.equal(detail.res.body.data.taskStatus, 'pending');
  assert.equal(detail.res.body.data.isAssignee, true);
  const headView = await run(links.getTaskItem, { user: users.head, params });
  assert.equal(headView.res.body.data.isAssignee, false);

  const save = await run(links.saveTaskItemContent, { user: users.emp, params, body: { content: '<p>v2</p>', changeSummary: 'Tightened clause 7' } });
  assert.equal(save.res.statusCode, 200);
  assert.equal(save.res.body.data.version, 'v1.1');
  const saved = await LegalDocument.findById(doc._id).lean();
  assert.equal(saved.latestContent, '<p>v2</p>');
  const versions = await LegalDocumentVersion.find({ documentId: doc._id }).lean();
  assert.equal(versions.length, 1);
  assert.equal(versions[0].changeSummary, 'Tightened clause 7');

  const note = await run(links.addTaskItemAnnotation, { user: users.emp, params, body: { kind: 'highlight', text: 'Liability capped at 1x', critical: true, quote: 'liability shall not exceed the fees paid' } });
  assert.equal(note.res.statusCode, 201);
  assert.equal(note.res.body.data.critical, true);
  assert.equal(note.res.body.data.quote, 'liability shall not exceed the fees paid');
  const withQuote = await run(links.getTaskItem, { user: users.emp, params });
  assert.equal(withQuote.res.body.data.annotations[0].quote, 'liability shall not exceed the fees paid');

  // Another employee: the task is not theirs — hidden entirely.
  const intruder = await run(links.getTaskItem, { user: users.other, params });
  assert.equal(intruder.res.statusCode, 404);
  const intruderSave = await run(links.saveTaskItemContent, { user: users.other, params, body: { content: 'x' } });
  assert.equal(intruderSave.res.statusCode, 404);

  // Only the author or the head may delete a note.
  const annotationId = String(note.res.body.data._id);
  const headDelete = await run(links.deleteTaskItemAnnotation, { user: users.head, params: { ...params, annotationId } });
  assert.equal(headDelete.res.statusCode, 200);
  assert.equal((await LegalDocument.findById(doc._id).lean()).annotations.length, 0);
});

test('read-only links, closed tasks and submitted documents cannot be edited', async () => {
  const doc = await makeDoc();
  const readOnly = await makeTask({ linkedItems: [{ module: 'document', recordId: doc._id, canEdit: false }] });
  const roParams = { taskId: String(readOnly._id), recordId: String(doc._id) };

  const roDetail = await run(links.getTaskItem, { user: users.emp, params: roParams });
  assert.equal(roDetail.res.body.data.canEdit, false);
  assert.equal(roDetail.res.body.data.content, undefined, 'read-only viewers never receive the body');
  assert.equal((await run(links.saveTaskItemContent, { user: users.emp, params: roParams, body: { content: 'x' } })).res.statusCode, 403);
  assert.equal((await run(links.addTaskItemAnnotation, { user: users.emp, params: roParams, body: { text: 'x' } })).res.statusCode, 403);

  const closed = await makeTask({ status: 'completed', linkedItems: [{ module: 'document', recordId: doc._id, canEdit: true }] });
  const closedParams = { taskId: String(closed._id), recordId: String(doc._id) };
  assert.equal((await run(links.saveTaskItemContent, { user: users.emp, params: closedParams, body: { content: 'x' } })).res.statusCode, 403);

  const pendingDoc = await makeDoc({ title: 'Submitted', status: 'Pending' });
  const pendingTask = await makeTask({ linkedItems: [{ module: 'document', recordId: pendingDoc._id, canEdit: true }] });
  const pendingParams = { taskId: String(pendingTask._id), recordId: String(pendingDoc._id) };
  assert.equal((await run(links.saveTaskItemContent, { user: users.emp, params: pendingParams, body: { content: 'x' } })).res.statusCode, 403);
  // Notes are still allowed on a submitted document.
  assert.equal((await run(links.addTaskItemAnnotation, { user: users.emp, params: pendingParams, body: { text: 'Check signature block' } })).res.statusCode, 201);
});

test('head adds, flags and removes key points on the document; employee list previews them', async () => {
  const docCtrl = require('../controllers/legalDocument.v2.controller');
  const doc = await makeDoc();
  await makeTask({ linkedItems: [{ module: 'document', recordId: doc._id, canEdit: true }] });
  const call = async (fn, { params = {}, body = {} }) => {
    const res = makeRes();
    await fn({ user: users.head, params: { id: String(doc._id), ...params }, body, app: { get: () => null } }, res);
    return res;
  };

  const added = await call(docCtrl.addAnnotation, { body: { kind: 'highlight', text: 'Indemnity is uncapped' } });
  assert.equal(added.statusCode, 201);
  const annotationId = String(added.body.data._id);
  assert.equal((await call(docCtrl.addAnnotation, { body: { text: '   ' } })).statusCode, 400);

  const flagged = await call(docCtrl.updateAnnotation, { params: { annotationId }, body: { critical: true } });
  assert.equal(flagged.statusCode, 200);
  assert.equal(flagged.body.data.critical, true);
  await call(docCtrl.addAnnotation, { body: { kind: 'note', text: 'Client prefers Indian law' } });

  const mine = await run(links.listMyItems, { user: users.emp });
  const row = mine.res.body.data[0];
  assert.equal(row.annotationCount, 2);
  assert.equal(row.criticalCount, 1);
  assert.equal(row.highlightCount, 1);
  assert.deepEqual(row.topPoints.map((p) => p.text), ['Indemnity is uncapped']);

  assert.equal((await call(docCtrl.deleteAnnotation, { params: { annotationId } })).statusCode, 200);
  assert.equal((await LegalDocument.findById(doc._id).lean()).annotations.length, 1);
});

test('head monitor lists every assignment with progress, edits and notes; employees are refused', async () => {
  const doc = await makeDoc();
  const task = await makeTask({ status: 'in-progress', linkedItems: [{ module: 'document', recordId: doc._id, canEdit: true }] });
  const params = { taskId: String(task._id), recordId: String(doc._id) };
  await run(links.saveTaskItemContent, { user: users.emp, params, body: { content: '<p>v2</p>', changeSummary: 'Redlined clause 4' } });
  await run(links.addTaskItemAnnotation, { user: users.emp, params, body: { kind: 'highlight', text: 'Termination needs 90 days', critical: true } });

  const denied = await run(links.monitorDocumentWork, { user: users.emp });
  assert.equal(denied.res.statusCode, 403);

  const { res } = await run(links.monitorDocumentWork, { user: users.head });
  assert.equal(res.statusCode, 200);
  const [row] = res.body.data.rows;
  assert.equal(res.body.data.rows.length, 1);
  assert.equal(row.taskStatus, 'in-progress');
  assert.equal(row.canEdit, true);
  assert.equal(row.criticalCount, 1);
  assert.equal(row.assigneeNoteCount, 1);
  assert.equal(row.assigneeLastEdit.version, 'v1.1');
  assert.equal(row.assigneeLastEdit.summary, 'Redlined clause 4');
  const types = res.body.data.activity.map((a) => a.type).sort();
  assert.deepEqual(types, ['edit', 'highlight']);
});

test('employees only ever see legal-document links, even on older tasks', async () => {
  const doc = await makeDoc();
  const legacyRecordId = oid();
  const task = await makeTask({
    linkedItems: [
      { module: 'document', recordId: doc._id, canEdit: true },
      { module: 'record', recordId: legacyRecordId },
    ],
  });

  const mine = await run(links.listMyItems, { user: users.emp });
  assert.deepEqual(mine.res.body.data.map((d) => d.module), ['document']);
  assert.equal(mine.res.body.data[0].projectName, 'Alpha');

  const legacy = await run(links.getTaskItem, { user: users.emp, params: { taskId: String(task._id), recordId: String(legacyRecordId) } });
  assert.equal(legacy.res.statusCode, 404);
});
