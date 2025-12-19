const mongoose = require('mongoose');

const chatThreadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
    },
    meta: String,
    badge: String,
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isDirect: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

chatThreadSchema.index({ updatedAt: -1 });

const ChatThread = mongoose.model('ChatThread', chatThreadSchema);

module.exports = ChatThread;
