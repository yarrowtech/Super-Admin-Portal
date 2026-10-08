'use strict';
// CSV/Excel import endpoints for Marketing Analytics.
//
// Thin: multer puts the file in memory, the service does the parsing, validation,
// geocoding and persistence. Two endpoints rather than one, because analysing a file and
// committing it are different decisions — the user reviews the analysis, then commits.
const service = require('../../services/marketingImport.service');
// Reused for the authorised project list, so "All Projects" means the same set here as in
// the selector rather than a second, divergent definition.
const analyticsService = require('../../services/marketingAnalytics.service');

const handle = (work) => async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await work(req) });
  } catch (err) {
    const status = err.statusCode || 500;
    if (status === 500) req.log?.error?.({ err }, 'Marketing import failed');
    return res.status(status).json({
      success: false,
      error: status === 500 ? 'The import could not be processed.' : err.message,
    });
  }
};

// The mapping arrives as a JSON string in multipart form data.
const readMapping = (req) => {
  const raw = req.body?.mapping;
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const requireFile = (req) => {
  if (!req.file?.buffer?.length) {
    const err = new Error('Select a CSV, XLSX or XLS file to import.');
    err.statusCode = 400;
    throw err;
  }
  return req.file;
};

// Step 1-3: read, detect columns, validate, resolve locations. Writes nothing, so the
// user can re-map columns and re-analyse as often as they like.
exports.analyzeMarketingImport = handle(async (req) => {
  const file = requireFile(req);
  return service.analyzeFile({
    buffer: file.buffer,
    filename: file.originalname,
    mapping: readMapping(req),
  });
});

// Step 4: persist into the selected project.
exports.commitMarketingImport = handle(async (req) => {
  const file = requireFile(req);
  return service.commitImport({
    buffer: file.buffer,
    filename: file.originalname,
    mapping: readMapping(req),
    projectId: req.body?.projectId,
    actorId: req.user?.id || req.user?._id,
  });
});

// Resolves the project scope for a read.
//
// A concrete projectId scopes to it. "all" (or an absent value) means the All Projects
// filter (§2, §22), which is not a project but the set of projects the caller may see — so
// it expands to that list rather than to an unbounded query. The set comes from the same
// project service the selector is populated from, which is what keeps the two in step.
const scopeFor = async (req) => {
  const requested = String(req.query?.projectId || '').trim();
  if (requested && requested.toLowerCase() !== 'all') return [requested];
  const projects = await analyticsService.getProjects({});
  return projects.map((p) => p.id);
};

// Aggregated imported points for the map. Counts only — no contact details (§19, §40).
exports.getImportedMarketingPoints = handle(async (req) =>
  service.getImportedMapPoints(await scopeFor(req)));

// The records behind one marker (§34). The authorised detail view, reached by an explicit
// click — not part of any aggregate payload.
exports.getImportedLocationRecords = handle(async (req) =>
  service.getLocationRecords({
    projectIds: await scopeFor(req),
    city: req.query?.city,
    page: req.query?.page,
    limit: req.query?.limit,
  }));

// Records the map cannot place (§32), so an unresolved location is inspectable and
// correctable rather than just a number.
exports.getUnmappedImportedRecords = handle(async (req) =>
  service.getUnmappedRecords({
    projectIds: await scopeFor(req),
    page: req.query?.page,
    limit: req.query?.limit,
  }));
