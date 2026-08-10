/**
 * One-time data migration for the role/department restructuring:
 *   SUPER ADMIN / CEO / HR (unchanged)
 *   IT        -> IT Manager, IT Admin, IT Employee, IT HR
 *   FINANCE   -> Finance Manager, Finance Employee
 *   MEDIA     -> Media Head, Media Sales, Media Marketing
 *   LAW       -> Law Head, Law Employee
 *   OUTSOURCING -> unchanged (Freelancer)
 *
 * Defaults to DRY RUN — prints what would change without writing anything.
 * Pass --confirm to actually write the changes to the database.
 *
 * Usage:
 *   node backend/scripts/migrate_role_hierarchy.js            # dry run (safe, read-only)
 *   node backend/scripts/migrate_role_hierarchy.js --confirm   # applies the changes
 */
require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User = require('../models/auth/User');

// Old role -> { role: new role value, department: department label to set }.
// Roles with no successor (manager, employee, sales, research_operator) are
// intentionally omitted here — they're handled separately as "needs manual
// review" rather than silently guessed.
const ROLE_MAP = {
  it: { role: 'it_employee', department: 'IT' },
  it_admin: { role: 'it_admin', department: 'IT' },
  system_operator: { role: 'it_employee', department: 'IT' },
  security_analyst: { role: 'it_employee', department: 'IT' },
  devops_engineer: { role: 'it_employee', department: 'IT' },

  finance: { role: 'finance_employee', department: 'FINANCE' },
  finance_manager: { role: 'finance_manager', department: 'FINANCE' },
  accountant: { role: 'finance_employee', department: 'FINANCE' },
  auditor: { role: 'finance_employee', department: 'FINANCE' },

  media: { role: 'media_head', department: 'MEDIA' },
  marketing_head: { role: 'media_head', department: 'MEDIA' },
  department_head: { role: 'media_head', department: 'MEDIA' },
  project_manager: { role: 'media_head', department: 'MEDIA' },
  client_viewer: { role: 'media_head', department: 'MEDIA' },
  sales: { role: 'media_sales', department: 'MEDIA' },
  media_manager: { role: 'media_marketing', department: 'MEDIA' },
  content_writer: { role: 'media_marketing', department: 'MEDIA' },
  graphic_designer: { role: 'media_marketing', department: 'MEDIA' },
  video_editor: { role: 'media_marketing', department: 'MEDIA' },
  seo_specialist: { role: 'media_marketing', department: 'MEDIA' },
  social_media_manager: { role: 'media_marketing', department: 'MEDIA' },
  ads_manager: { role: 'media_marketing', department: 'MEDIA' },

  law: { role: 'law_employee', department: 'LAW' },
  legal_head: { role: 'law_head', department: 'LAW' },
  lsw: { role: 'law_employee', department: 'LAW' },
};

// Roles being removed entirely with no automatic successor — accounts on
// these must be manually reassigned to a role in the new hierarchy.
const NEEDS_MANUAL_REVIEW = new Set(['manager', 'employee', 'research_operator']);

// Roles that stay exactly as-is (no role or department change needed).
const UNCHANGED_ROLES = new Set(['admin', 'super_admin', 'ceo', 'hr', 'freelancer']);

const run = async () => {
  const confirm = process.argv.includes('--confirm');

  await connectDB();

  const users = await User.find({}).select('_id email role department').lean();

  const toMigrate = [];
  const manualReview = [];
  const unchanged = [];
  const alreadyNew = [];

  for (const user of users) {
    const role = String(user.role || '').trim().toLowerCase();

    if (UNCHANGED_ROLES.has(role)) {
      unchanged.push(user);
      continue;
    }

    if (NEEDS_MANUAL_REVIEW.has(role)) {
      manualReview.push(user);
      continue;
    }

    const mapping = ROLE_MAP[role];
    if (!mapping) {
      // Already on a new-hierarchy role value, or an unrecognized role — leave untouched.
      alreadyNew.push(user);
      continue;
    }

    toMigrate.push({ user, from: role, to: mapping.role, department: mapping.department });
  }

  console.log('='.repeat(70));
  console.log(confirm ? 'MIGRATION — WRITING CHANGES' : 'MIGRATION — DRY RUN (no changes will be written)');
  console.log('='.repeat(70));

  console.log(`\nTotal users scanned: ${users.length}`);
  console.log(`Already on an unchanged role (admin/super_admin/ceo/hr/freelancer): ${unchanged.length}`);
  console.log(`Already on a new-hierarchy role (or unrecognized): ${alreadyNew.length}`);

  console.log(`\n--- To migrate: ${toMigrate.length} ---`);
  toMigrate.forEach(({ user, from, to, department }) => {
    console.log(`  ${user.email}  (${user._id})  ${from} -> ${to}  [department: ${department}]`);
  });

  console.log(`\n--- NEEDS MANUAL REVIEW (no automatic successor): ${manualReview.length} ---`);
  manualReview.forEach((user) => {
    console.log(`  ${user.email}  (${user._id})  role=${user.role}  department=${user.department || '(none)'}`);
  });

  if (!confirm) {
    console.log('\nDry run complete. Re-run with --confirm to apply the changes above.');
    return;
  }

  for (const { user, to, department } of toMigrate) {
    await User.updateOne({ _id: user._id }, { $set: { role: to, department } });
  }

  console.log(`\nApplied ${toMigrate.length} role updates. ${manualReview.length} accounts still need manual reassignment.`);
};

run()
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
