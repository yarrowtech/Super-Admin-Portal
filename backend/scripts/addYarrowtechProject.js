require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const Project = require('../models/common/Project');
const { findProjectByCode } = require('../utils/projectAccess');

// Target only the company project. Existing child projects and allocations stay intact.
async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const matches = await Project.find({ $or: [
    { projectCode: /^YARROWTECH$/i }, { name: /^yarrow\s*tech$/i },
  ] });
  if (matches.length > 1) throw new Error('Multiple YARROWTECH projects found; resolve duplicates first.');
  if (matches.length) {
    if (matches[0].projectCode !== 'YARROWTECH') throw new Error('Existing YARROWTECH has a different code; review before changing identity.');
    console.log(JSON.stringify({ result: 'already-exists', id: matches[0].id, name: matches[0].name }));
    return;
  }
  const sibling = await Project.findOne({ projectCode: { $in: ['EEC-B2B', 'EEC_B2B'] } });
  if (!sibling?.projectManager) throw new Error('No existing Yarrowtech project manager found.');
  const definition = findProjectByCode('YARROWTECH');
  const document = new Project({ name: definition.name, projectCode: definition.code,
    description: definition.description, status: 'planning', startDate: new Date(),
    projectManager: sibling.projectManager, teamMembers: [],
  });
  await document.validate();
  if (process.argv.includes('--apply')) await document.save();
  console.log(JSON.stringify({ result: process.argv.includes('--apply') ? 'created' : 'validated-dry-run',
    id: document.id, name: document.name, code: document.projectCode, manager: String(document.projectManager) }));
}
run().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
