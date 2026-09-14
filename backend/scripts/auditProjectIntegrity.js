require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Project = require('../models/common/Project');

const APPLY = process.argv.includes('--apply');
const normalizeName = (value) => String(value || '').trim().toLocaleLowerCase('en-US');
const normalizeCode = (value) => String(value || '').trim().toUpperCase();

const relationSpecs = [
  ['laws', 'projectId'], ['lawcontracts', 'projectId'], ['legaldocuments', 'projectId'],
  ['itassets', 'projectId'], ['ittickets', 'projectId'], ['financeinvoices', 'projectId'],
  ['financeexpenses', 'projectId'], ['financebudgets', 'projectId'], ['financepayments', 'projectId'],
  ['financecompliances', 'projectId'], ['payrolls', 'projectId'], ['goals', 'projectId'],
  ['media', 'projectId'], ['marketingplans', 'projectId'], ['tasks', 'project'],
  ['staffworkreports', 'project'],
];

const duplicateGroups = (projects, keyFn) => {
  const groups = new Map();
  projects.forEach((project) => {
    const key = keyFn(project);
    if (!key) return;
    groups.set(key, [...(groups.get(key) || []), project]);
  });
  return [...groups.entries()].filter(([, rows]) => rows.length > 1);
};

const run = async () => {
  await connectDB();
  const projects = await Project.find({}).select('+normalizedName name projectCode status archivedAt').lean();
  const byName = duplicateGroups(projects, (row) => normalizeName(row.name));
  const byCode = duplicateGroups(projects, (row) => normalizeCode(row.projectCode));
  const projectIds = new Set(projects.map((row) => String(row._id)));
  const canonicalByName = new Map();
  projects.forEach((row) => {
    const key = normalizeName(row.name);
    if (!canonicalByName.has(key)) canonicalByName.set(key, []);
    canonicalByName.get(key).push(row);
  });

  const report = {
    mode: APPLY ? 'apply-safe-backfills' : 'dry-run',
    projects: projects.length,
    duplicateNames: byName.map(([key, rows]) => ({ key, ids: rows.map((row) => row._id), names: rows.map((row) => row.name) })),
    duplicateCodes: byCode.map(([key, rows]) => ({ key, ids: rows.map((row) => row._id), codes: rows.map((row) => row.projectCode) })),
    relations: [],
    legacyNameOnly: [],
  };

  for (const [collectionName, field] of relationSpecs) {
    const collection = mongoose.connection.collection(collectionName);
    const present = await collection.countDocuments({ [field]: { $exists: true, $ne: null } });
    const orphanRows = await collection.find({ [field]: { $exists: true, $ne: null } }, { projection: { [field]: 1 } }).toArray();
    const orphanIds = orphanRows.filter((row) => !projectIds.has(String(row[field]))).map((row) => row._id);
    report.relations.push({ collection: collectionName, field, present, orphanCount: orphanIds.length, orphanIds });
  }

  for (const collectionName of ['legaldocuments', 'media']) {
    const collection = mongoose.connection.collection(collectionName);
    const missingProject = { $or: [{ projectId: null }, { projectId: { $exists: false } }] };
    const rows = await collection.find({ ...missingProject, projectName: { $type: 'string', $ne: '' } }, { projection: { projectName: 1 } }).toArray();
    for (const row of rows) {
      const matches = canonicalByName.get(normalizeName(row.projectName)) || [];
      const result = { collection: collectionName, id: row._id, projectName: row.projectName, matches: matches.map((item) => item._id) };
      report.legacyNameOnly.push(result);
      if (APPLY && matches.length === 1) await collection.updateOne({ _id: row._id, ...missingProject }, { $set: { projectId: matches[0]._id } });
    }
  }

  if (APPLY) {
    for (const project of projects) {
      await Project.updateOne({ _id: project._id }, { $set: { normalizedName: normalizeName(project.name), projectCode: normalizeCode(project.projectCode) } });
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (byName.length || byCode.length || report.relations.some((row) => row.orphanCount) || report.legacyNameOnly.some((row) => row.matches.length !== 1)) {
    process.exitCode = 2;
  }
};

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => mongoose.connection.close());
