const { ROLES } = require('../config/roles');

// Which portals a freelancer works with. Stored on the user as metadata.associatedPortals (string[]).
// A department head can only assign tasks to freelancers associated with THAT portal.
const PORTAL_KEYS = ['it', 'finance', 'law', 'media', 'hr'];

const PORTAL_LABELS = { it: 'IT', finance: 'Finance', law: 'Law', media: 'Media', hr: 'HR', outsourcing: 'Outsourcing' };

// Department names (User.department) that map onto a portal key; used only for freelancers that
// pre-date the association field.
const DEPARTMENT_ALIASES = {
  it: ['it', 'information technology'],
  finance: ['finance'],
  law: ['law', 'legal'],
  media: ['media'],
  hr: ['hr', 'human resources'],
};
// Freelancers created before this field existed were IT-only; keep them assignable by IT.
const LEGACY_DEFAULT_PORTAL = 'it';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const aliasRegex = (aliases) => new RegExp(`^\\s*(${aliases.map(escapeRegex).join('|')})\\s*$`, 'i');

const normalizePortalKey = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  return PORTAL_KEYS.includes(raw) ? raw : '';
};

// Validates an admin-supplied list. Returns { portals } or { error }.
const parseAssociatedPortals = (input) => {
  if (input === undefined || input === null) return { portals: undefined };
  if (!Array.isArray(input)) return { error: 'associatedPortals must be an array' };
  const portals = [];
  for (const item of input) {
    const key = normalizePortalKey(item);
    if (!key) return { error: `Invalid portal "${String(item).slice(0, 40)}". Allowed: ${PORTAL_KEYS.join(', ')}` };
    if (!portals.includes(key)) portals.push(key);
  }
  return { portals };
};

const isLegacy = (user) => !Array.isArray(user?.metadata?.associatedPortals);

// Effective association for a user document/object.
const getAssociatedPortals = (user) => {
  if (!isLegacy(user)) return user.metadata.associatedPortals.filter((p) => PORTAL_KEYS.includes(p));
  const dept = String(user?.department || '').trim();
  const match = PORTAL_KEYS.find((key) => aliasRegex(DEPARTMENT_ALIASES[key]).test(dept));
  return [match || LEGACY_DEFAULT_PORTAL];
};

// Mongo filter matching the active freelancers associated with `portal` (explicit list, or the
// derived default for legacy freelancers without one).
const freelancersForPortalFilter = (portal) => {
  const key = normalizePortalKey(portal);
  if (!key) return { _id: { $exists: false } };
  const noList = { 'metadata.associatedPortals': { $exists: false } };
  const or = [
    { 'metadata.associatedPortals': key },
    { ...noList, department: aliasRegex(DEPARTMENT_ALIASES[key]) },
  ];
  if (key === LEGACY_DEFAULT_PORTAL) {
    const all = PORTAL_KEYS.flatMap((k) => DEPARTMENT_ALIASES[k]);
    or.push({ ...noList, department: { $not: aliasRegex(all) } });
  }
  return { role: ROLES.FREELANCER, isActive: { $ne: false }, $or: or };
};

module.exports = {
  PORTAL_KEYS,
  PORTAL_LABELS,
  normalizePortalKey,
  parseAssociatedPortals,
  getAssociatedPortals,
  freelancersForPortalFilter,
};
