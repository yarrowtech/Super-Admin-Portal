const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const jwtConfig = require('../config/jwt');

const generateSessionId = (sessionId) => sessionId || crypto.randomUUID();

const generateAccessToken = (user, options = {}) =>
  jwt.sign(
    { userId: user._id?.toString?.() || user.id, email: user.email, role: user.role },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn, jwtid: generateSessionId(options.jti) }
  );

const generateRefreshToken = (user, options = {}) =>
  jwt.sign(
    { userId: user._id?.toString?.() || user.id, email: user.email, role: user.role },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiresIn, jwtid: generateSessionId(options.jti) }
  );

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateSessionId,
};
