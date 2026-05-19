const logger = require("../../utils/logger");
const LawContract = require("../../models/law/LawContract");

let intervalRef = null;

const runContractExpirySweep = async () => {
  const now = new Date();
  const result = await LawContract.updateMany(
    { status: { $ne: "expired" }, expiryDate: { $lt: now } },
    { $set: { status: "expired", updatedAt: now } }
  );
  if (result.modifiedCount) {
    logger.info({ modifiedCount: result.modifiedCount }, "LAW contract expiry sweep completed");
  }
};

const startLawExpiryTracker = () => {
  if (intervalRef) return;
  intervalRef = setInterval(() => {
    runContractExpirySweep().catch((err) => logger.error({ err }, "LAW expiry sweep failed"));
  }, 1000 * 60 * 30);
  intervalRef.unref();
};

module.exports = { startLawExpiryTracker, runContractExpirySweep };
