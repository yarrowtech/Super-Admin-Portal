const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

const generateAccessToken = (user) =>
  jwt.sign(
    { userId: user._id?.toString?.() || user.id, email: user.email, role: user.role },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn }
  );

const generateRefreshToken = (user) =>
  jwt.sign(
    { userId: user._id?.toString?.() || user.id, email: user.email, role: user.role },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiresIn }
  );

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
