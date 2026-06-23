const logger = require("./logger/logger");
require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
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
const { ROLES } = require("./config/roles");
const routes = require("./routes");
const requestLogger = require("./logger/requestLogger");
const { ensureSuperAdminDefaults } = require("./utils/bootstrapSuperAdminData");
const { buildManagerSnapshot } = require("./services/dashboard.service");
const { startLawExpiryTracker } = require("./modules/law/law.cron");
const { User } = require("./models/auth");
const errorMiddleware = require("./middlewares/error.middleware");
const cacheHeaders = require("./middlewares/cacheHeaders");
const jwtConfig = require("./config/jwt");

const app = express();
const server = http.createServer(app);
const ioOptions = {
  ...socketConfig,
  cors: socketConfig?.cors ? { ...socketConfig.cors } : undefined,
};
const io = new Server(server, ioOptions);
app.set("io", io);
const onlineUsers = new Map();

connectDB().then(async () => {
  try {
    await ensureSuperAdminDefaults();
    startLawExpiryTracker();
    logger.info("Super Admin defaults ensured");
  } catch (err) {
    logger.error({ err }, "Super Admin defaults bootstrap failed");
  }
});

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: constants.REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: constants.REQUEST_BODY_LIMIT }));
app.use(mongoSanitize());
app.use(cors({ origin: corsConfig.origin, credentials: corsConfig.credentials }));
app.use(requestLogger);

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
app.use("/api/dept/sales", routes.salesRoutes);
app.use("/api/dept/research", routes.researchRoutes);
app.use("/api/dept/manager", routes.managerRoutes);
app.use("/api/dept/employee", routes.employeeDeptRoutes);
app.use("/api/employee", routes.employeePortalRoutes);
app.use("/api", routes.projectAccessRoutes);
app.use("/api/sso", routes.ssoRoutes);
app.use("/api/external-auth", routes.externalAuthRoutes);
app.use("/api/dept", routes.departmentRoutes);
app.use("/api/notifications", routes.notificationRoutes);
app.use("/api/chat", routes.chatRoutes);
app.use("/api/reports", routes.reportRoutes);
app.use("/api/analytics", routes.analyticsRoutes);
app.use("/api/automation", routes.automationRoutes);
app.use("/api/outsourcing", routes.outsourcingRoutes);
app.use("/api/integrations/efnbmms/identity", routes.efnbmmsIdentityRoutes);
app.use("/api/integrations/efnbmms/admin-management", routes.efnbmmsRoutes);
app.use("/api/integrations/efnbmms/admin", routes.efnbmmsAdminRoutes);
app.use("/api/integrations/efnbmms/manager", routes.efnbmmsManagerRoutes);
app.use("/api/dashboard", routes.dashboardRoutes);
app.use("/api/profile", routes.profileRoutes);
app.use("/api/hr", routes.hrProfileRoutes);
app.use("/api/legal", routes.legalDocRoutes);
app.use("/api/portal-support", routes.portalSupportRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  });
});

app.use(errorMiddleware);

io.on("connection", (socket) => {
  const requestId = socket.handshake.headers["x-request-id"] || socket.id;
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, jwtConfig.accessSecret);
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
    } catch (err) {
      logger.warn({ err, requestId, socketId: socket.id }, "Socket token verification failed");
    }
  }
  logger.info({ socketId: socket.id, requestId, userId: socket.data.userId || null }, "Socket connected");
  if (socket.data.userId) {
    const uid = String(socket.data.userId);
    onlineUsers.set(uid, socket.id);
    io.emit("user_presence", { userId: uid, online: true });
  }
  const managerIntervals = new Map();

  const clearManagerInterval = (key) => {
    if (!key) return;
    const intervalId = managerIntervals.get(key);
    if (intervalId) {
      clearInterval(intervalId);
      managerIntervals.delete(key);
    }
  };

  const emitManagerSnapshot = async (managerId) => {
    if (!managerId) return;
    try {
      const manager = await User.findById(managerId);
      if (!manager || manager.role !== ROLES.MANAGER) {
        socket.emit("manager:dashboard:error", { message: "Manager not authorized" });
        return;
      }
      const snapshot = await buildManagerSnapshot(manager);
      socket.emit("manager:dashboard", snapshot);
    } catch (err) {
      socket.emit("manager:dashboard:error", { message: err.message || "Failed to refresh manager data" });
    }
  };

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

  socket.on("manager:subscribe", async (payload = {}) => {
    const managerId = payload?.managerId || payload?.managerID || payload?.id;
    if (!managerId) {
      socket.emit("manager:dashboard:error", { message: "managerId is required" });
      return;
    }
    if (!socket.data.userId || socket.data.role !== ROLES.MANAGER || socket.data.userId !== managerId.toString()) {
      socket.emit("manager:dashboard:error", { message: "Manager not authorized" });
      logger.warn(
        { socketId: socket.id, requestId, managerId, userId: socket.data.userId || null, role: socket.data.role || null },
        "Rejected unauthorized manager:subscribe"
      );
      return;
    }
    const key = managerId.toString();
    clearManagerInterval(key);
    await emitManagerSnapshot(managerId);
    const intervalId = setInterval(() => emitManagerSnapshot(managerId), 15000);
    managerIntervals.set(key, intervalId);
    socket.join(`manager:${key}`);
  });

  socket.on("manager:unsubscribe", (payload = {}) => {
    const managerId = payload?.managerId || payload?.managerID || payload?.id;
    const key = managerId?.toString?.() || managerId;
    clearManagerInterval(key);
    if (key) socket.leave(`manager:${key}`);
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
    const adminRoles = ["admin", "hr", "manager", "finance", "law", "legal_head"];
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
    managerIntervals.forEach((intervalId) => clearInterval(intervalId));
    managerIntervals.clear();
    logger.info({ socketId: socket.id, requestId }, "Socket disconnected");
  });
});

module.exports = { app, server };
