/*
 * Read-only first phase for moving legacy Law privacy records to central Policy.
 * It intentionally never guesses a project from a display name and never writes
 * unless a future reviewed migration explicitly consumes its JSON report.
 */
require('dotenv').config();
const connectDB = require('../config/db');
const Law = require('../models/department/Law');
const Project = require('../models/common/Project');

(async () => {
  await connectDB();
  const records = await Law.find({ section: 'privacy-policy' }).select('_id title projectId metadata').lean();
  const projectIds = records.filter((item) => item.projectId).map((item) => item.projectId);
  const known = new Set((await Project.find({ _id: { $in: projectIds } }).select('_id').lean()).map((item) => String(item._id)));
  const report = { scannedAt: new Date().toISOString(), total: records.length, confirmed: [], missingProjectId: [], missingProject: [] };
  records.forEach((record) => {
    if (!record.projectId) report.missingProjectId.push({ legacyRecordId: String(record._id), title: record.title });
    else if (!known.has(String(record.projectId))) report.missingProject.push({ legacyRecordId: String(record._id), title: record.title, projectId: String(record.projectId) });
    else report.confirmed.push({ legacyRecordId: String(record._id), title: record.title, projectId: String(record.projectId) });
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(0);
})().catch((error) => { console.error(error.message); process.exit(1); });
