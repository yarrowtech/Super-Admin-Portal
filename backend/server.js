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
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

const connectDB = require("./config/db");

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

const app = express();

/* ======================
   1) Database
====================== */
connectDB();

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
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

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
====================== */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many requests, try again later." },
  })
);

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
app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});

module.exports = app;
