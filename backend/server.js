// // backend/server.js
// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const mongoSanitize = require('express-mongo-sanitize');
// const rateLimit = require('express-rate-limit');
// const morgan = require('morgan');
// const connectDB = require('./config/db');

// // Handle uncaught exceptions - MUST BE AT THE TOP
// process.on('uncaughtException', (err) => {
//   console.error('💥 UNCAUGHT EXCEPTION! Shutting down gracefully...');
//   console.error('Error:', err.message);
//   if (process.env.NODE_ENV === 'development') {
//     console.error('Stack:', err.stack);
//   }
//   process.exit(1);
// });

// // Handle unhandled promise rejections
// process.on('unhandledRejection', (err) => {
//   console.error('💥 UNHANDLED REJECTION! Shutting down gracefully...');
//   console.error('Error:', err.message);
//   if (process.env.NODE_ENV === 'development') {
//     console.error('Stack:', err.stack);
//   }
//   process.exit(1);
// });

// // Initialize Express app
// const app = express();

// // Trust proxy (important for rate limiting behind reverse proxies)
// app.set('trust proxy', 1);

// // Security Headers
// app.use(helmet());

// // CORS configuration
// const corsOptions = {
//   origin: process.env.CORS_ORIGIN || '*',
//   credentials: true,
//   optionsSuccessStatus: 200
// };
// app.use(cors(corsOptions));

// // Body parser middleware with size limits
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Data sanitization against NoSQL injection
// app.use(mongoSanitize());

// // Logging
// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// } else {
//   app.use(morgan('combined'));
// }

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: {
//     success: false,
//     error: 'Too many requests from this IP, please try again later.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// // Apply rate limiting to all routes
// app.use(limiter);

// // Stricter rate limiting for auth routes
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 10,
//   message: {
//     success: false,
//     error: 'Too many authentication attempts, please try again later.'
//   }
// });

// // Connect to MongoDB
// connectDB();

// // Import routes
// const authRoutes = require('./routes/auth.routes');
// const adminRoutes = require('./routes/dept/admin.routes');
// const ceoRoutes = require('./routes/dept/ceo.routes');
// const itRoutes = require('./routes/dept/it.routes');
// const hrRoutes = require('./routes/dept/hr.routes');
// const financeRoutes = require('./routes/dept/finance.routes');
// const lawRoutes = require('./routes/dept/law.routes');
// const mediaRoutes = require('./routes/dept/media.routes');
// const managerRoutes = require('./routes/dept/manager.routes');

// // Health check route (before rate limiting)
// app.get('/health', (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: 'Super Admin Portal API is running',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     environment: process.env.NODE_ENV || 'development'
//   });
// });

// // Root route
// app.get('/', (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: 'Welcome to Super Admin Portal API',
//     version: '1.0.0',
//     endpoints: {
//       health: '/health',
//       auth: '/api/auth',
//       departments: {
//         admin: '/api/dept/admin',
//         ceo: '/api/dept/ceo',
//         it: '/api/dept/it',
//         hr: '/api/dept/hr',
//         finance: '/api/dept/finance',
//         law: '/api/dept/law',
//         media: '/api/dept/media',
//         manager: '/api/dept/manager'
//       }
//     },
//     documentation: '/api/docs'
//   });
// });

// // API Routes with rate limiting
// app.use('/api/auth', authLimiter, authRoutes);
// app.use('/api/dept/admin', adminRoutes);
// app.use('/api/dept/ceo', ceoRoutes);
// app.use('/api/dept/it', itRoutes);
// app.use('/api/dept/hr', hrRoutes);
// app.use('/api/dept/finance', financeRoutes);
// app.use('/api/dept/law', lawRoutes);
// app.use('/api/dept/media', mediaRoutes);
// app.use('/api/dept/manager', managerRoutes);

// // 404 handler - must be after all other routes
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     error: 'Route not found',
//     path: req.originalUrl,
//     method: req.method
//   });
// });

// // Global error handler - must be last
// app.use((err, req, res, next) => {
//   // Log error for debugging
//   console.error('Error occurred:');
//   console.error('Message:', err.message);
//   console.error('Stack:', err.stack);

//   // Handle specific error types
//   let statusCode = err.statusCode || 500;
//   let message = err.message || 'Internal server error';

//   // Mongoose validation error
//   if (err.name === 'ValidationError') {
//     statusCode = 400;
//     message = Object.values(err.errors).map(e => e.message).join(', ');
//   }

//   // Mongoose duplicate key error
//   if (err.code === 11000) {
//     statusCode = 409;
//     const field = Object.keys(err.keyPattern)[0];
//     message = `${field} already exists`;
//   }

//   // Mongoose cast error
//   if (err.name === 'CastError') {
//     statusCode = 400;
//     message = `Invalid ${err.path}: ${err.value}`;
//   }

//   // JWT errors
//   if (err.name === 'JsonWebTokenError') {
//     statusCode = 401;
//     message = 'Invalid token';
//   }

//   if (err.name === 'TokenExpiredError') {
//     statusCode = 401;
//     message = 'Token expired';
//   }

//   // Response
//   const response = {
//     success: false,
//     error: message,
//     ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
//   };

//   res.status(statusCode).json(response);
// });

// // Start server
// const PORT = process.env.PORT || 5000;

// let server;

// try {
//   server = app.listen(PORT, () => {
//     console.log('\n');
//     console.log(`Port:${PORT.toString().padEnd(57)}║`);
//     console.log(`Environment:  ${(process.env.NODE_ENV || 'development').padEnd(57)}║`);
//     console.log(`URL: http://localhost:${PORT}${' '.repeat(39)}║`);
//     console.log('\n');
//   });

//   // Handle server errors
//   server.on('error', (err) => {
//     if (err.code === 'EADDRINUSE') {
//       console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
//       console.error('Please close the other application or change the PORT in .env\n');
//       process.exit(1);
//     } else {
//       console.error('Server error:', err);
//       process.exit(1);
//     }
//   });

// } catch (error) {
//   console.error('Failed to start server:', error.message);
//   process.exit(1);
// }

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('\n⚠️  SIGTERM received. Shutting down gracefully...');
//   if (server) {
//     server.close(() => {
//       console.log('✓ Server closed successfully');
//       process.exit(0);
//     });
//   } else {
//     process.exit(0);
//   }
// });

// process.on('SIGINT', () => {
//   console.log('\n⚠️  SIGINT received. Shutting down gracefully...');
//   if (server) {
//     server.close(() => {
//       console.log('✓ Server closed successfully');
//       process.exit(0);
//     });
//   } else {
//     process.exit(0);
//   }
// });

// module.exports = app;
// backend/server.js
require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const { seedDefaultUsers } = require("./utils/seedDefaultUsers");

// Routes
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/dept/admin.routes");
const ceoRoutes = require("./routes/dept/ceo.routes");
const itRoutes = require("./routes/dept/it.routes");
const hrRoutes = require("./routes/dept/hr.routes");
const financeRoutes = require("./routes/dept/finance.routes");
const lawRoutes = require("./routes/dept/law.routes");
const mediaRoutes = require("./routes/dept/media.routes");
const managerRoutes = require("./routes/dept/manager.routes");
const employeeRoutes = require("./routes/dept/employee.routes");
const employeePortalRoutes = require("./modules/employee");
const { buildManagerSnapshot } = require("./modules/manager/services/metrics.service");
const User = require("./models/User");
const { ROLES } = require("./config/roles");

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  },
});
app.set("io", io);

/* ======================
   1) Database
====================== */
connectDB().then(async () => {
  // Auto-seed default users in non-production when explicitly enabled
  if (process.env.NODE_ENV !== "production" && process.env.AUTO_SEED_DEFAULT_USERS === "true") {
    try {
      await seedDefaultUsers();
    } catch (err) {
      console.error("Default user seeding failed:", err.message);
    }
  }
});

/* ======================
   2) Core Middleware
====================== */
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(mongoSanitize());

/* ======================
   3) CORS (proper)
   NOTE: credentials:true cannot use origin:"*"
====================== */
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman, server-to-server
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

/* ======================
   4) Logging (shows API calls in terminal)
====================== */
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/* ======================
   5) Rate Limiting (simple + safe)
   - Keep in production
   - Disable in development to avoid noisy 429s while coding
====================== */
const isProd = process.env.NODE_ENV === "production";
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Request limit reached. Please retry shortly." },
});

if (isProd) {
  app.use(apiLimiter);
} else {
  console.log("Rate limiting disabled in development");
}

/* ======================
   6) Routes
====================== */
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/dept/admin", adminRoutes);
app.use("/api/dept/ceo", ceoRoutes);
app.use("/api/dept/it", itRoutes);
app.use("/api/dept/hr", hrRoutes);
app.use("/api/dept/finance", financeRoutes);
app.use("/api/dept/law", lawRoutes);
app.use("/api/dept/media", mediaRoutes);
app.use("/api/dept/manager", managerRoutes);
app.use("/api/dept/employee", employeeRoutes);
app.use("/api/employee", employeePortalRoutes);

/* ======================
   7) 404
====================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  });
});

/* ======================
   8) Error Handler
====================== */
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || "Server error",
  });
});

/* ======================
   9) Start Server
====================== */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});

io.on("connection", (socket) => {
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
    if (threadId) {
      socket.join(threadId);
    }
  });

  socket.on("leaveThread", (threadId) => {
    if (threadId) {
      socket.leave(threadId);
    }
  });

  socket.on("chat:seen", (payload = {}) => {
    const { threadId, seenMessageIds } = payload;
    if (!threadId || !Array.isArray(seenMessageIds) || seenMessageIds.length === 0) {
      return;
    }
    socket.to(threadId).emit("chat:seen", {
      threadId,
      seenMessageIds,
      readerId: payload.readerId || null,
      seenAt: new Date().toISOString(),
    });
  });

  socket.on("chat:typing", (payload = {}) => {
    const { threadId, userId, name, isTyping = false } = payload;
    if (!threadId || !userId) {
      return;
    }
    socket.to(threadId).emit("chat:typing", {
      threadId,
      userId,
      name: name || null,
      isTyping: Boolean(isTyping),
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("manager:subscribe", async (payload = {}) => {
    const managerId = payload?.managerId || payload?.managerID || payload?.id;
    if (!managerId) {
      socket.emit("manager:dashboard:error", { message: "managerId is required" });
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
    if (key) {
      socket.leave(`manager:${key}`);
    }
  });

  socket.on("hr:subscribe", () => {
    socket.join("hr");
  });

  socket.on("hr:unsubscribe", () => {
    socket.leave("hr");
  });

  socket.on("disconnect", () => {
    managerIntervals.forEach((intervalId) => clearInterval(intervalId));
    managerIntervals.clear();
  });
});

module.exports = app;
