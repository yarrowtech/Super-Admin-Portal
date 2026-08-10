const canManageMedia = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (['media_head', 'media_marketing', 'admin', 'super_admin'].includes(role)) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Role cannot manage media records' });
};

const canDecideApproval = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (['media_head', 'ceo', 'admin', 'super_admin'].includes(role)) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Role cannot decide media approvals' });
};

module.exports = { canManageMedia, canDecideApproval };
