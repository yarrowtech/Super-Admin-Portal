// Idempotent upsert of the Digital Portfolio metric catalogue (spec §13). The
// Metrics tab renders whatever definitions are active here — nothing is
// hardcoded per-category, so adding a metric to this list makes it available
// everywhere without a schema change.
//
// Usage: node backend/scripts/seedPortfolioMetricDefinitions.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const PortfolioMetricDefinition = require('../models/portfolio/PortfolioMetricDefinition');

const METRICS = [
  { key: 'views', label: 'Views', unit: 'number', aggregation: 'sum', scope: 'asset', order: 1 },
  { key: 'organic_visits', label: 'Organic Visits', unit: 'number', aggregation: 'sum', scope: 'asset', order: 2 },
  { key: 'clicks', label: 'Clicks', unit: 'number', aggregation: 'sum', scope: 'asset', order: 3 },
  { key: 'ctr', label: 'CTR', unit: 'percent', aggregation: 'avg', scope: 'asset', order: 4 },
  { key: 'leads', label: 'Leads', unit: 'number', aggregation: 'sum', scope: 'asset', order: 5 },
  { key: 'enquiries', label: 'Enquiries', unit: 'number', aggregation: 'sum', scope: 'asset', order: 6 },
  { key: 'bookings', label: 'Bookings', unit: 'number', aggregation: 'sum', scope: 'asset', order: 7 },
  { key: 'conversion', label: 'Conversion', unit: 'percent', aggregation: 'avg', scope: 'asset', order: 8 },
  { key: 'revenue', label: 'Revenue', unit: 'currency', aggregation: 'sum', scope: 'asset', order: 9 },
  { key: 'engagement', label: 'Engagement', unit: 'percent', aggregation: 'avg', scope: 'asset', order: 10 },
  { key: 'saves', label: 'Saves', unit: 'number', aggregation: 'sum', scope: 'asset', order: 11 },
  { key: 'replies', label: 'Replies', unit: 'number', aggregation: 'sum', scope: 'asset', order: 12 },
  { key: 'ranking', label: 'Ranking', unit: 'rank', aggregation: 'latest', scope: 'asset', order: 13 },
  { key: 'rating', label: 'Rating', unit: 'rating', aggregation: 'latest', scope: 'asset', order: 14 },
];

const run = async () => {
  await connectDB();

  let created = 0;
  let updated = 0;
  for (const metric of METRICS) {
    const result = await PortfolioMetricDefinition.updateOne(
      { key: metric.key },
      { $set: { label: metric.label, unit: metric.unit, aggregation: metric.aggregation, scope: metric.scope, order: metric.order, isActive: true } },
      { upsert: true }
    );
    if (result.upsertedCount) created += 1;
    else updated += 1;
  }

  console.log(`Portfolio metric definitions seeded. Created ${created}, updated ${updated} (of ${METRICS.length} total).`);
};

run()
  .catch((err) => {
    console.error('Portfolio metric definition seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
