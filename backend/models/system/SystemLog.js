const mongoose = require("mongoose");

const { Schema } = mongoose;

const systemLogSchema = new Schema(
  {
    createdAt: {
      type: Date,
      default: Date.now,
    },
    level: {
      type: String,
      enum: ["trace", "debug", "info", "warn", "error", "fatal"],
      default: "info",
      index: true,
    },
    event: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      trim: true,
      index: true,
    },
    department: {
      type: String,
      trim: true,
      index: true,
    },
    module: {
      type: String,
      trim: true,
      index: true,
    },
    action: {
      type: String,
      trim: true,
      index: true,
    },
    requestId: {
      type: String,
      trim: true,
      index: true,
    },
    method: {
      type: String,
      trim: true,
      uppercase: true,
    },
    route: {
      type: String,
      trim: true,
    },
    statusCode: Number,
    durationMs: Number,
    ip: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    source: {
      type: String,
      trim: true,
    },
    targetId: {
      type: String,
      trim: true,
    },
    collection: {
      type: String,
      trim: true,
    },
    operation: {
      type: String,
      trim: true,
    },
    thresholdMs: Number,
    error: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    collection: "system_logs",
    versionKey: false,
    minimize: true,
  }
);

systemLogSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 604800,
  }
);
systemLogSchema.index({ event: 1, createdAt: -1 });
systemLogSchema.index({ requestId: 1, createdAt: -1 });
systemLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.SystemLog || mongoose.model("SystemLog", systemLogSchema);
