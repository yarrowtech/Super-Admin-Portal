const mongoose = require('mongoose');

/**
 * Access key issued to a trusted first-party consumer (e.g. our own agentic
 * analytics product) so it can read portal data over the MCP endpoint.
 *
 * Only the SHA-256 hash of the key is stored; the plaintext is shown once at
 * creation time and is never recoverable afterwards.
 */
const mcpAccessKeySchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    // Public, non-secret identifier embedded as the key prefix. Lets us look a
    // key up by index instead of scanning and hashing every active row.
    keyId: { type: String, required: true, unique: true, index: true },
    keyHash: { type: String, required: true, select: false },
    // Last 4 chars of the plaintext, for "…a9f3" display in the admin UI.
    keyPreview: { type: String, default: '' },

    // Empty array = access to every domain this endpoint exposes.
    scopes: { type: [String], default: [] },

    status: { type: String, enum: ['ACTIVE', 'REVOKED'], default: 'ACTIVE', index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    expiresAt: { type: Date, default: null, index: true },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    lastUsedIp: { type: String, default: '' },
    useCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

mcpAccessKeySchema.index({ status: 1, expiresAt: 1 });

mcpAccessKeySchema.methods.isUsable = function isUsable() {
  if (this.status !== 'ACTIVE') return false;
  if (this.expiresAt && this.expiresAt.getTime() <= Date.now()) return false;
  return true;
};

module.exports = mongoose.models.McpAccessKey || mongoose.model('McpAccessKey', mcpAccessKeySchema);
