const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "currentpassword",
  "newpassword",
  "confirmpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "jwttoken",
  "apikey",
  "api_key",
  "secret",
  "clientsecret",
  "privatekey",
  "cardnumber",
  "cvv",
  "cvc",
  "accountnumber",
]);

const MAX_DEPTH = 6;
const MAX_ARRAY_LENGTH = 50;
const MAX_STRING_LENGTH = 1000;

const normalizeKey = (key) => String(key || "").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();

const sanitizeForLog = (value, depth = 0) => {
  if (value == null) return value;
  if (depth > MAX_DEPTH) return "[MaxDepth]";
  if (value instanceof Error) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeForLog(item, depth + 1));
  }

  return Object.entries(value).reduce((acc, [key, item]) => {
    if (SENSITIVE_KEYS.has(normalizeKey(key))) {
      acc[key] = "[Redacted]";
      return acc;
    }
    acc[key] = sanitizeForLog(item, depth + 1);
    return acc;
  }, {});
};

module.exports = {
  sanitizeForLog,
  SENSITIVE_KEYS,
};
