const env = require("./env");

const allowedOrigins = env.CORS_ORIGIN.split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const devLocalOrigins = env.IS_PRODUCTION
  ? []
  : [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ];

const originAllowList = Array.from(new Set([...allowedOrigins, ...devLocalOrigins]));

const origin = (requestOrigin, callback) => {
  if (!requestOrigin) return callback(null, !env.IS_PRODUCTION);
  if (originAllowList.includes(requestOrigin)) return callback(null, true);
  return callback(new Error(`CORS blocked: ${requestOrigin}`));
};

module.exports = Object.freeze({
  allowedOrigins: originAllowList,
  origin,
  credentials: true,
});
