// Idempotent upsert of the Brand collection from the in-memory WORKSPACE_BRANDS
// registry (backend/utils/projectAccess.js) — the existing source of truth for
// brand groupings, now promoted to a real collection so the Digital Portfolio
// admin UI can offer a Brand filter/selector.
//
// Usage: node backend/scripts/seedPortfolioBrands.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Brand = require('../models/portfolio/Brand');
const { WORKSPACE_BRANDS } = require('../utils/projectAccess');

const run = async () => {
  await connectDB();

  let created = 0;
  let updated = 0;
  for (const brand of WORKSPACE_BRANDS) {
    const result = await Brand.updateOne(
      { code: brand.code },
      {
        $setOnInsert: {
          code: brand.code,
          name: brand.name,
          projectCodes: brand.projectCodes || [],
          isActive: true,
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount) created += 1;
    else updated += 1;
  }

  console.log(`Brand seed complete. Created ${created}, existing unchanged ${updated} (of ${WORKSPACE_BRANDS.length} total).`);
};

run()
  .catch((err) => {
    console.error('Brand seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
