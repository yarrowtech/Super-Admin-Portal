const logger = require('../utils/logger');
const mongoose = require("mongoose");
const env = require("./env");
const constants = require("./constants");

const connectDB = async () => {
  if (!env.MONGO_URI) {
    logger.error({ env: env.NODE_ENV }, "MONGO_URI is missing. Database connection aborted.");
    process.exit(1);
  }

  try {
    const options = {
      serverSelectionTimeoutMS: constants.MONGO_SERVER_SELECTION_TIMEOUT_MS,
      socketTimeoutMS: constants.MONGO_SOCKET_TIMEOUT_MS,
    };

    const conn = await mongoose.connect(env.MONGO_URI, options);

    logger.info(
      {
        host: conn.connection.host,
        database: conn.connection.name,
      },
      "MongoDB connected"
    );

    mongoose.connection.on("error", (err) => {
      logger.error({ err }, "MongoDB connection error");
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
