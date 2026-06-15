const FeatureFlag = require('../models/superAdmin/FeatureFlag');
const PortalAccess = require('../models/superAdmin/PortalAccess');
const SystemHealth = require('../models/superAdmin/SystemHealth');
const CompanyControl = require('../models/superAdmin/CompanyControl');

const ensureSuperAdminDefaults = async () => {
  const [flagCount, accessCount, controlCount, healthCount] = await Promise.all([
    FeatureFlag.countDocuments(),
    PortalAccess.countDocuments(),
    CompanyControl.countDocuments(),
    SystemHealth.countDocuments()
  ]);

  if (flagCount === 0) {
    await FeatureFlag.insertMany([
      { key: 'outsourcing_portal', description: 'Enable outsourcing portal module', enabled: true, rollout: 100 },
      { key: 'chat_realtime', description: 'Enable realtime chat', enabled: true, rollout: 100 },
      { key: 'advanced_reports', description: 'Enable advanced reports', enabled: false, rollout: 0 }
    ]);
  }

  const requiredAccessRules = [
    { role: 'admin', portal: 'admin', canAccess: true },
    { role: 'admin', portal: 'super-admin', canAccess: true },
    { role: 'admin', portal: 'ceo', canAccess: true },
    { role: 'admin', portal: 'hr', canAccess: true },
    { role: 'admin', portal: 'it', canAccess: true },
    { role: 'admin', portal: 'law', canAccess: true },
    { role: 'admin', portal: 'media', canAccess: true },
    { role: 'admin', portal: 'finance', canAccess: true },
    { role: 'manager', portal: 'manager', canAccess: true },
    { role: 'manager', portal: 'admin', canAccess: true },
    { role: 'manager', portal: 'hr', canAccess: true },
    { role: 'manager', portal: 'it', canAccess: true },
    { role: 'manager', portal: 'law', canAccess: true },
    { role: 'manager', portal: 'employee', canAccess: true },
    { role: 'it', portal: 'admin', canAccess: true },
    { role: 'it', portal: 'hr', canAccess: true },
    { role: 'it', portal: 'law', canAccess: true },
    { role: 'it', portal: 'employee', canAccess: true },
    { role: 'it', portal: 'manager', canAccess: true },
    { role: 'ceo', portal: 'ceo', canAccess: true },
    { role: 'hr', portal: 'hr', canAccess: true },
    { role: 'it', portal: 'it', canAccess: true },
    { role: 'law', portal: 'law', canAccess: true },
    { role: 'media', portal: 'media', canAccess: true },
    { role: 'marketing_head', portal: 'media', canAccess: true },
    { role: 'media_manager', portal: 'media', canAccess: true },
    { role: 'content_writer', portal: 'media', canAccess: true },
    { role: 'graphic_designer', portal: 'media', canAccess: true },
    { role: 'video_editor', portal: 'media', canAccess: true },
    { role: 'seo_specialist', portal: 'media', canAccess: true },
    { role: 'social_media_manager', portal: 'media', canAccess: true },
    { role: 'project_manager', portal: 'media', canAccess: true },
    { role: 'department_head', portal: 'media', canAccess: true },
    { role: 'client_viewer', portal: 'media', canAccess: true },
    { role: 'finance', portal: 'finance', canAccess: true },
    { role: 'employee', portal: 'employee', canAccess: true },
    { role: 'employee', portal: 'outsourcing', canAccess: false }
  ];

  if (accessCount === 0) {
    await PortalAccess.insertMany(requiredAccessRules);
  } else {
    await Promise.all(
      requiredAccessRules.map((rule) =>
        PortalAccess.updateOne(
          { role: rule.role, portal: rule.portal },
          { $setOnInsert: rule },
          { upsert: true }
        )
      )
    );
  }

  if (controlCount === 0) {
    await CompanyControl.insertMany([
      { key: 'company.name', value: 'Super Admin Portal', note: 'Displayed in headers and docs' },
      { key: 'branding.logoUrl', value: '/citimart-logo.jpg', note: 'Main application logo' },
      { key: 'security.sessionTimeoutMinutes', value: 30, note: 'Global session timeout' }
    ]);
  }

  if (healthCount === 0) {
    await SystemHealth.insertMany([
      { service: 'api', status: 'healthy', details: { p95Ms: 120 } },
      { service: 'database', status: 'healthy', details: { connections: 8 } },
      { service: 'socket', status: 'healthy', details: { activeRooms: 4 } }
    ]);
  }
};

module.exports = {
  ensureSuperAdminDefaults
};
