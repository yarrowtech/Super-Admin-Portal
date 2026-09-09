const logger = require('../../utils/logger');
const User = require('../../models/auth/User');
const Session = require('../../models/auth/Session');

const toLogId = (value) => {
  if (!value) return null;
  if (typeof value.toHexString === 'function') return value.toHexString();
  return String(value);
};

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change the current user's password and revoke every other active
 *          session — a password change should sign the account out of any
 *          other browser/device, since it's often done because of a
 *          suspected compromise.
 * @access  Private (all authenticated users)
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      logger.warn({
        event: 'auth.password.change.failed',
        category: 'AUTH',
        requestId: req.id || req.headers['x-request-id'] || null,
        method: req.method,
        route: (req.originalUrl || req.path || '').split(/[?#]/)[0],
        userId: toLogId(req.user?.id),
        role: req.user?.role || null,
        reason: 'user_not_found',
      }, 'Password change failed');
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      logger.warn({
        event: 'auth.password.change.failed',
        category: 'AUTH',
        requestId: req.id || req.headers['x-request-id'] || null,
        method: req.method,
        route: (req.originalUrl || req.path || '').split(/[?#]/)[0],
        userId: toLogId(req.user?.id),
        role: req.user?.role || null,
        reason: 'incorrect_current_password',
      }, 'Password change failed');
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
        code: 'INCORRECT_PASSWORD'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Revoke every other active session for this user. The session that made
    // this request (identified by its jti) is left alone so the user isn't
    // logged out of the device they just used to change the password.
    const revokeFilter = { user: user._id, revokedAt: null };
    if (req.authTokenJti) {
      revokeFilter.jti = { $ne: req.authTokenJti };
    }
    const { modifiedCount } = await Session.updateMany(revokeFilter, { revokedAt: new Date() });
    logger.info({
      event: 'auth.password.changed',
      category: 'AUTH',
      requestId: req.id || req.headers['x-request-id'] || null,
      method: req.method,
      route: (req.originalUrl || req.path || '').split(/[?#]/)[0],
      userId: toLogId(user._id),
      role: req.user?.role || null,
      revokedSessionCount: modifiedCount,
    }, 'Password changed');

    res.status(200).json({
      success: true,
      message: modifiedCount
        ? 'Password changed successfully. You have been logged out of all other devices.'
        : 'Password changed successfully.'
    });
  } catch (error) {
    logger.error({
      event: 'auth.password.change.error',
      category: 'AUTH',
      err: error,
      requestId: req.id || req.headers['x-request-id'] || null,
      method: req.method,
      route: (req.originalUrl || req.path || '').split(/[?#]/)[0],
      userId: toLogId(req.user?.id),
      role: req.user?.role || null,
    }, 'Change password error');
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      code: 'CHANGE_PASSWORD_ERROR'
    });
  }
};
