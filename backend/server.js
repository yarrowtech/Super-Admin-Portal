const logger = require("./utils/logger");
const env = require("./config/env");
const { server } = require("./app");
const mongoose = require("mongoose");

const PORT = env.PORT;

const httpServer = server.listen(PORT, () => {
  logger.info(`Server running: http://localhost:${PORT}`);
});

const shutdown = async (signal) => {
  logger.warn({ signal }, "Graceful shutdown started");
  const forceExitTimer = setTimeout(() => {
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  httpServer.close(async () => {
    try {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed");
    } catch (err) {
      logger.error({ err }, "MongoDB close failed");
    }
    clearTimeout(forceExitTimer);
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled rejection");
  shutdown("UNHANDLED_REJECTION");
});

process.on("uncaughtException", (error) => {
  try {
    logger.fatal({ err: error }, "Uncaught exception");
  } catch (logErr) {
    process.stderr.write(`Fatal exception logging failed: ${logErr.message}\n`);
  }
  shutdown("UNCAUGHT_EXCEPTION");
});
