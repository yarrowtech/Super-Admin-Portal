const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/auth/User');
const service = require('../services/workspaceSync.service');
const { Job, External, State } = require('../models/WorkspaceSync');

async function run() {
  const integrationId = process.argv[2];
  if (!service.adapters[integrationId]) throw new Error('Known integration ID required');
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await Promise.all([Job.init(), External.init(), State.init()]);
  const actor = await User.findOne({ role: 'admin', isActive: true }) || await User.findOne({ role: 'super_admin', isActive: true });
  if (!actor) throw new Error('Active administrative actor required');
  const connection = await service.testConnection(actor, integrationId);
  if (!process.argv.includes('--sync')) { console.log(JSON.stringify(connection)); return; }
  const job = await service.enqueue(actor, integrationId, {});
  const deadline = Date.now() + 60000;
  let result;
  while (Date.now() < deadline) {
    await service.processOne();
    result = await service.jobDetail(actor, String(job._id));
    if (['succeeded', 'failed'].includes(result.status)) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const adapter = service.adapters[integrationId];
  const cachedRecords = await External.countDocuments({ organizationId: 'HOUSE_OF_MUSA', projectId: adapter.projectId, integrationId, present: { $ne: false } });
  console.log(JSON.stringify({ integrationId, connection: connection.status, jobId: String(job._id), status: result.status, processed: result.processed, cachedRecords, error: result.error || null }));
  if (result.status !== 'succeeded') process.exitCode = 1;
}
run().catch((error) => { console.error(JSON.stringify({ error: error.statusCode ? error.message : 'Integration verification failed', code: error.code || error.name })); process.exitCode = 1; }).finally(() => mongoose.disconnect());
