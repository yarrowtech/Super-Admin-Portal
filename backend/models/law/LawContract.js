const mongoose = require("mongoose");

const lawContractSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    ownerDepartment: { type: String, trim: true, default: "law" },
    status: { type: String, trim: true, default: "draft" },
    approvalStatus: { type: String, trim: true, default: "pending" },
    expiryDate: { type: Date, required: true },
    linkedInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null },
    linkedEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

lawContractSchema.index({ expiryDate: 1, status: 1 });

module.exports = mongoose.models.LawContract || mongoose.model("LawContract", lawContractSchema);
