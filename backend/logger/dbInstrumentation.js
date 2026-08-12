const logger = require("../utils/logger");
const { getRequestContext } = require("./context");
const logService = require("../services/log.service");

const patchExec = (prototype, getMetadata, thresholdMs) => {
  if (!prototype || prototype.__superAdminLogPatched) return;
  const originalExec = prototype.exec;
  if (typeof originalExec !== "function") return;

  Object.defineProperty(prototype, "__superAdminLogPatched", {
    value: true,
    enumerable: false,
  });

  prototype.exec = async function patchedExec(...args) {
    const startedAt = process.hrtime.bigint();
    try {
      return await originalExec.apply(this, args);
    } catch (err) {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const context = getRequestContext();
      const metadata = getMetadata(this);
      logger.error(
        {
          err,
          requestId: context.requestId || null,
          module: context.module || "database",
          action: context.action || "database_operation",
          status: "error",
          durationMs: Math.round(durationMs * 100) / 100,
          ...metadata,
        },
        "Database operation failed"
      );
      if (metadata.collection !== "system_logs") {
        logService.fireAndForget({
          level: "error",
          event: "DATABASE_ERROR",
          message: "Database operation failed",
          emit: false,
          module: context.module || "database",
          action: context.action || "database_operation",
          requestId: context.requestId || null,
          durationMs: Math.round(durationMs * 100) / 100,
          collection: metadata.collection,
          operation: metadata.operation,
          error: err,
        });
      }
      throw err;
    } finally {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      if (durationMs >= thresholdMs) {
        const context = getRequestContext();
        const metadata = getMetadata(this);
        logger.warn(
          {
            requestId: context.requestId || null,
            module: context.module || "database",
            action: context.action || "database_operation",
            status: "slow",
            durationMs: Math.round(durationMs * 100) / 100,
            thresholdMs,
            ...metadata,
          },
          "Slow query"
        );
        if (metadata.collection !== "system_logs") {
          logService.fireAndForget({
            level: "warn",
            event: "SLOW_QUERY",
            message: "MongoDB query exceeded configured threshold",
            emit: false,
            module: context.module || "database",
            action: context.action || "database_operation",
            requestId: context.requestId || null,
            durationMs: Math.round(durationMs * 100) / 100,
            thresholdMs,
            collection: metadata.collection,
            operation: metadata.operation,
          });
        }
      }
    }
  };
};

const installMongooseInstrumentation = (mongoose) => {
  if (!mongoose || mongoose.__superAdminLogInstrumentationInstalled) return;
  Object.defineProperty(mongoose, "__superAdminLogInstrumentationInstalled", {
    value: true,
    enumerable: false,
  });

  const thresholdMs = Math.max(1, Number(process.env.SLOW_QUERY_MS) || 500);

  patchExec(
    mongoose.Query?.prototype,
    (query) => ({
      collection: query?.model?.collection?.name || query?.mongooseCollection?.name || "unknown",
      operation: query?.op || "query",
    }),
    thresholdMs
  );

  patchExec(
    mongoose.Aggregate?.prototype,
    (aggregate) => ({
      collection: aggregate?._model?.collection?.name || "unknown",
      operation: "aggregate",
    }),
    thresholdMs
  );
};

module.exports = {
  installMongooseInstrumentation,
};
