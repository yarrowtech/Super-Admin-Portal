const fs = require("fs");
const path = require("path");
const swaggerAutogen = require("swagger-autogen")({ openapi: "3.0.0" });
const env = require("./config/env");
const logger = require("./utils/logger");

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./swagger.entry.js"];

const MODULE_TAGS = [
  { name: "Health", description: "Service status and health checks" },
  { name: "Auth", description: "Authentication and token management APIs" },
  { name: "Admin", description: "Admin department APIs" },
  { name: "Super Admin", description: "Super Admin department APIs" },
  { name: "CEO", description: "CEO department APIs" },
  { name: "IT", description: "IT department APIs" },
  { name: "HR", description: "HR department APIs" },
  { name: "Finance", description: "Finance department APIs" },
  { name: "Law", description: "Law department APIs" },
  { name: "Media", description: "Media department APIs" },
  { name: "Manager", description: "Manager department APIs" },
  { name: "Employee", description: "Employee APIs" },
  { name: "Department", description: "Common department APIs" },
  { name: "Notification", description: "Notification APIs" },
  { name: "Chat", description: "Chat APIs" },
  { name: "Reports", description: "Report APIs" },
  { name: "Outsourcing", description: "Outsourcing portal APIs" },
  { name: "Dashboard", description: "Common dashboard/workflow APIs" },
];

const doc = {
  info: {
    title: "Super Admin Portal API",
    version: "1.0.0",
    description:
      "Comprehensive OpenAPI documentation for the Super Admin Portal backend. JWT bearer token authentication is used for protected endpoints.",
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}`,
      description: "Local development server",
    },
  ],
  tags: MODULE_TAGS,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    responses: {
      Unauthorized: {
        description: "Unauthorized - missing or invalid token",
      },
      Forbidden: {
        description: "Forbidden - insufficient permissions",
      },
      ServerError: {
        description: "Internal server error",
      },
    },
  },
};

const toTitle = (value) =>
  value
    .replace(/[{}]/g, "")
    .replace(/[-_]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const getTagForPath = (routePath) => {
  if (routePath === "/health") return "Health";
  if (routePath.startsWith("/api/auth")) return "Auth";
  if (routePath.startsWith("/api/dept/admin")) return "Admin";
  if (routePath.startsWith("/api/super-admin") || routePath.startsWith("/api/dept/super-admin")) return "Super Admin";
  if (routePath.startsWith("/api/dept/ceo")) return "CEO";
  if (routePath.startsWith("/api/dept/it")) return "IT";
  if (routePath.startsWith("/api/dept/hr")) return "HR";
  if (routePath.startsWith("/api/dept/finance")) return "Finance";
  if (routePath.startsWith("/api/dept/law")) return "Law";
  if (routePath.startsWith("/api/dept/media")) return "Media";
  if (routePath.startsWith("/api/dept/manager")) return "Manager";
  if (routePath.startsWith("/api/dept/employee")) return "Employee";
  if (routePath.startsWith("/api/employee")) return "Employee";
  if (routePath.startsWith("/api/dept")) return "Department";
  if (routePath.startsWith("/api/notifications")) return "Notification";
  if (routePath.startsWith("/api/chat")) return "Chat";
  if (routePath.startsWith("/api/reports")) return "Reports";
  if (routePath.startsWith("/api/outsourcing")) return "Outsourcing";
  if (routePath.startsWith("/api/dashboard")) return "Dashboard";
  return "Reports";
};

const isPublicEndpoint = (routePath, method) => {
  const m = method.toLowerCase();
  if (routePath === "/health") return true;
  if (!routePath.startsWith("/api/auth")) return false;
  if (m === "post" && ["/api/auth/register", "/api/auth/login", "/api/auth/refresh-token", "/api/auth/verify-token"].includes(routePath)) {
    return true;
  }
  return false;
};

const enrichSpec = () => {
  const absoluteOutputPath = path.join(__dirname, "swagger-output.json");
  const spec = JSON.parse(fs.readFileSync(absoluteOutputPath, "utf8"));
  const usedTags = new Set();

  for (const [routePath, methods] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(methods || {})) {
      if (!operation || typeof operation !== "object") continue;

      const tag = getTagForPath(routePath);
      usedTags.add(tag);

      operation.tags = [tag];
      if (!operation.summary || !operation.summary.trim()) {
        const parts = routePath.split("/").filter(Boolean).slice(2);
        const resource = parts.length ? toTitle(parts.join(" ")) : "Health";
        operation.summary = `${method.toUpperCase()} ${resource}`;
      }

      if (!operation.operationId) {
        const opName = `${method.toLowerCase()}_${routePath.replace(/[{}]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
        operation.operationId = opName;
      }

      if (!isPublicEndpoint(routePath, method)) {
        operation.security = [{ bearerAuth: [] }];
        operation.responses = operation.responses || {};
        operation.responses["401"] = operation.responses["401"] || { $ref: "#/components/responses/Unauthorized" };
        operation.responses["403"] = operation.responses["403"] || { $ref: "#/components/responses/Forbidden" };
      }

      operation.responses = operation.responses || {};
      operation.responses["500"] = operation.responses["500"] || { $ref: "#/components/responses/ServerError" };
    }
  }

  spec.tags = MODULE_TAGS.filter((tag) => usedTags.has(tag.name));
  fs.writeFileSync(absoluteOutputPath, JSON.stringify(spec, null, 2));
};

swaggerAutogen(outputFile, endpointsFiles, doc)
  .then(() => {
    enrichSpec();
    logger.info({ outputFile }, "Swagger spec generated");
  })
  .catch((err) => {
    logger.error({ err }, "Swagger generation failed");
    process.exit(1);
  });
