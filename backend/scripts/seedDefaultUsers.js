/**
 * Seed default users for all roles so you can log in immediately.
 * Usage:
 *   NODE_ENV=development node backend/scripts/seedDefaultUsers.js
 *
 * Requires:
 *   - process.env.MONGO_URI
 *   - process.env.JWT_SECRET (not used here but required by config)
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const { ROLES } = require('../config/roles');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DEFAULT_PASSWORD = 'Password123!';

// Emails are unique; update if you need different domains
const defaultUsers = [
  { role: ROLES.ADMIN, email: 'admin@example.com', firstName: 'Super', lastName: 'Admin' },
  { role: ROLES.CEO, email: 'ceo@example.com', firstName: 'Chris', lastName: 'Executive' },
  { role: ROLES.IT, email: 'it@example.com', firstName: 'Ivy', lastName: 'Tech' },
  { role: ROLES.HR, email: 'hr@example.com', firstName: 'Holly', lastName: 'People' },
  { role: ROLES.FINANCE, email: 'finance@example.com', firstName: 'Fin', lastName: 'Ledger' },
  { role: ROLES.LAW, email: 'law@example.com', firstName: 'Lex', lastName: 'Counsel' },
  { role: ROLES.MEDIA, email: 'media@example.com', firstName: 'Mia', lastName: 'Media' },
  { role: ROLES.MANAGER, email: 'manager@example.com', firstName: 'Manny', lastName: 'Manager' },
  { role: ROLES.SALES, email: 'sales@example.com', firstName: 'Sam', lastName: 'Sales' },
  { role: ROLES.RESEARCH_OPERATOR, email: 'research@example.com', firstName: 'Riley', lastName: 'Research' },
  { role: ROLES.EMPLOYEE, email: 'employee@example.com', firstName: 'Evan', lastName: 'Employee' }
];

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  for (const user of defaultUsers) {
    const existing = await User.findOne({ email: user.email }).select('_id');
    if (existing) {
      console.log(`Skipping ${user.email} (already exists)`);
      continue;
    }
    await User.create({
      ...user,
      password: DEFAULT_PASSWORD,
      department: user.role.toUpperCase(),
      phone: '000-000-0000'
    });
    console.log(`Created user: ${user.email} / ${user.role}`);
  }

  await mongoose.disconnect();
  console.log('Done. Default password for all users:', DEFAULT_PASSWORD);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
