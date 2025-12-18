// backend/models/SupportTicket.js
const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['hardware', 'software', 'network', 'access', 'email', 'application', 'other'],
      required: [true, 'Category is required']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'waiting', 'resolved', 'closed', 'cancelled'],
      default: 'open'
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester is required']
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    department: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    assignedDate: {
      type: Date
    },
    resolvedDate: {
      type: Date
    },
    closedDate: {
      type: Date
    },
    resolutionTime: {
      type: Number,
      min: 0
    },
    solution: {
      type: String,
      trim: true
    },
    attachments: [{
      fileName: String,
      fileUrl: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    comments: [{
      commentedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      comment: String,
      isInternal: {
        type: Boolean,
        default: false
      },
      commentedAt: {
        type: Date,
        default: Date.now
      }
    }],
    relatedTickets: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportTicket'
    }]
  },
  {
    timestamps: true
  }
);

// Auto-generate ticket number if not provided
supportTicketSchema.pre('save', function (next) {
  if (!this.ticketNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.ticketNumber = `TKT${year}${month}${random}`;
  }
  next();
});

// Calculate resolution time when ticket is resolved
supportTicketSchema.pre('save', function (next) {
  if (this.resolvedDate && !this.resolutionTime) {
    const hours = (this.resolvedDate - this.createdAt) / (1000 * 60 * 60);
    this.resolutionTime = Math.round(hours * 100) / 100;
  }
  next();
});

// Indexes for better query performance
supportTicketSchema.index({ ticketNumber: 1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ requester: 1 });
supportTicketSchema.index({ assignedTo: 1 });
supportTicketSchema.index({ category: 1 });
supportTicketSchema.index({ createdAt: -1 });

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

module.exports = SupportTicket;
