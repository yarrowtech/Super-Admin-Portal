// The logger is the one place every portal's request, error and DB activity converges,
// so a missing redact path leaks a credential into log storage for every portal at once.
// These tests pin the names that must never appear in output, including the provider
// credentials as config/yarrowtech.js actually returns them (signingSecret /
// webhookSecret), which an earlier version of the redact list did not cover.
process.env.NODE_ENV = 'production';
process.env.LOG_LEVEL = 'info';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const pino = require('pino');

const SECRET = 'MUST_NOT_APPEAR_IN_LOGS';

// Every field name the application handles that carries a credential.
const SECRET_FIELDS = [
  'password', 'passwordHash', 'currentPassword', 'newPassword', 'confirmPassword',
  'oldPassword', 'otp', 'otpHash', 'resetToken',
  'token', 'accessToken', 'refreshToken', 'jwt',
  'apiKey', 'api_key', 'secret', 'clientSecret', 'privateKey',
  'signingSecret', 'webhookSecret',
  'SRS_API_KEY', 'SRS_CLIENT_ID', 'SRS_SIGNING_SECRET', 'SRS_WEBHOOK_SECRET',
  'JWT_SECRET', 'MONGO_URI',
  'cardNumber', 'cvv', 'cvc', 'accountNumber',
];

// The shipped redact paths, read from the application logger's source so these tests
// track the real configuration rather than a copy of it that can drift.
const loggerSource = fs.readFileSync(require.resolve('../logger/logger'), 'utf8');
// `paths: [` ... `]`, found by bracket depth — a naive slice to the first `]` stops
// inside req.headers['set-cookie'] and yields almost nothing.
const pathsStart = loggerSource.indexOf('paths: [', loggerSource.indexOf('redact: {'));
const redactPaths = (() => {
  let depth = 0;
  for (let i = pathsStart + 'paths: '.length; i < loggerSource.length; i += 1) {
    const ch = loggerSource[i];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        const block = loggerSource.slice(pathsStart, i + 1);
        return [...block.matchAll(/"([^"]+)"|'([^']+)'/g)].map((m) => m[1] ?? m[2]);
      }
    }
  }
  return [];
})();

// A logger built from those exact paths, writing to a buffer so the assertions read what
// would have been persisted. Synchronous, so nothing can pass vacuously.
const logTo = (lines, payload) => {
  const logger = pino(
    { level: 'info', redact: { paths: redactPaths, censor: '[Redacted]' } },
    { write: (chunk) => lines.push(chunk) },
  );
  logger.info(payload, 'redaction probe');
  return lines.join('');
};

test('the shipped redact list is non-empty and covers every credential field', () => {
  assert.ok(redactPaths.length > 20, `only ${redactPaths.length} redact path(s) were parsed from logger/logger.js`);
  const missing = SECRET_FIELDS.filter((f) => !redactPaths.includes(f));
  assert.deepEqual(missing, [], `logger/logger.js does not redact: ${missing.join(', ')}`);
});

test('no credential value survives into log output', () => {
  const payload = Object.fromEntries(SECRET_FIELDS.map((f) => [f, SECRET]));
  payload.safeField = 'VISIBLE';
  const line = logTo([], payload);
  assert.ok(line.length > 0, 'the probe produced no output');
  assert.ok(!line.includes(SECRET), `a credential reached the log: ${line.slice(0, 400)}`);
  assert.ok(line.includes('VISIBLE'), 'redaction removed a field that carries no credential');
});

test('credentials nested one level deep are redacted too', () => {
  // config/yarrowtech.js returns the provider credentials as an object, so the wildcard
  // paths matter as much as the top-level ones.
  const line = logTo([], {
    providerConfig: { apiKey: SECRET, signingSecret: SECRET, webhookSecret: SECRET, secret: SECRET },
    safeField: 'VISIBLE',
  });
  assert.ok(line.length > 0, 'the probe produced no output');
  assert.ok(!line.includes(SECRET), `a nested credential reached the log: ${line.slice(0, 400)}`);
});

test('an Authorization header is never logged in clear text', () => {
  const line = logTo([], { req: { headers: { authorization: `Bearer ${SECRET}`, cookie: `sid=${SECRET}` } } });
  assert.ok(line.length > 0, 'the probe produced no output');
  assert.ok(!line.includes(SECRET), `a request credential reached the log: ${line.slice(0, 400)}`);
});
