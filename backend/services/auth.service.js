const User = require('../models/auth/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');

const login = async ({ email, password }) => {
  const user = await User.findByCredentials(email, password);
  return {
    user: user.toSafeObject(),
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};

const register = async (payload) => {
  const user = await User.create(payload);
  return {
    user: user.toSafeObject(),
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};

module.exports = {
  login,
  register,
};
