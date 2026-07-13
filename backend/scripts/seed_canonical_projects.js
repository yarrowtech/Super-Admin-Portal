require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const Project = require('../models/common/Project');
const User = require('../models/auth/User');
const { PROJECT_REGISTRY } = require('../utils/projectAccess');

const run = async () => {
  await connectDB();

  const fallbackManager =
    (await User.findOne({ role: 'manager' }).sort({ createdAt: 1 })) ||
    (await User.findOne({ role: 'admin' }).sort({ createdAt: 1 }));

  if (!fallbackManager) {
    throw new Error('No manager/admin user found to assign as projectManager.');
  }

  for (const project of PROJECT_REGISTRY) {
    const existing = await Project.findOne({ projectCode: project.code });
    if (existing) {
      console.log(`Skipped (already exists): ${project.name} [${project.code}]`);
      continue;
    }

    await Project.create({
      name: project.name,
      description: project.description || `${project.name} project workspace.`,
      projectCode: project.code,
      status: 'in-progress',
      priority: 'high',
      startDate: new Date(),
      projectManager: fallbackManager._id,
    });
    console.log(`Created: ${project.name} [${project.code}]`);
  }
};

run()
  .catch((err) => {
    console.error('Canonical project seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
