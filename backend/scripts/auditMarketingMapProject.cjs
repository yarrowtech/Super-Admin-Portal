// Read-only: no migrations, seeding, relabeling, index creation or record updates.
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);
const { resolveMapProject } = require('../middlewares/marketingMapScope.middleware');
const MarketingImport = require('../models/marketing/MarketingImport');
async function main() {
  try {
    if (!process.env.MONGO_URI) throw new Error('missing configuration');
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000 });
    const project = await resolveMapProject();
    const records = await MarketingImport.countDocuments({ projectId: project.id });
    const foreignRecords = await MarketingImport.countDocuments({ projectId: { $ne: new mongoose.Types.ObjectId(project.id) } });
    console.log(JSON.stringify({ project, records, otherProjectRecordsExcluded: foreignRecords, readOnly: true }));
  } catch (error) {
    console.error(error.statusCode ? error.message : 'Read-only project audit could not connect or complete.');
    process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
}
main();
