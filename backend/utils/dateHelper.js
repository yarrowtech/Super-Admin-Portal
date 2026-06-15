const nowIso = () => new Date().toISOString();

const startOfDay = (value = new Date()) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (value = new Date()) => {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
};

module.exports = {
  nowIso,
  startOfDay,
  endOfDay,
};
