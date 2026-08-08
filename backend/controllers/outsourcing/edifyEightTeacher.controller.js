const logger = require('../../utils/logger');
const teacherService = require('../../services/edifyEightTeacher.service');
const { writeAuditTrail } = require('../../services/auditTrail.service');

const getRequestId = (req) => req.headers['x-request-id'] || undefined;

const getTeacherId = (payload) =>
  payload?.data?._id ||
  payload?.data?.id ||
  payload?.teacher?._id ||
  payload?.teacher?.id ||
  payload?._id ||
  payload?.id ||
  '';

const normalizeTeacherPayload = (body = {}) => ({
  ...body,
  email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : body.email,
  name: typeof body.name === 'string' ? body.name.trim() : body.name,
  firstName: typeof body.firstName === 'string' ? body.firstName.trim() : body.firstName,
  lastName: typeof body.lastName === 'string' ? body.lastName.trim() : body.lastName,
});

const validateTeacherPayload = (payload = {}, { partial = false } = {}) => {
  const errors = [];
  const hasName = Boolean(payload.name || payload.firstName || payload.fullName);

  if (!partial && !hasName) errors.push({ field: 'name', message: 'Teacher name is required' });
  if (!partial && !payload.email) errors.push({ field: 'email', message: 'Teacher email is required' });
  if (payload.email && !/^\S+@\S+\.\S+$/.test(String(payload.email))) {
    errors.push({ field: 'email', message: 'Teacher email is invalid' });
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
      targetType: 'teacher',
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
    logger.warn({ err: error }, 'Failed to write EdifyEight teacher audit trail');
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
  logger.error({ err: error, action, resourceId }, 'EdifyEight teacher request failed');
  await audit(req, {
    action,
    status: 'FAILED',
    resourceId,
    errorMessage: error.message,
  });
  return res.status(status).json({
    success: false,
    error: error.message || 'Failed to process EdifyEight teacher request',
    code: error.code || (status === 404 ? 'EDIFYEIGHT_TEACHER_NOT_FOUND' : 'EDIFYEIGHT_TEACHER_REQUEST_FAILED'),
    details: error.upstream || undefined,
  });
};

const listTeachers = async (req, res) => {
  try {
    const upstream = await teacherService.getAllTeachers(req.query, getRequestId(req));
    await audit(req, { action: 'READ', status: 'SUCCESS', metadata: { query: req.query } });
    return sendUpstream(res, upstream);
  } catch (error) {
    return handleFailure(req, res, error, 'READ');
  }
};

const getTeacher = async (req, res) => {
  const teacherId = req.params.teacherId || req.params.id;
  try {
    const upstream = await teacherService.getTeacherById(teacherId, getRequestId(req));
    await audit(req, { action: 'READ', status: 'SUCCESS', resourceId: teacherId });
    return sendUpstream(res, upstream);
  } catch (error) {
    return handleFailure(req, res, error, 'READ', teacherId);
  }
};

const createTeacher = async (req, res) => {
  const payload = normalizeTeacherPayload(req.body);
  const errors = validateTeacherPayload(payload);
  if (errors.length > 0) {
    await audit(req, { action: 'CREATE', status: 'FAILED', errorMessage: 'Teacher validation failed', metadata: { errors } });
    return res.status(400).json({ success: false, error: 'Teacher validation failed', errors });
  }

  try {
    const upstream = await teacherService.createTeacher(payload, getRequestId(req));
    await audit(req, { action: 'CREATE', status: 'SUCCESS', resourceId: getTeacherId(upstream.data) });
    return sendUpstream(res, upstream);
  } catch (error) {
    return handleFailure(req, res, error, 'CREATE');
  }
};

const updateTeacher = async (req, res) => {
  const teacherId = req.params.teacherId || req.params.id;
  const payload = normalizeTeacherPayload(req.body);
  const errors = validateTeacherPayload(payload, { partial: true });
  if (errors.length > 0) {
    await audit(req, { action: 'UPDATE', status: 'FAILED', resourceId: teacherId, errorMessage: 'Teacher validation failed', metadata: { errors } });
    return res.status(400).json({ success: false, error: 'Teacher validation failed', errors });
  }

  try {
    const upstream = await teacherService.updateTeacher(teacherId, payload, getRequestId(req));
    await audit(req, { action: 'UPDATE', status: 'SUCCESS', resourceId: teacherId });
    return sendUpstream(res, upstream);
  } catch (error) {
    return handleFailure(req, res, error, 'UPDATE', teacherId);
  }
};

const deleteTeacher = async (req, res) => {
  const teacherId = req.params.teacherId || req.params.id;
  try {
    const upstream = await teacherService.deleteTeacher(teacherId, getRequestId(req));
    await audit(req, { action: 'DELETE', status: 'SUCCESS', resourceId: teacherId });
    return sendUpstream(res, upstream);
  } catch (error) {
    return handleFailure(req, res, error, 'DELETE', teacherId);
  }
};

const getTeacherStats = async (req, res) => {
  try {
    const upstream = await teacherService.getTeacherStats(getRequestId(req));
    await audit(req, { action: 'READ', status: 'SUCCESS', metadata: { resource: 'teacher_stats' } });
    return sendUpstream(res, upstream);
  } catch (error) {
    return handleFailure(req, res, error, 'READ');
  }
};

module.exports = {
  listTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherStats,
};
