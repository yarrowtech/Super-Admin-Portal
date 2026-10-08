const test = require('node:test');
const assert = require('node:assert/strict');
test('bulk assets continue after a failure and retry creation without uploading successful files again', async () => {
  const { uploadAssetBatch } = await import('../../frontend/src/components/media/bulkAssetUpload.js');
  const entries = ['one', 'two', 'three'].map(id => ({ id, title: id, status: 'queued', file: { name: `${id}.png`, type: 'image/png', size: 10 } }));
  const uploads = [], payloads = [], created = [];
  let fail = true;
  const options = { entries, projectId: 'selected-project', category: ' Logos ', description: ' Campaign ',
    uploadFile: async (file, project) => { uploads.push(file.name); assert.equal(project, 'selected-project'); return { data: { url: `https://fixture.invalid/${file.name}`, storageKey: file.name, storageProvider: 'cloudinary' } }; },
    createAsset: async payload => { payloads.push(payload); if (payload.title === 'two' && fail) throw Error('Creation failed'); return { data: { id: payload.title } }; },
    onChange: () => {}, onCreated: asset => created.push(asset.id),
  };
  const first = await uploadAssetBatch(options);
  assert.deepEqual(first.map(entry => entry.status), ['complete', 'failed', 'complete']);
  assert.equal(first[1].error, 'Creation failed');
  assert.equal(first[1].uploaded.storageKey, 'two.png');
  assert.deepEqual(created, ['one', 'three']);
  assert.ok(payloads.every(payload => payload.projectId === 'selected-project' && payload.category === 'Logos' && payload.description === 'Campaign' && payload.moduleType === 'asset'));
  fail = false;
  const second = await uploadAssetBatch({ ...options, entries: first });
  assert.deepEqual(second.map(entry => entry.status), ['complete', 'complete', 'complete']);
  assert.deepEqual(uploads, ['one.png', 'two.png', 'three.png']);
  assert.deepEqual(created, ['one', 'three', 'two']);
});
test('bulk assets retry a failed upload and require a project before sending files', async () => {
  const { uploadAssetBatch } = await import('../../frontend/src/components/media/bulkAssetUpload.js');
  let attempts = 0;
  const options = { entries: [{ id: 'file', title: 'Asset', status: 'queued', file: { type: 'application/pdf', size: 12 } }], projectId: 'project', category: '', description: '',
    uploadFile: async () => { if (++attempts === 1) throw Error('Network failure'); return { data: { url: 'https://fixture.invalid/file.pdf' } }; },
    createAsset: async () => ({ data: { id: 'saved' } }), onChange: () => {}, onCreated: () => {},
  };
  await assert.rejects(uploadAssetBatch({ ...options, projectId: '' }), /Select a project/);
  assert.equal(attempts, 0);
  const failed = await uploadAssetBatch(options);
  assert.equal(failed[0].status, 'failed');
  assert.equal((await uploadAssetBatch({ ...options, entries: failed }))[0].status, 'complete');
  assert.equal(attempts, 2);
});
