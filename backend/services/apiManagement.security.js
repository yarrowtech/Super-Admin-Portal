const crypto = require('crypto');
const https = require('https');
const dns = require('dns');
const net = require('net');
const { z } = require('zod');
const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error; };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const key = () => {
  const value = process.env.API_MANAGEMENT_ENCRYPTION_KEY;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) fail('API credential encryption is unavailable. Configure the infrastructure encryption key.', 503);
  return Buffer.from(value, 'hex');
};
const encrypt = value => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map(b => b.toString('base64')).join('.');
};
const decrypt = value => {
  const [iv, tag, body] = value.split('.').map(v => Buffer.from(v, 'base64'));
  const cipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(body), cipher.final()]).toString('utf8');
};
// Conservatively reject special/reserved networks, including IPv4-mapped IPv6.
const publicAddress = address => {
  if (net.isIP(address) === 6) return /^2[0-9a-f]{3}:/i.test(address) && !/^200[12]:/i.test(address);
  if (net.isIP(address) !== 4) return false;
  const [a, b] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) ||
    (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
};
const baseUrl = value => {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.port && url.port !== '443')) fail('Use an HTTPS provider URL on port 443 without credentials, query or fragment');
  if (net.isIP(url.hostname.replace(/^\[|\]$/g, '')) && !publicAddress(url.hostname.replace(/^\[|\]$/g, ''))) fail('Provider must use a public address');
  return url.toString().replace(/\/$/, '');
};
const field = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/).refine(v => !['__proto__', 'prototype', 'constructor'].includes(v));
const fields = z.array(field).min(1).max(100).refine(v => new Set(v).size === v.length);
const path = z.string().max(500).regex(/^\/[a-zA-Z0-9/_-]*$/).refine(v => !v.includes('//'));
const shape = z.record(field, z.enum(['string', 'number', 'boolean']));
const validateRecord = (record, schema, allowed, errorStatus = 502) => {
  if (!record || typeof record !== 'object' || Array.isArray(record)) fail('Expected an object record', errorStatus);
  for (const name of allowed) {
    if (record[name] !== undefined && typeof record[name] !== schema[name]) fail('Data does not match registered schema', errorStatus);
  }
  return Object.fromEntries(allowed.filter(name => Object.hasOwn(record, name)).map(name => [name, record[name]]));
};
const projectResponse = (payload, endpoint, allowed) => {
  let records = payload;
  if (endpoint.recordsPath) {
    for (const part of endpoint.recordsPath.split('.')) records = records?.[part];
  }
  if (Array.isArray(records)) return records.map(record => validateRecord(record, endpoint.responseSchema, allowed));
  return validateRecord(records, endpoint.responseSchema, allowed);
};
const request = (api, endpoint, body) => new Promise((resolve, reject) => {
  const config = require('./apiManagement.environment').gatewayConfiguration(api, endpoint.providerIntegrationId);
  if (config && !config.bearer) fail('This provider needs its verified authentication adapter', 409);
  const target = new URL(`${baseUrl(config?.baseUrl || api.baseUrl)}${path.parse(endpoint.path)}`);
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const headers = { accept: 'application/json' };
  if (config?.token) headers.authorization = `Bearer ${config.token}`;
  else if (!config && api.credential) headers.authorization = `Bearer ${decrypt(api.credential)}`;
  if (payload) { headers['content-type'] = 'application/json'; headers['content-length'] = Buffer.byteLength(payload); }
  const req = https.request(target, {
    method: endpoint.method, headers, timeout: 15000,
    // Resolve and validate the actual connection address, preventing DNS rebinding.
    lookup(host, options, callback) {
      dns.lookup(host, { all: true }, (error, addresses) => {
        if (error) return callback(error);
        if (!addresses.length || addresses.some(a => !publicAddress(a.address))) return callback(new Error('Provider address rejected'));
        if (options.all) callback(null, addresses);
        else callback(null, addresses[0].address, addresses[0].family);
      });
    },
  }, res => {
    if (res.statusCode < 200 || res.statusCode >= 300) { res.resume(); return reject(Object.assign(new Error('Provider request failed'), { status: 502 })); }
    let size = 0; const chunks = [];
    res.on('data', chunk => { size += chunk.length; if (size > 2 * 1024 * 1024) res.destroy(new Error('Provider response too large')); else chunks.push(chunk); });
    res.on('error', reject);
    res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(Object.assign(new Error('Provider returned invalid JSON'), { status: 502 })); } });
  });
  req.on('timeout', () => req.destroy(new Error('Provider timeout')));
  req.on('error', () => reject(Object.assign(new Error('Provider connection failed'), { status: 502 })));
  if (payload) req.write(payload);
  req.end();
});
module.exports = { fail, hash, encrypt, decrypt, baseUrl, publicAddress, field, fields, path, shape, validateRecord, projectResponse, request };
