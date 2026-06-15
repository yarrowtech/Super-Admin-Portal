const corsConfig = require("./cors");

module.exports = Object.freeze({
  cors: {
    origin: corsConfig.origin,
    credentials: corsConfig.credentials,
  },
});
