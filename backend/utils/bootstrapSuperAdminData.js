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
    { role: 'admin', portal: 'outsourcing', canAccess: true },
    { role: 'ceo', portal: 'ceo', canAccess: true },
    { role: 'hr', portal: 'hr', canAccess: true },
    { role: 'hr', portal: 'admin', canAccess: true },
    // IT department
    { role: 'it_manager', portal: 'it', canAccess: true },
    { role: 'it_manager', portal: 'admin', canAccess: true },
    { role: 'it_manager', portal: 'hr', canAccess: true },
    { role: 'it_manager', portal: 'law', canAccess: true },
    { role: 'it_admin', portal: 'it', canAccess: true },
    { role: 'it_employee', portal: 'it', canAccess: true },
    { role: 'it_hr', portal: 'it', canAccess: true },
    // Finance department
    { role: 'finance_manager', portal: 'finance', canAccess: true },
    { role: 'finance_employee', portal: 'finance', canAccess: true },
    // Law department
    { role: 'law_head', portal: 'law', canAccess: true },
    { role: 'law_employee', portal: 'law', canAccess: true },
    // Media department
    { role: 'media_head', portal: 'media', canAccess: true },
    { role: 'media_sales', portal: 'media', canAccess: true },
    { role: 'media_marketing', portal: 'media', canAccess: true },
    // Outsourcing
    { role: 'freelancer', portal: 'outsourcing', canAccess: true },
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
