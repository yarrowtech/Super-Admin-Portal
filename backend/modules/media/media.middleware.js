const canManageMedia = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (['media', 'marketing_head', 'media_manager', 'content_writer', 'graphic_designer', 'video_editor', 'seo_specialist', 'social_media_manager', 'ads_manager', 'project_manager', 'department_head', 'manager', 'admin', 'super_admin'].includes(role)) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Role cannot manage media records' });
};

const canDecideApproval = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (['media', 'marketing_head', 'media_manager', 'project_manager', 'department_head', 'client_viewer', 'ceo', 'admin', 'super_admin'].includes(role)) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Role cannot decide media approvals' });
};

module.exports = { canManageMedia, canDecideApproval };
