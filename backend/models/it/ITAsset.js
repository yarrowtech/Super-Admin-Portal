const mongoose = require("mongoose");

const itAssetSchema = new mongoose.Schema(
  {
    assetTag: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, trim: true, default: "hardware" },
    status: { type: String, trim: true, default: "active" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    department: { type: String, trim: true, default: "it" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

itAssetSchema.index({ projectId: 1, status: 1 });

module.exports = mongoose.models.ITAsset || mongoose.model("ITAsset", itAssetSchema);
