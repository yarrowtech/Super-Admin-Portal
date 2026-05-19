const mongoose = require("mongoose");

const itTicketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    priority: { type: String, trim: true, default: "medium" },
    status: { type: String, trim: true, default: "open" },
    category: { type: String, trim: true, default: "general" },
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    department: { type: String, trim: true, default: "it" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.models.ITTicket || mongoose.model("ITTicket", itTicketSchema);
