const { authorize } = require('./auth.middleware');

const requireRole = (...roles) => authorize(...roles);

module.exports = {
  requireRole,
};
