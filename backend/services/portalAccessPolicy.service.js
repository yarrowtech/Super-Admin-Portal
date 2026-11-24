const defaults = require('../config/portalAccessPolicy.json');
const PortalAccess = require('../models/superAdmin/PortalAccess');

const portals = [...new Set(Object.values(defaults).flat())];
const defaultPortalAccess = (user, portal) => {
  if (!portals.includes(portal)) return false;
  if ((defaults[user?.role] || []).includes(portal)) return true;
  if (portal !== 'outsourcing') return false;
  const normalize = value => String(value || '').trim().toLowerCase().replace(/[\s&-]+/g, '_');
  return ['outsourcing', 'outsource', 'external_workforce'].includes(normalize(user?.department)) ||
    ['third_party_worker', '3rd_party_worker', 'thirdpartyworker', 'freelancer', 'freelaner'].includes(normalize(user?.metadata?.outsourcingType));
};

const resolvePortalAccess = async user => {
  const rules = await PortalAccess.find({ role: user.role }).select('portal canAccess').lean();
  return Object.fromEntries(portals.map(portal => {
    const rule = rules.find(item => item.portal === portal);
    return [portal, rule ? rule.canAccess === true : defaultPortalAccess(user, portal)];
  }));
};

const getMyPortalAccess = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, data: { portalAccess: await resolvePortalAccess(req.user) } });
  } catch {
    return res.status(503).json({ success: false, error: 'Portal access rules are unavailable' });
  }
};

module.exports = { defaultPortalAccess, resolvePortalAccess, getMyPortalAccess };
