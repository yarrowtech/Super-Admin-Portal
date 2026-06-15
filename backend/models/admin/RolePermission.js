const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema(
  {
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    permission: { type: String, required: true, trim: true },
    granted: { type: Boolean, default: true },
  },
  { timestamps: true }
);

rolePermissionSchema.index({ role: 1, permission: 1 }, { unique: true });

module.exports = mongoose.models.RolePermission || mongoose.model('RolePermission', rolePermissionSchema);
