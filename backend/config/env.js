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
  EHC_PORTAL_URL: process.env.EHC_PORTAL_URL || "",
  RMS_PORTAL_URL: process.env.RMS_PORTAL_URL || "",
  EFNBMMS_PORTAL_URL: process.env.EFNBMMS_PORTAL_URL || process.env.EFMBMMS_PORTAL_URL || "",
  EFNBMMS_SSO_PATH: process.env.EFNBMMS_SSO_PATH || process.env.EFMBMMS_SSO_PATH || "/superadmin-login",
  EFNBMMS_SSO_SECRET: process.env.EFNBMMS_SSO_SECRET || process.env.EFMBMMS_SSO_SECRET || process.env.JWT_SECRET || "",
  EFNBMMS_SSO_ISSUER: process.env.EFNBMMS_SSO_ISSUER || process.env.EFMBMMS_SSO_ISSUER || "super-admin-portal",
  EFNBMMS_SSO_AUDIENCE: process.env.EFNBMMS_SSO_AUDIENCE || process.env.EFMBMMS_SSO_AUDIENCE || "efnbmms",
  EFNBMMS_SSO_TTL: process.env.EFNBMMS_SSO_TTL || process.env.EFMBMMS_SSO_TTL || "5m",
  EFNBMMS_SSO_TTL_MS: process.env.EFNBMMS_SSO_TTL_MS || process.env.EFMBMMS_SSO_TTL_MS || "",
  EFNBMMS_LAUNCH_TTL: process.env.EFNBMMS_LAUNCH_TTL || process.env.EFMBMMS_LAUNCH_TTL || "",
  EFNBMMS_SERVICE_TOKEN: process.env.EFNBMMS_SERVICE_TOKEN || process.env.EFMBMMS_SERVICE_TOKEN || process.env.SUPER_ADMIN_PORTAL_SERVICE_TOKEN || "",
  EFNBMMS_CLIENT_ID: process.env.EFNBMMS_CLIENT_ID || process.env.EFMBMMS_CLIENT_ID || "",
  EFNBMMS_CLIENT_SECRET: process.env.EFNBMMS_CLIENT_SECRET || process.env.EFMBMMS_CLIENT_SECRET || "",
  EFNBMMS_ADMIN_MANAGEMENT_API_URL:
    process.env.EFNBMMS_ADMIN_MANAGEMENT_API_URL ||
    process.env.EFMBMMS_ADMIN_MANAGEMENT_API_URL ||
    "",
  EFNBMMS_MANAGER_API_URL:
    process.env.EFNBMMS_MANAGER_API_URL ||
    process.env.EFMBMMS_MANAGER_API_URL ||
    "",
  EFNBMMS_ADMIN_API_URL:
    process.env.EFNBMMS_ADMIN_API_URL ||
    process.env.EFMBMMS_ADMIN_API_URL ||
    "",
  EFNBMMS_API_TOKEN:
    process.env.EFNBMMS_API_TOKEN ||
    process.env.EFMBMMS_API_TOKEN ||
    process.env.SUPER_ADMIN_PORTAL_SERVICE_TOKEN ||
    "",
  ESPORTSM_PORTAL_URL: process.env.ESPORTSM_PORTAL_URL || "",
  SMARTFARMING_PORTAL_URL: process.env.SMARTFARMING_PORTAL_URL || "",
  ENABLE_SELF_REGISTRATION: parseBoolean(process.env.ENABLE_SELF_REGISTRATION, false),
  LOG_LEVEL: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
});

module.exports = env;
