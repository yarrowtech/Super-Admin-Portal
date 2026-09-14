const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const controller = require('../controllers/legalDocument.v2.controller');
const LegalDocument = require('../models/law/LegalDocument.v2');

let mongod;

const userId = new mongoose.Types.ObjectId();
const projectAId = new mongoose.Types.ObjectId();
const projectBId = new mongoose.Types.ObjectId();

const makeReq = ({ body = {}, query = {}, params = {}, user = {} } = {}) => ({
  body,
  query,
  params,
  user: {
    _id: userId,
    id: userId,
    role: 'law_head',
    firstName: 'Law',
    lastName: 'User',
    email: 'law@example.com',
    ...user,
  },
  app: { get: () => null },
});

const makeUpload = (name, mimetype = 'application/pdf', content = 'file') => ({
  originalname: name,
  mimetype,
  size: Buffer.byteLength(content),
  buffer: Buffer.from(content),
});

const makeRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test.beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

test('legal document create persists and project list returns the saved draft only for the matching project', async () => {
  const createRes = makeRes();
  await controller.create(
    makeReq({
      body: {
        title: 'Test Legal Agreement',
        documentNumber: 'LEG-2026-00124',
        description: 'Project A agreement description',
        type: 'Agreement',
        category: 'Commercial',
        priority: 'Medium',
        scope: 'project',
        projectId: String(projectAId),
        projectName: 'Project A',
        effectiveDate: '2026-09-12',
        expiryDate: '2026-12-31',
        tags: JSON.stringify(['NDA', 'Client']),
        internalNotes: 'Internal legal note',
        content: '<p>Agreement body</p>',
      },
    }),
    createRes
  );

  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.body.success, true);
  assert.ok(createRes.body.data._id);
  assert.equal(createRes.body.data.status, 'Draft');

  const saved = await LegalDocument.findById(createRes.body.data._id).lean();
  assert.ok(saved);
  assert.equal(saved.title, 'Test Legal Agreement');
  assert.equal(saved.documentNumber, 'LEG-2026-00124');
  assert.equal(saved.description, 'Project A agreement description');
  assert.equal(saved.category, 'Commercial');
  assert.equal(saved.scope, 'project');
  assert.equal(String(saved.projectId), String(projectAId));
  assert.deepEqual(saved.tags, ['NDA', 'Client']);
  assert.equal(saved.internalNotes, 'Internal legal note');

  const projectARes = makeRes();
  await controller.forProject(makeReq({ query: { projectId: String(projectAId), limit: '100' } }), projectARes);
  assert.equal(projectARes.statusCode, 200);
  assert.equal(projectARes.body.data.total, 1);
  assert.equal(projectARes.body.data.items[0].title, 'Test Legal Agreement');
  assert.equal(projectARes.body.data.items[0].status, 'Draft');

  const projectBRes = makeRes();
  await controller.forProject(makeReq({ query: { projectId: String(projectBId), limit: '100' } }), projectBRes);
  assert.equal(projectBRes.statusCode, 200);
  assert.equal(projectBRes.body.data.total, 0);
  assert.deepEqual(projectBRes.body.data.items, []);
});

test('company scoped legal document remains visible through my documents and is not returned for project lists', async () => {
  const createRes = makeRes();
  await controller.create(
    makeReq({
      body: {
        title: 'Company Policy Draft',
        type: 'Policy',
        priority: 'High',
        scope: 'company',
        content: '<p>Policy body</p>',
      },
    }),
    createRes
  );

  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.body.data.projectId, undefined);
  assert.equal(createRes.body.data.scope, 'company');

  const myDocsRes = makeRes();
  await controller.myDocuments(makeReq({ query: { scope: 'company', limit: '100' } }), myDocsRes);
  assert.equal(myDocsRes.statusCode, 200);
  assert.equal(myDocsRes.body.data.total, 1);
  assert.equal(myDocsRes.body.data.items[0].title, 'Company Policy Draft');

  const projectRes = makeRes();
  await controller.forProject(makeReq({ query: { projectId: String(projectAId), limit: '100' } }), projectRes);
  assert.equal(projectRes.statusCode, 200);
  assert.equal(projectRes.body.data.total, 0);
});

test('legal document create persists uploaded source and supporting attachments', async () => {
  const createRes = makeRes();
  const req = makeReq({
    body: {
      title: 'Uploaded NDA',
      type: 'NDA',
      priority: 'High',
      scope: 'company',
      sourceType: 'upload',
    },
  });
  req.files = {
    sourceFile: [makeUpload('signed-nda.pdf')],
    attachments: [
      makeUpload('approval-note.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      makeUpload('schedule.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    ],
  };

  await controller.create(req, createRes);

  assert.equal(createRes.statusCode, 201);
  const saved = await LegalDocument.findById(createRes.body.data._id).lean();
  assert.equal(saved.attachments.length, 3);
  assert.equal(saved.attachments[0].purpose, 'source');
  assert.equal(saved.attachments[0].originalFileName, 'signed-nda.pdf');
  assert.equal(saved.attachments[1].purpose, 'supporting');
  assert.equal(saved.attachments[2].originalFileName, 'schedule.xlsx');
});
