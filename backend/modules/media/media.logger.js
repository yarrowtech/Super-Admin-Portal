const baseLogger = require('../../utils/logger');

const mediaLogger = baseLogger.child({
  module: 'media',
  portal: 'media',
});

const getMediaRequestLogger = (req, context = {}) => {
  const requestLogger = req?.log?.child ? req.log.child({ module: 'media', portal: 'media', ...context }) : null;
  return requestLogger || mediaLogger.child(context);
};

module.exports = {
  mediaLogger,
  getMediaRequestLogger,
};
