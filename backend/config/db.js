const logger = require('../utils/logger');
const mongoose = require("mongoose");
const env = require("./env");
const constants = require("./constants");
const { installMongooseInstrumentation } = require("../logger/dbInstrumentation");
const SystemLog = require("../models/system/SystemLog");
const logService = require("../services/log.service");

const connectDB = async () => {
  if (!env.MONGO_URI) {
    logger.error({ env: env.NODE_ENV }, "MONGO_URI is missing. Database connection aborted.");
    process.exit(1);
  }

  try {
    if (!env.IS_PRODUCTION) {
      installMongooseInstrumentation(mongoose);
    }

    const options = {
      serverSelectionTimeoutMS: constants.MONGO_SERVER_SELECTION_TIMEOUT_MS,
      socketTimeoutMS: constants.MONGO_SOCKET_TIMEOUT_MS,
    };

    const conn = await mongoose.connect(env.MONGO_URI, options);
    try {
      await SystemLog.init();
    } catch (err) {
      logger.warn({ err }, "SystemLog indexes initialization failed");
    }

    logger.info(
      {
        host: conn.connection.host,
        database: conn.connection.name,
      },
      "MongoDB connected"
    );
    logService.fireAndForget({
      level: "info",
      event: "DATABASE_CONNECTED",
      message: "MongoDB connected",
      emit: false,
      module: "database",
      action: "DATABASE_CONNECTED",
      metadata: {
        host: conn.connection.host,
        database: conn.connection.name,
      },
    });

    mongoose.connection.on("error", (err) => {
      logger.error({ err }, "MongoDB connection error");
      logService.fireAndForget({
        level: "error",
        event: "DATABASE_ERROR",
        message: "MongoDB connection error",
        emit: false,
        module: "database",
        action: "DATABASE_ERROR",
        error: err,
      });
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
    });
  } catch (error) {
    logger.error({ err: error }, "MongoDB connection failed");
    process.exit(1);
  }
};

module.exports = connectDB;
