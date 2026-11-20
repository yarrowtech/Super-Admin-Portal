require('dotenv').config();
const mongoose = require('mongoose');
const models = require('../models/ApiManagement');
async function main() {
  const env = require('../config/env');
  if (!env.MONGO_URI) throw new Error('Database configuration unavailable');
  await mongoose.connect(env.MONGO_URI);
  // Add only the new module's indexes; never drop or sync existing indexes.
  for (const model of Object.values(models)) await model.createIndexes();
  console.log('API Management indexes created');
}
main().catch(() => { console.error('API Management index creation failed; inspect database availability and duplicate registry rows'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
