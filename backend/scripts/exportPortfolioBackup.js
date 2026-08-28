// Read-only, collection-scoped backup. It never writes to MongoDB and never
// prints the connection string. Output uses canonical Extended JSON so BSON
// ObjectIds and dates remain restorable.
require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { EJSON } = require('bson');
const connectDB = require('../config/db');

const requested = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.resolve(requested || path.join(process.cwd(), 'portfolio-backups', stamp));
const collections = [
  'portfolios',
  'brands',
  'portfoliogroups',
  'portfoliocategories',
  'portfolioassets',
  'portfolioassetversions',
  'migrationbatches',
  'projects',
];

const run = async () => {
  await connectDB();
  await fs.mkdir(outputDir, { recursive: true });
  const manifest = { format: 'mongodb-canonical-ejson-lines', createdAt: new Date().toISOString(), collections: [] };
  for (const name of collections) {
    const docs = await mongoose.connection.db.collection(name).find({}).toArray();
    const data = docs.map((doc) => EJSON.stringify(doc, { relaxed: false })).join('\n') + (docs.length ? '\n' : '');
    const file = `${name}.ejsonl`;
    await fs.writeFile(path.join(outputDir, file), data, { flag: 'wx' });
    manifest.collections.push({ name, file, count: docs.length, sha256: crypto.createHash('sha256').update(data).digest('hex') });
  }
  await fs.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
  console.log(`Portfolio backup created at ${outputDir}`);
  console.log(JSON.stringify(manifest.collections.map(({ name, count, sha256 }) => ({ name, count, sha256 })), null, 2));
};

run().catch((err) => { console.error('Portfolio backup failed:', err.message); process.exitCode = 1; })
  .finally(() => mongoose.connection.close());
