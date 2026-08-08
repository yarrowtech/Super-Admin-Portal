const logger = require('../../utils/logger');
const materialService = require('../../services/edifyEightStudyMaterial.service');
const { writeAuditTrail } = require('../../services/auditTrail.service');

const getRequestId = (req) => req.headers['x-request-id'] || undefined;

const getMaterialId = (payload) => payload?.data?._id || payload?.data?.id || payload?._id || payload?.id || '';

const normalizeMaterialPayload = (body = {}) => {
  const accessLevel = String(body.accessLevel || (body.isFree === 'true' || body.isFree === true ? 'free' : 'premium')).toLowerCase();
  return {
    title: typeof body.title === 'string' ? body.title.trim() : body.title,
    class: body.class,
    board: body.board,
    subject: body.subject,
    category: body.category || 'Notes',
    accessLevel: ['free', 'limited', 'premium'].includes(accessLevel) ? accessLevel : 'premium',
    isFree: accessLevel === 'free',
    price: accessLevel === 'free' ? 0 : Math.max(0, Number(body.price || 0)),
  };
};

const validateMaterialPayload = (payload = {}, { partial = false, hasFile = false } = {}) => {
  const errors = [];
  if (!partial && !payload.title) errors.push({ field: 'title', message: 'Material title is required' });
  if (!partial && !payload.class) errors.push({ field: 'class', message: 'Class is required' });
  if (!partial && !payload.board) errors.push({ field: 'board', message: 'Board is required' });
  if (!partial && !payload.subject) errors.push({ field: 'subject', message: 'Subject is required' });
  if (!partial && !hasFile) errors.push({ field: 'pdf', message: 'PDF file is required' });
  if (payload.accessLevel !== 'free' && Number(payload.price || 0) < 0) {
    errors.push({ field: 'price', message: 'Price must be zero or greater' });
  }
  return errors;
};

const audit = async (req, { action, status, resourceId = '', errorMessage = '', metadata = {} }) => {
  try {
    await writeAuditTrail({
      userId: req.user?.id || req.user?._id,
      role: req.user?.role,
      module: 'edifyeight',
      action,
      targetType: 'study_material',
      targetId: resourceId,
      metadata: {
        project: 'EEC',
        actorEmail: req.user?.email,
        status,
        errorMessage,
        requestId: getRequestId(req) || null,
        ...metadata,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
      riskFlag: status === 'FAILED' ? 'medium' : 'none',
    });
  } catch (error) {
    logger.warn({ err: error }, 'Failed to write EdifyEight study material audit trail');
  }
};

const sendUpstream = (res, upstream) => {
  if (upstream.data === null || upstream.data === undefined) {
    return res.status(upstream.status).end();
  }
  return res.status(upstream.status).json(upstream.data);
};

const handleFailure = async (req, res, error, action, resourceId = '') => {
  const status = Number(error.status) || 502;
  logger.error({ err: error, action, resourceId }, 'EdifyEight study material request failed');
  await audit(req, { action, status: 'FAILED', resourceId, errorMessage: error.message });
  return res.status(status).json({
    success: false,
    error: error.message || 'Failed to process EdifyEight study material request',
    code: error.code || (status === 404 ? 'EDIFYEIGHT_STUDY_MATERIAL_NOT_FOUND' : 'EDIFYEIGHT_STUDY_MATERIAL_REQUEST_FAILED'),
    details: error.upstream || undefined,
  });
};

const listMaterials = async (req, res) => {
  try {
    const upstream = await materialService.getAllMaterials(req.query, getRequestId(req));
    await audit(req, { action: 'READ', status: 'SUCCESS', metadata: { query: req.query } });
    return sendUpstream(res, upstream);
  } catch (error) {
    return handleFailure(req, res, error, 'READ');
  }
};

const createMaterial = async (req, res) => {
  const payload = normalizeMaterialPayload(req.body);
  const errors = validateMaterialPayload(payload, { hasFile: Boolean(req.file) });
  if (errors.length > 0) {
    await audit(req, { action: 'CREATE', status: 'FAILED', errorMessage: 'Study material validation failed', metadata: { errors } });
    return res.status(400).json({ success: false, error: 'Study material validation failed', errors });
  }

  try {
    const upstream = await materialService.createMaterial(payload, req.file, getRequestId(req));
    await audit(req, { action: 'CREATE', status: 'SUCCESS', resourceId: getMaterialId(upstream.data) });
    return sendUpstream(res, upstream);
  } catch (error) {
    return handleFailure(req, res, error, 'CREATE');
  }
};

const updateMaterial = async (req, res) => {
  const materialId = req.params.materialId || req.params.id;
  const payload = normalizeMaterialPayload(req.body);
  const errors = validateMaterialPayload(payload, { partial: true, hasFile: Boolean(req.file) });
  if (errors.length > 0) {
    await audit(req, { action: 'UPDATE', status: 'FAILED', resourceId: materialId, errorMessage: 'Study material validation failed', metadata: { errors } });
    return res.status(400).json({ success: false, error: 'Study material validation failed', errors });
  }

  try {
    const upstream = await materialService.updateMaterial(materialId, payload, req.file, getRequestId(req));
    await audit(req, { action: 'UPDATE', status: 'SUCCESS', resourceId: materialId });
    return sendUpstream(res, upstream);
  } catch (error) {
    return handleFailure(req, res, error, 'UPDATE', materialId);
  }
};

const deleteMaterial = async (req, res) => {
  const materialId = req.params.materialId || req.params.id;
  try {
    const upstream = await materialService.deleteMaterial(materialId, getRequestId(req));
    await audit(req, { action: 'DELETE', status: 'SUCCESS', resourceId: materialId });
    return sendUpstream(res, upstream);
  } catch (error) {
    return handleFailure(req, res, error, 'DELETE', materialId);
  }
};

const getMaterialStats = async (req, res) => {
  try {
    const upstream = await materialService.getMaterialStats(getRequestId(req));
    await audit(req, { action: 'READ', status: 'SUCCESS', metadata: { resource: 'study_material_stats' } });
    return sendUpstream(res, upstream);
  } catch (error) {
    return handleFailure(req, res, error, 'READ');
  }
};

const getMetadata = async (req, res) => {
  try {
    const upstream = await materialService.getMetadata(getRequestId(req));
    await audit(req, { action: 'READ', status: 'SUCCESS', metadata: { resource: 'study_material_metadata' } });
    return sendUpstream(res, upstream);
  } catch (error) {
    return handleFailure(req, res, error, 'READ');
  }
};

module.exports = {
  listMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialStats,
  getMetadata,
};
