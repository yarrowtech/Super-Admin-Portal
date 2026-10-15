const mongoose = require('mongoose');
const env = require('../config/env');
const configuration = require('../services/workspaceConfiguration.service');
const Record = require('../models/WorkspaceRecord');

async function run() {
  if (!env.MONGO_URI) throw new Error('MONGO_URI required');
  const applying = process.argv.includes('--apply');
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000, autoIndex: applying, autoCreate: applying });
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ mode: 'audit', configurations: await require('../models/WorkspaceConfiguration').countDocuments({}), records: await Record.countDocuments({}), action: 'Run with --apply to add missing configurations and indexes. Existing data is preserved.' }));
    return;
  }
  await Record.init();
  await require('../models/WorkspaceProductMember').init();
  await Promise.all(Object.values(require('../models/WorkspaceSync')).map((Model) => Model.init()));
  console.log(JSON.stringify({ mode: 'apply', ...await configuration.initialize() }));
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
