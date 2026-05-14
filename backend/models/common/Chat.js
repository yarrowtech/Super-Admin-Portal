const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ['direct', 'group', 'broadcast'],
      default: 'group',
      index: true,
    },
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastMessageBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

chatSchema.index({ updatedAt: -1 });
chatSchema.index({ members: 1, type: 1 });

module.exports = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
