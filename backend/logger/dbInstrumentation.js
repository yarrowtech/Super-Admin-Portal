const logger = require("../utils/logger");
const { getRequestContext } = require("./context");

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
      logger.error(
        {
          err,
          requestId: context.requestId || null,
          module: context.module || "database",
          action: context.action || "database_operation",
          status: "error",
          durationMs: Math.round(durationMs * 100) / 100,
          ...getMetadata(this),
        },
        "Database operation failed"
      );
      throw err;
    } finally {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      if (durationMs >= thresholdMs) {
        const context = getRequestContext();
        logger.warn(
          {
            requestId: context.requestId || null,
            module: context.module || "database",
            action: context.action || "database_operation",
            status: "slow",
            durationMs: Math.round(durationMs * 100) / 100,
            thresholdMs,
            ...getMetadata(this),
          },
          "Slow query"
        );
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
