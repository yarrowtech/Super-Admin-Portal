const normalize = (value) => (value ? value.toString().trim().toLowerCase() : '');

const ROUTING_DIRECTORY = [
  {
    key: 'it',
    aliases: ['information technology', 'tech', 'technology'],
    managerNames: ['sangeet', 'sangeet chowdhury'],
  },
];

const matchesRoute = (normalizedDepartment, entry) => {
  if (!normalizedDepartment || !entry) return false;
  if (entry.key === normalizedDepartment) return true;
  if (entry.aliases?.includes(normalizedDepartment)) return true;
  if (normalizedDepartment.includes(entry.key)) return true;
  return entry.aliases?.some((alias) => normalizedDepartment.includes(alias));
};

const findRouteByDepartment = (department) => {
  const normalizedDepartment = normalize(department);
  if (!normalizedDepartment) return null;

  return (
    ROUTING_DIRECTORY.find((entry) => matchesRoute(normalizedDepartment, entry)) ||
    null
  );
};

const uniqueArray = (items) => {
  if (!Array.isArray(items)) return [];
  return Array.from(
    new Set(
      items
        .map((item) => normalize(item))
        .filter(Boolean)
    )
  );
};

export const buildDepartmentTarget = (department, overrides = {}) => {
  const normalizedDepartment = normalize(department) || 'general';
  const route = findRouteByDepartment(department) || null;

  const departments = uniqueArray([
    normalizedDepartment,
    normalizedDepartment.replace(/\s+/g, ''),
    ...(overrides.departments || []),
    ...(route?.aliases || []),
    route?.key || '',
  ]);

  const managerNames = uniqueArray([
    ...(overrides.managerNames || []),
    ...(route?.managerNames || []),
  ]);

  const managerEmails = uniqueArray([
    ...(overrides.managerEmails || []),
    ...(route?.managerEmails || []),
  ]);

  const managerIds = uniqueArray([
    ...(overrides.managerIds || []),
    ...(route?.managerIds || []),
  ]);

  return {
    departments,
    managerNames,
    managerEmails,
    managerIds,
  };
};

export const managerMatchesTarget = (managerUser, target = {}) => {
  if (!managerUser) return true;
  if (!target) return true;

  const normalizedName = normalize(
    managerUser.name ||
      `${managerUser.firstName || ''} ${managerUser.lastName || ''}`.trim()
  );
  const normalizedDepartment = normalize(managerUser.department);
  const normalizedEmail = normalize(managerUser.email);
  const normalizedId = normalize(managerUser.id || managerUser._id);

  const hasRules =
    (target.departments && target.departments.length > 0) ||
    (target.managerNames && target.managerNames.length > 0) ||
    (target.managerEmails && target.managerEmails.length > 0) ||
    (target.managerIds && target.managerIds.length > 0);

  if (!hasRules) return true;

  const hasGeneralAudience =
    target.departments?.includes('general') ||
    target.departments?.includes('all');

  if (hasGeneralAudience) {
    return true;
  }

  const matchesDepartment =
    normalizedDepartment &&
    target.departments?.some(
      (dept) =>
        dept === normalizedDepartment ||
        dept === normalizedDepartment.replace(/\s+/g, '') ||
        normalizedDepartment.includes(dept) ||
        dept.includes(normalizedDepartment)
    );

  const matchesName =
    normalizedName &&
    target.managerNames?.some(
      (name) => normalizedName.includes(name) || name.includes(normalizedName)
    );

  const matchesEmail =
    normalizedEmail &&
    target.managerEmails?.some(
      (email) => email === normalizedEmail || normalizedEmail.includes(email)
    );

  const matchesId =
    normalizedId &&
    target.managerIds?.some(
      (id) => id === normalizedId || normalizedId.includes(id)
    );

  return Boolean(
    matchesDepartment || matchesName || matchesEmail || matchesId
  );
};

export const shouldDeliverToManager = (managerUser, payload = {}) => {
  if (!payload?.target) return true;
  return managerMatchesTarget(managerUser, payload.target);
};
