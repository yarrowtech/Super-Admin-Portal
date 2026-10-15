/* Read-only source/router audit. Does not import app/server or connect to a database.
 * Run: node scripts/auditPortalConfiguration.cjs
 * Writes only docs/all-portal-audit. Environment file values are never exported.
 */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'docs/all-portal-audit');
fs.mkdirSync(output, { recursive: true });
const rel = (file) => path.relative(root, file).replaceAll('\\', '/');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', 'artifacts', 'logs', '.vite', '.claude'].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(?:js|jsx|mjs|cjs|json|yaml|yml|md|html|css|sh|bat)$/.test(file) || entry.name.startsWith('.env')) files.push(file);
  }
}
walk(root);
const sourceFiles = files.filter((file) => !file.includes(path.sep + 'all-portal-audit' + path.sep) && !path.basename(file).startsWith('.env') && !file.endsWith('package-lock.json') && !file.endsWith('swagger-output.json'));
const source = new Map(sourceFiles.map((file) => [rel(file), fs.readFileSync(file, 'utf8')]));
const save = (name, data) => fs.writeFileSync(path.join(output, name), JSON.stringify(data, null, 2) + '\n');
const csv = (name, rows) => {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  fs.writeFileSync(path.join(output, name), [keys, ...rows.map((row) => keys.map((key) => typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key] ?? ''))].map((row) => row.map((value) => '"' + String(value).replaceAll('"', '""') + '"').join(',')).join('\n') + '\n');
};
const protectedFile = (file) => /(?:^|\/)(?:law|policy)(?:\/|\.)|legalDocument|policyClient|policyAuth|policy\.public/.test(file);
const owner = (file) => protectedFile(file) ? 'LAW / Policy (protected)' : /marketing/i.test(file) ? 'Marketing / CEO' : /yarrowtech|workspace/i.test(file) ? 'Project workspaces / YarrowTech' : (file.match(/(?:components|controllers|modules|models|pages)\/(\w+)/)?.[1] || file.match(/(?:routes|services)\/(\w+)[.]/)?.[1] || 'Shared / deployment');
const urls = [], variables = [], declarations = [], frontendCalls = [], dependencies = [], models = [];
for (const [file, text] of source) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const match of line.matchAll(/(?:https?|wss?|mongodb(?:\+srv)?|rediss?):\/\/[^\s'"`<>]+/g)) {
      let value = match[0];
      if (/^(mongodb|redis)/.test(value)) value = '<connection URI redacted>';
      else value = value.replace(/(\/\/)[^/@\s]+:[^/@\s]+@/, '$1<credentials-redacted>@').replace(/([?&](?:token|key|secret|password)=)[^&\s]+/gi, '$1<redacted>');
      urls.push({ file, line: index + 1, owner: owner(file), url: value, purpose: /placeholder|example\.com/.test(line) ? 'Example / placeholder' : /socket|wss?:/.test(line) ? 'Socket' : /\.png|\.jpg|fonts\.|tile\.|\.svg/.test(line) ? 'Static asset / map / font' : 'Inspect source context', environment: /localhost|127\.0\.0\.1/.test(value) ? 'Local development / test' : /test|scripts|docs/.test(file) ? 'Test / documentation / operations' : 'Configured public reference', status: protectedFile(file) ? 'Protected and must remain unchanged' : 'Configured but unverified' });
    }
    for (const match of line.matchAll(/(?:process\.env|import\.meta\.env)\.([A-Z][A-Z0-9_]*)/g)) variables.push({ file, line: index + 1, owner: owner(file), name: match[1], exposure: line.includes('import.meta.env') ? 'Browser public' : 'Server', status: protectedFile(file) ? 'Protected and must remain unchanged' : 'Configured but unverified' });
    if (/apiClient\.|fetch\(|\bio\(/.test(line)) frontendCalls.push({ file, line: index + 1, owner: owner(file), caller: line.trim(), verification: 'Source reference; runtime coverage varies' });
    if (/\.\s*(?:get|post|put|patch|delete|use|route)\s*\(/.test(line) && /routes|middleware|mountDepartment/.test(file)) declarations.push({ file, line: index + 1, declaration: line.trim(), status: 'Source reference; dynamic helper routes included here' });
    if (/require\(|^import /.test(line)) dependencies.push({ file, line: index + 1, dependency: line.trim() });
    if (/mongoose\.connect|createConnection|MONGO_URI|DATABASE_URL/.test(line)) models.push({ file, line: index + 1, type: 'Connection reference', detail: line.trim() });
    if (/\bref\s*:|\.index\(|mongoose\.model\(|new (?:mongoose\.)?Schema/.test(line) && file.startsWith('backend/models/')) models.push({ file, line: index + 1, type: 'Model / relationship / index', detail: line.trim() });
  });
}
// Environment names and presence only. Do not copy real values, even for URL variables.
const envFiles = files.filter((file) => path.basename(file).startsWith('.env')).map((file) => ({ file: rel(file), variables: fs.readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line) => { const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/); return match ? [{ name: match[1], present: Boolean(match[2].trim()) }] : []; }) }));
save('environment-presence.json', envFiles);
csv('url-references.csv', urls); csv('environment-references.csv', variables); csv('route-declarations.csv', declarations); csv('frontend-callers.csv', frontendCalls.filter((row) => row.file.startsWith('frontend/'))); csv('dependencies.csv', dependencies); csv('database-models.csv', models);
// Express routers are loaded without app/server. Guard against accidental connections.
process.env.NODE_ENV = 'test';
const mongoose = require('mongoose');
mongoose.connect = () => { throw new Error('Database connections are forbidden in the source audit'); };
mongoose.createConnection = mongoose.connect;
const routes = require('../routes');
const appSource = source.get('backend/app.js');
const mounts = [...appSource.matchAll(/app\.use\("([^"]+)",\s*(?:routes\.(\w+)|require\('([^']+)'\))\)/g)].map((match) => ({ prefix: match[1], router: match[2] || match[3], instance: match[2] ? routes[match[2]] : require(path.resolve(root, 'backend', match[3])) }));
const endpoints = [];
function mountPrefix(layer) {
  if (layer.regexp.fast_slash) return '';
  const raw = layer.regexp.source;
  const result = raw.replace(/^\^/, '').replace(/\\\/\?\(\?=\\\/\|\$\)$/, '').replaceAll('\\/', '/');
  return /[()[\]?$^]/.test(result) ? `<mount:${raw}>` : result;
}
function inspect(router, prefix, inherited, entry) {
  const middleware = [...inherited];
  const routerSource = Object.values(require.cache).find((item) => item.exports === router)?.filename;
  const file = routerSource ? rel(routerSource) : null;
  const routerText = file ? source.get(file) || '' : '';
  const guards = routerText.split(/\r?\n/).flatMap((line, index) => /router\.use|authorize|authenticate|Scope|Permission/.test(line) ? [{ line: index + 1, source: line.trim() }] : []);
  const imports = [...routerText.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map((match) => match[1]);
  for (const layer of router.stack || []) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) endpoints.push({ method: method.toUpperCase(), path: prefix + (layer.route.path === '/' ? '' : layer.route.path), owner: entry, routerSource: file, guardSource: guards, imports, handlers: layer.route.stack.map((item) => item.name), inheritedMiddleware: [...middleware], status: /law|policy|legal/i.test(entry) ? 'Protected and must remain unchanged' : 'Registered; runtime/data/provider behavior not universally verified' });
    } else if (layer.handle?.stack) inspect(layer.handle, prefix + mountPrefix(layer), middleware, entry);
    else middleware.push(layer.name);
  }
}
for (const mount of mounts) inspect(mount.instance, mount.prefix, [], mount.router);
save('endpoints.json', endpoints); csv('endpoints.csv', endpoints);
const literalConnections = [];
for (const [file, text] of source) {
  if (!file.startsWith('frontend/')) continue;
  for (const match of text.matchAll(/apiClient\.(get|post|put|patch|delete|upload|download|activity)\(\s*(['"])(\/[^'"]+)\2/g)) {
    const method = ({ upload: 'POST', download: 'GET', activity: 'POST' })[match[1]] || match[1].toUpperCase();
    const target = match[3].split('?')[0];
    const found = endpoints.filter((endpoint) => endpoint.method === method && new RegExp('^' + endpoint.path.split('/').map((segment) => segment.startsWith(':') ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/') + '/?$').test(target));
    literalConnections.push({ file, line: text.slice(0, match.index).split('\n').length, method, path: target, matches: found.map(({ owner, routerSource }) => ({ owner, routerSource })), status: found.length ? 'Registered; request/response behavior requires runtime verification' : 'No matching registration; may be unused or belong to a separate backend; do not remap without contract evidence' });
  }
}
csv('literal-client-connections.csv', literalConnections);

save('mounts.json', mounts.map(({ instance, ...mount }) => mount));
const routeGroups = new Map();
for (const endpoint of endpoints) { const key = endpoint.method + ' ' + endpoint.path; if (!routeGroups.has(key)) routeGroups.set(key, []); routeGroups.get(key).push(endpoint); }
save('duplicate-registrations.json', [...routeGroups].filter(([, items]) => items.length > 1).map(([key, items]) => ({ key, registrations: items.map(({ owner, routerSource }) => ({ owner, routerSource })), status: 'Duplicate registration; precedence must be reviewed, not removed automatically' })));
csv('frontend-routes.csv', [...source].filter(([file]) => file.startsWith('frontend/') && /routes|navigation|portalMenus|projectNames/.test(file)).flatMap(([file, text]) => text.split(/\r?\n/).flatMap((line, index) => /path[=:]|to[=:]|launchUrl|redirect/i.test(line) ? [{ file, line: index + 1, owner: owner(file), declaration: line.trim(), status: protectedFile(file) ? 'Protected and must remain unchanged' : 'Source reference; navigation not universally verified' }] : [])));

const baseline = JSON.parse(fs.readFileSync(path.join(output, 'baseline.json'), 'utf8'));
const hashes = Object.fromEntries([...source].map(([file]) => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const changedSinceBaseline = Object.keys(hashes).filter((file) => baseline.hashes[file] && hashes[file] !== baseline.hashes[file]);
const notHashedAtBaseline = Object.keys(hashes).filter((file) => !baseline.hashes[file]);
const protectedCompared = Object.keys(baseline.hashes).filter(protectedFile);
const protectedChanged = protectedCompared.filter((file) => hashes[file] !== baseline.hashes[file]);
save('verification.json', { baselineBranch: baseline.branch, baselineStatus: baseline.status, changedSinceBaseline, notHashedAtBaseline, protectedCompared, protectedChanged, databaseConnected: mongoose.connection.readyState !== 0, routeCount: endpoints.length, urlReferences: urls.length, environmentReferences: variables.length, limitations: ['Router registration verified without app startup or database connection.', 'Middleware names do not prove authorization for every request.', 'Controller/service/request/response contracts require source review; declarations and dependencies are supplied.', 'Runtime-generated helper routes are reflected in loaded router stacks; source declarations include their helper definitions.', 'URL references include documentation/test/static assets; duplicates are references, not evidence of redundant contracts.', 'Environment file values intentionally omitted. No provider requests made.'] });
console.log(JSON.stringify({ endpoints: endpoints.length, urls: urls.length, protectedCompared: protectedCompared.length, protectedChanged, changedSinceBaseline: changedSinceBaseline.length }));
