require("dotenv").config();

const constants = require("./constants");

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  return value.toLowerCase() === "true";
};

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

const env = Object.freeze({
  NODE_ENV: nodeEnv,
  IS_PRODUCTION: isProduction,
  PORT: parseNumber(process.env.PORT, constants.DEFAULT_PORT),
  MONGO_URI: process.env.MONGO_URI || "",
  CORS_ORIGIN: process.env.CORS_ORIGIN || constants.DEFAULT_CORS_ORIGIN,
  JWT_SECRET: process.env.JWT_SECRET || (isProduction ? "" : "dev-jwt-secret-change-me"),
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || constants.ACCESS_TOKEN_TTL,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || constants.REFRESH_TOKEN_TTL,
  OUTSOURCING_SHARED_SECRET: process.env.OUTSOURCING_SHARED_SECRET || "",
  OUTSOURCING_PORTAL_URL: process.env.OUTSOURCING_PORTAL_URL || "",
  EEC_PORTAL_URL: process.env.EEC_PORTAL_URL || "",
  ENABLE_SELF_REGISTRATION: parseBoolean(process.env.ENABLE_SELF_REGISTRATION, false),
  LOG_LEVEL: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
});

module.exports = env;
