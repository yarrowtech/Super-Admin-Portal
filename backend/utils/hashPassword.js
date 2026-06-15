const bcrypt = require('bcryptjs');

const hashPassword = async (value) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(value, salt);
};

const comparePassword = async (raw, hashed) => bcrypt.compare(raw, hashed);

module.exports = {
  hashPassword,
  comparePassword,
};
