const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');

async function run() {
  const source = path.resolve(process.argv[2] || '');
  const port = Number(process.argv[3] || 5001);
  if (!fs.existsSync(path.join(source, 'src/routes/internal/teachers.js')) || !Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('EdifyEight backend source and a valid port are required');
  require('dotenv').config({ path: path.join(source, '.env') });
  if (!process.env.MONGO_URI) throw new Error('EdifyEight MONGO_URI is missing');
  const providerRequire = createRequire(path.join(source, 'package.json'));
  const express = providerRequire('express');
  const load = (file) => import(pathToFileURL(path.join(source, file)).href);
  const [teachers, materials, database] = await Promise.all([
    load('src/routes/internal/teachers.js'), load('src/routes/internal/studyMaterials.js'), load('src/config/db.js'),
  ]);
  await database.connectDB(process.env.MONGO_URI);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/internal/teachers', teachers.default);
  app.use('/api/internal/study-materials', materials.default);
  const server = app.listen(port, '127.0.0.1', () => console.log(`EdifyEight integration routers listening on 127.0.0.1:${port}`));
  server.on('error', () => { console.error('EdifyEight integration listener failed'); process.exitCode = 1; providerRequire('mongoose').disconnect(); });
  const shutdown = () => server.close(async () => { await providerRequire('mongoose').disconnect(); process.exit(0); });
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
run().catch((error) => { console.error(error.code || 'EdifyEight integration bridge startup failed'); process.exitCode = 1; });
