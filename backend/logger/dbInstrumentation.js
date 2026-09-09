const logger = require("../utils/logger");
const { getRequestContext } = require("./context");
const logService = require("../services/log.service");
const env = require("../config/env");

const roundMs = (durationMs) => Math.round(durationMs * 100) / 100;

const extractFilterFields = (query) => {
  if (!env.LOG_DB_QUERY_DETAILS || !query || typeof query.getFilter !== "function") return undefined;
  const filter = query.getFilter();
  if (!filter || typeof filter !== "object") return undefined;
  return Object.keys(filter).filter((key) => !key.startsWith("$")).slice(0, 20);
};

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
          event: "db.query.error",
          category: "DB",
          err,
          requestId: context.requestId || null,
          sessionId: context.sessionId || null,
          module: context.module || "database",
          action: context.action || "database_operation",
          status: "error",
          method: context.method || null,
          route: context.route || context.path || null,
          userId: context.userId || null,
          role: context.role || null,
          department: context.department || null,
          portal: context.portal || null,
          durationMs: roundMs(durationMs),
          queryDurationMs: roundMs(durationMs),
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
          sessionId: context.sessionId || null,
          durationMs: roundMs(durationMs),
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
            event: "db.query.slow",
            category: "DB",
            requestId: context.requestId || null,
            sessionId: context.sessionId || null,
            module: context.module || "database",
            action: context.action || "database_operation",
            status: "slow",
            method: context.method || null,
            route: context.route || context.path || null,
            userId: context.userId || null,
            role: context.role || null,
            department: context.department || null,
            portal: context.portal || null,
            durationMs: roundMs(durationMs),
            queryDurationMs: roundMs(durationMs),
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
            sessionId: context.sessionId || null,
            durationMs: roundMs(durationMs),
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

  const thresholdMs = env.LOG_SLOW_QUERY_MS;

  patchExec(
    mongoose.Query?.prototype,
    (query) => ({
      collection: query?.model?.collection?.name || query?.mongooseCollection?.name || "unknown",
      operation: query?.op || "query",
      filterFields: extractFilterFields(query),
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
