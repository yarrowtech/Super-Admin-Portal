const User = require('../modules/shared/models/User');
const { ROLES } = require('../config/roles');

// Default credentials used for auto-seeding in non-production environments
const DEFAULT_PASSWORD = 'Password123!';

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

/**
 * Seeds default users if they do not already exist.
 * Intended for development and test environments only.
 */
async function seedDefaultUsers() {
  for (const user of defaultUsers) {
    const existing = await User.findOne({ email: user.email }).select('_id');
    if (existing) continue;

    await User.create({
      ...user,
      password: DEFAULT_PASSWORD,
      department: user.role.toUpperCase(),
      phone: '000-000-0000'
    });
    console.log(`[seed] Created ${user.role} -> ${user.email}`);
  }
  console.log('[seed] Default user seeding complete');
}

module.exports = { seedDefaultUsers, DEFAULT_PASSWORD, defaultUsers };
