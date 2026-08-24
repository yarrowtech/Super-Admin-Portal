const logger = require("./utils/logger");
const logService = require("./services/log.service");
require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const mongoose = require("mongoose");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const env = require("./config/env");
const corsConfig = require("./config/cors");
const socketConfig = require("./config/socket");
const constants = require("./config/constants");
const routes = require("./routes");
const requestLogger = require("./logger/requestLogger");
const { requestContextMiddleware } = require("./middlewares/requestContext.middleware");
const auditMiddleware = require("./middlewares/audit.middleware");
const { ensureSuperAdminDefaults } = require("./utils/bootstrapSuperAdminData");
const { startLawExpiryTracker } = require("./modules/law/law.cron");
const { startRenderKeepAlive } = require("./jobs/renderKeepAlive");
const { User } = require("./models/auth");
const Session = require("./models/auth/Session");
const errorMiddleware = require("./middlewares/error.middleware");
const cacheHeaders = require("./middlewares/cacheHeaders");
const jwtConfig = require("./config/jwt");
const { CacheService } = require("./services/cache.service");

const app = express();
const server = http.createServer(app);
const ioOptions = {
  ...socketConfig,
  cors: socketConfig?.cors ? { ...socketConfig.cors } : undefined,
};
const io = new Server(server, ioOptions);
app.set("io", io);
const onlineUsers = new Map();
require("./services/socketRegistry").registerSocket(io, onlineUsers);

const countExpressRoutes = (expressApp) => {
  const walk = (stack = []) => stack.reduce((count, layer) => {
    if (layer.route) return count + Object.keys(layer.route.methods || {}).length;
    if (layer.name === "router" && layer.handle?.stack) return count + walk(layer.handle.stack);
    return count;
  }, 0);
  return walk(expressApp?._router?.stack || []);
};

connectDB().then(async () => {
  try {
    await ensureSuperAdminDefaults();
    startLawExpiryTracker();
    startRenderKeepAlive();
    logger.info("Super Admin defaults ensured");
  } catch (err) {
    logger.error({ err }, "Super Admin defaults bootstrap failed");
  }
});

app.set("trust proxy", 1);
app.use(cors({
  origin: corsConfig.origin,
  credentials: corsConfig.credentials,
  methods: corsConfig.methods,
  allowedHeaders: corsConfig.allowedHeaders,
}));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: constants.REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: constants.REQUEST_BODY_LIMIT }));
app.use(mongoSanitize());

if (!env.IS_PRODUCTION) {
  app.post("/__dev/frontend-log", (req, res) => {
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const level = payload.level === "error" ? "error" : payload.level === "warn" ? "warn" : "info";
    const event = level === "error" || payload.direction === "error"
      ? "FRONTEND_ERROR"
      : String(payload.action || payload.eventType || "FRONTEND_EVENT").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toUpperCase();
    logger[payload.level === "error" ? "error" : payload.level === "warn" ? "warn" : "info"](
      {
        source: "frontend",
        eventType: payload.eventType || "event",
        direction: payload.direction || null,
        method: payload.method || null,
        path: payload.path || null,
        statusCode: payload.statusCode || null,
        durationMs: payload.durationMs || null,
        requestId: payload.requestId || req.headers["x-request-id"] || null,
        userId: payload.userId || null,
        role: payload.role || null,
        module: payload.module || "frontend",
        action: payload.action || null,
        status: payload.status || null,
        route: payload.route || null,
        error: payload.error || null,
        message: payload.message || null,
      },
      "Frontend activity"
    );
    logService.fireAndForget({
      level,
      event,
      message: payload.error || payload.message || "Frontend activity",
      emit: false,
      source: "FRONTEND",
      module: payload.module || "frontend",
      action: payload.action || payload.eventType || null,
      requestId: payload.requestId || req.headers["x-request-id"] || null,
      method: payload.method || null,
      route: payload.path || payload.route || null,
      statusCode: payload.statusCode || null,
      durationMs: payload.durationMs || null,
      userId: payload.userId || null,
      role: payload.role || null,
      ip: req.ip || req.socket?.remoteAddress || null,
      userAgent: req.get("user-agent") || null,
      metadata: {
        status: payload.status || null,
        eventType: payload.eventType || null,
      },
      error: payload.error ? { name: "FrontendError", message: payload.error } : null,
    });
    res.status(204).end();
  });
}

app.use(requestLogger);
app.use(requestContextMiddleware);
app.use(auditMiddleware);

const isProd = env.IS_PRODUCTION;
const apiLimiter = rateLimit({
  windowMs: constants.API_RATE_LIMIT_WINDOW_MS,
  max: constants.API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Request limit reached. Please retry shortly." },
});

if (isProd) {
  app.use(apiLimiter);
} else {
  logger.info({ env: env.NODE_ENV }, "Rate limiting disabled in development");
}

app.use('/api', cacheHeaders);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Super Admin API is running",
  });
});

app.get("/health", (req, res) => {
  const stateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };
  const dbStateCode = mongoose.connection.readyState;
  const dbState = stateMap[dbStateCode] || "unknown";
  const healthy = dbState === "connected";
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? "API is healthy" : "API degraded",
    data: {
      uptimeSec: Math.round(process.uptime()),
      env: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      database: {
        state: dbState,
        code: dbStateCode
      },
      cache: CacheService.metrics(),
      integrations: {
        edifyEightTeachers: {
          configured: Boolean(env.EDIFYEIGHT_API_TOKEN && (env.EDIFYEIGHT_TEACHER_API_URL || env.EDIFYEIGHT_API_URL)),
          url: env.EDIFYEIGHT_TEACHER_API_URL || (env.EDIFYEIGHT_API_URL ? `${env.EDIFYEIGHT_API_URL.replace(/\/$/, "")}/api/internal/teachers` : "")
        },
        edifyEightStudyMaterials: {
          configured: Boolean(env.EDIFYEIGHT_API_TOKEN && (env.EDIFYEIGHT_STUDY_MATERIAL_API_URL || env.EDIFYEIGHT_API_URL)),
          url: env.EDIFYEIGHT_STUDY_MATERIAL_API_URL || (env.EDIFYEIGHT_API_URL ? `${env.EDIFYEIGHT_API_URL.replace(/\/$/, "")}/api/internal/study-materials` : "")
        },
        efnbmmsAdminManagement: {
          configured: Boolean(env.EFNBMMS_API_TOKEN && env.EFNBMMS_ADMIN_MANAGEMENT_API_URL),
          url: env.EFNBMMS_ADMIN_MANAGEMENT_API_URL
        }
      }
    }
  });
});

app.use("/api/auth", routes.authRoutes);
app.use("/api/attendance", routes.attendanceRoutes);
app.use("/api/dept/admin", routes.adminRoutes);
app.use("/api/super-admin", routes.superAdminPortalRoutes);
app.use("/api/dept/super-admin", routes.superAdminRoutes);
app.use("/api/dept/ceo", routes.ceoRoutes);
app.use("/api/ceo", routes.ceoRoutes);
app.use("/api/dept/it", routes.itRoutes);
app.use("/api/dept/hr", routes.hrRoutes);
app.use("/api/dept/finance", routes.financeRoutes);
app.use("/api/dept/law", routes.lawRoutes);
app.use("/api/law", routes.lawRoutes);
app.use("/api/dept/media", routes.mediaRoutes);
app.use("/api/dept/project-overview", routes.projectOverviewRoutes);
app.use("/api/dept/sales", routes.salesRoutes);
app.use("/api/dept/manager", routes.managerRoutes);
app.use("/api/dept/employee", routes.employeeDeptRoutes);
app.use("/api/employee", routes.employeePortalRoutes);
// Research portal was retired by the role/department restructuring.
app.use("/api", routes.projectAccessRoutes);
app.use("/api/sso", routes.ssoRoutes);
app.use("/api/external-auth", routes.externalAuthRoutes);
app.use("/api/dept", routes.departmentRoutes);
app.use("/api/notifications", routes.notificationRoutes);
app.use("/api/chat", routes.chatRoutes);
app.use("/api/reports", routes.reportRoutes);
app.use("/api/analytics", routes.analyticsRoutes);
app.use("/api/automation", routes.automationRoutes);
app.use("/api/outsourcing/edifyeight", routes.edifyEightTeacherRoutes);
app.use("/api/outsourcing", routes.outsourcingRoutes);
app.use("/api/integrations/efnbmms/admin-management", routes.efnbmmsRoutes);
app.use("/api/dashboard", routes.dashboardRoutes);
app.use("/api/profile", routes.profileRoutes);
app.use("/api/hr", routes.hrProfileRoutes);
app.use("/api/legal", routes.legalDocRoutes);
app.use("/api/portal-support", routes.portalSupportRoutes);
app.use("/api/logs", routes.logRoutes);
app.use("/api/portfolios", routes.portfolioRoutes);

logger.info({ routeCount: countExpressRoutes(app) }, "Routes loaded");

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  });
});

app.use(errorMiddleware);

io.on("connection", async (socket) => {
  const requestId = socket.handshake.headers["x-request-id"] || socket.id;
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
  if (!token) {
    logger.warn({ requestId, socketId: socket.id }, "Socket connection rejected without token");
    socket.disconnect(true);
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.accessSecret);
    if (!decoded.jti) {
      logger.warn({ requestId, socketId: socket.id }, "Socket connection rejected without session id");
      socket.disconnect(true);
      return;
    }

    const session = await Session.findOne({
      user: decoded.userId,
      jti: decoded.jti,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).select("_id");

    const user = await User.findById(decoded.userId).select("_id role isActive accountStatus").lean();
    if (!session || !user || !user.isActive || ["suspended", "blocked"].includes(user.accountStatus)) {
      logger.warn({ requestId, socketId: socket.id, userId: decoded.userId || null }, "Socket connection rejected for inactive session");
      socket.disconnect(true);
      return;
    }

    socket.data.userId = String(user._id);
    socket.data.role = user.role;
  } catch (err) {
    logger.warn({ err, requestId, socketId: socket.id }, "Socket token verification failed");
    socket.disconnect(true);
    return;
  }
  logger.info({ socketId: socket.id, requestId, userId: socket.data.userId || null }, "Socket connected");
  if (socket.data.userId) {
    const uid = String(socket.data.userId);
    onlineUsers.set(uid, socket.id);
    io.emit("user_presence", { userId: uid, online: true });
  }
  socket.on("joinThread", (threadId) => {
    if (threadId) socket.join(threadId);
  });
  socket.on("join_room", (roomId) => {
    if (roomId) socket.join(roomId);
  });

  socket.on("leaveThread", (threadId) => {
    if (threadId) socket.leave(threadId);
  });

  socket.on("chat:seen", (payload = {}) => {
    const { threadId, seenMessageIds } = payload;
    if (!threadId || !Array.isArray(seenMessageIds) || seenMessageIds.length === 0) return;
    socket.to(threadId).emit("chat:seen", {
      threadId,
      seenMessageIds,
      readerId: payload.readerId || null,
      seenAt: new Date().toISOString(),
    });
  });
  socket.on("message_read", (payload = {}) => {
    const { conversationId, messageIds } = payload;
    if (!conversationId || !Array.isArray(messageIds) || messageIds.length === 0) return;
    socket.to(conversationId).emit("message_read", {
      conversationId,
      messageIds,
      readerId: payload.readerId || socket.data.userId || null,
      seenAt: new Date().toISOString(),
    });
  });

  socket.on("chat:typing", (payload = {}) => {
    const { threadId, userId, name, isTyping = false } = payload;
    if (!threadId || !userId) return;
    socket.to(threadId).emit("chat:typing", {
      threadId,
      userId,
      name: name || null,
      isTyping: Boolean(isTyping),
      timestamp: new Date().toISOString(),
    });
  });
  socket.on("typing", (payload = {}) => {
    const { conversationId, userId, name, isTyping = false } = payload;
    if (!conversationId || !userId) return;
    socket.to(conversationId).emit("user_typing", {
      conversationId,
      userId,
      name: name || null,
      isTyping: Boolean(isTyping),
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("send_message", (payload = {}) => {
    const { conversationId, message } = payload;
    if (!conversationId || !message) return;
    io.to(conversationId).emit("receive_message", {
      ...message,
      conversationId,
    });
  });
  socket.on("user_online", (payload = {}) => {
    const uid = String(payload.userId || socket.data.userId || "");
    if (!uid) return;
    onlineUsers.set(uid, socket.id);
    io.emit("user_presence", { userId: uid, online: true });
  });

  socket.on("hr:subscribe", () => {
    socket.join("hr");
  });

  socket.on("hr:unsubscribe", () => {
    socket.leave("hr");
  });

  // Outsourcing portal rooms
  socket.on("outsourcing:subscribe", (payload = {}) => {
    const userId = payload?.userId || socket.data.userId;
    if (userId) socket.join(`outsourcing:user:${userId}`);
    const adminRoles = ["admin", "hr", "finance_manager", "finance_employee", "law_head", "law_employee"];
    if (adminRoles.includes(socket.data.role)) socket.join("outsourcing:admins");
  });

  socket.on("outsourcing:unsubscribe", (payload = {}) => {
    const userId = payload?.userId || socket.data.userId;
    if (userId) socket.leave(`outsourcing:user:${userId}`);
    socket.leave("outsourcing:admins");
  });

  socket.on("disconnect", () => {
    if (socket.data.userId) {
      const uid = String(socket.data.userId);
      if (onlineUsers.get(uid) === socket.id) {
        onlineUsers.delete(uid);
        io.emit("user_presence", { userId: uid, online: false });
      }
    }
    logger.info({ socketId: socket.id, requestId }, "Socket disconnected");
  });
});

module.exports = { app, server };
