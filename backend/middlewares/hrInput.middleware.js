const mongoose = require('mongoose');
const fail = (res, fields) => res.status(400).json({
  success: false, error: 'Invalid request', code: 'VALIDATION_ERROR', fields,
});
const integer = (value, min, max) => /^\d+$/.test(String(value)) &&
  Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max;

const hrInput = (req, res, next) => {
  const fields = {};
  for (const [key, value] of Object.entries(req.query || {})) {
    if (typeof value !== 'string') fields[key] = 'Must be a single string value';
    else if (value.length > 200) fields[key] = 'Must be at most 200 characters';
  }
  for (const key of ['page', 'limit', 'pageSize']) {
    if (req.query[key] !== undefined && !integer(req.query[key], 1, key === 'page' ? 1000000 : 100)) {
      fields[key] = key === 'page' ? 'Must be a positive integer up to 1000000' : 'Must be an integer from 1 to 100';
    }
  }
  for (const key of ['year', 'month']) {
    if (req.query[key] !== undefined && !integer(req.query[key], key === 'year' ? 1900 : 1, key === 'year' ? 2200 : 12)) {
      fields[key] = 'Invalid calendar value';
    }
  }
  for (const [key, value] of Object.entries(req.params || {})) {
    if (/id$/i.test(key) && !mongoose.isObjectIdOrHexString(value)) fields[key] = 'Invalid record ID';
  }
  for (const key of ['employee', 'employeeId', 'assignee', 'assignedTo', 'job', 'project']) {
    if (req.query[key] !== undefined && !mongoose.isObjectIdOrHexString(req.query[key])) fields[key] = 'Invalid record ID';
  }
  for (const source of [req.query, req.body || {}]) {
    for (const key of ['startDate', 'endDate', 'date', 'checkIn', 'checkOut', 'dueDate']) {
      const value = source[key];
      if (value !== undefined && value !== null && value !== '' &&
          (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value) || !Number.isFinite(Date.parse(value)))) {
        fields[key] = 'Must be an ISO date or timestamp';
      }
    }
    if (source.startDate && source.endDate && new Date(source.startDate) > new Date(source.endDate)) {
      fields.endDate = 'Must be on or after startDate';
    }
  }
  if (req.body?.selectedIds !== undefined &&
      (!Array.isArray(req.body.selectedIds) || req.body.selectedIds.length > 1000 ||
       !req.body.selectedIds.every((id) => mongoose.isObjectIdOrHexString(id)))) {
    fields.selectedIds = 'Must contain at most 1000 valid record IDs';
  }
  if (Object.keys(fields).length) return fail(res, fields);
  if (req.query.pageSize !== undefined && req.query.limit === undefined) req.query.limit = req.query.pageSize;
  next();
};
module.exports = { hrInput };
