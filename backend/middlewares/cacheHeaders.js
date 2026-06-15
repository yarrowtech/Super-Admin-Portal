/**
 * Express middleware that sets Cache-Control response headers
 * based on HTTP method and API path pattern.
 *
 * Mount on /api routes BEFORE route handlers:
 *   app.use('/api', cacheHeaders);
 *   app.use('/api/auth', routes.authRoutes);
 *   ...
 */

const PATTERNS = [
  // Settings / config / workflows / permissions — semi-static, 30 min
  { test: /\/(settings|config|workflow|permissions|roles)/, maxAge: 1800, type: 'private' },
  // Reports / analytics — slow-changing, 15 min
  { test: /\/(reports|analytics|stats|metrics)/, maxAge: 900, type: 'private' },
  // Dashboard / KPI — live data, 1 min
  { test: /\/(dashboard|kpi)/, maxAge: 60, type: 'private' },
  // Auth / profile / session — sensitive, 3 min
  { test: /\/(auth|profile|me|session)/, maxAge: 180, type: 'private' },
  // Notifications — near-live, 30 s
  { test: /\/notifications/, maxAge: 30, type: 'private' },
];

const DEFAULT_MAX_AGE = 90;

const cacheHeaders = (req, res, next) => {
  // Mutations must never be cached
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Cache-Control', 'no-store');
    return next();
  }

  const path = req.path || '';

  for (const pattern of PATTERNS) {
    if (pattern.test.test(path)) {
      res.setHeader(
        'Cache-Control',
        `${pattern.type}, max-age=${pattern.maxAge}, must-revalidate`
      );
      return next();
    }
  }

  // Default: private, 90s
  res.setHeader('Cache-Control', `private, max-age=${DEFAULT_MAX_AGE}, must-revalidate`);
  next();
};

module.exports = cacheHeaders;
