export const normalizeProjectNameKey = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

export const CANONICAL_PROJECTS = Object.freeze([
  {
    code: 'EEC',
    name: 'EdifyEight',
    description: 'EdifyEight project workspace.',
    launchUrl: 'https://www.edifyeight.com',
    ssoPath: '/sso/eec',
    aliases: ['EEC', 'EEC LMS', 'EEC Portal', 'ECC', 'EDIFIEIGHT'],
  },
  {
    code: 'EHC',
    name: 'EHC',
    description: 'Employee services and operations workspace.',
    aliases: ['EHC Portal'],
  },
  {
    code: 'BETTERPASS',
    name: 'Better Pass',
    description: 'Better Pass project workspace.',
    aliases: ['BETTER PASS', 'BetterPass', 'Better Pass Portal'],
  },
]);

export const CANONICAL_PROJECT_NAMES = Object.freeze(CANONICAL_PROJECTS.map((project) => project.name));

export const PROJECT_NAME_PLACEHOLDER = CANONICAL_PROJECT_NAMES.join(' / ');

export const findCanonicalProject = (project = {}) => {
  const tokens = [
    project.code,
    project.projectCode,
    project.name,
    ...(Array.isArray(project.aliases) ? project.aliases : []),
  ]
    .map(normalizeProjectNameKey)
    .filter(Boolean);

  if (tokens.length === 0) return null;

  return CANONICAL_PROJECTS.find((canonical) => {
    const canonicalTokens = [
      canonical.code,
      canonical.name,
      ...(Array.isArray(canonical.aliases) ? canonical.aliases : []),
    ]
      .map(normalizeProjectNameKey)
      .filter(Boolean);

    return tokens.some((token) =>
      canonicalTokens.some((canonicalToken) => (
        token === canonicalToken ||
        token.includes(canonicalToken) ||
        canonicalToken.includes(token)
      ))
    );
  }) || null;
};

export const isCanonicalProject = (project = {}) => Boolean(findCanonicalProject(project));

export const resolveCanonicalProjects = (projects = []) => {
  const entries = Array.isArray(projects) ? projects : [];
  const byKey = new Map();

  entries.forEach((project) => {
    if (!project || typeof project !== 'object') return;
    const keys = [
      project.code,
      project.name,
      ...(Array.isArray(project.aliases) ? project.aliases : []),
    ]
      .map(normalizeProjectNameKey)
      .filter(Boolean);

    keys.forEach((key) => {
      if (!byKey.has(key)) byKey.set(key, project);
    });
  });

  return CANONICAL_PROJECTS.map((canonical) => {
    const match = [
      canonical.code,
      canonical.name,
      ...(Array.isArray(canonical.aliases) ? canonical.aliases : []),
    ]
      .map(normalizeProjectNameKey)
      .map((key) => byKey.get(key))
      .find(Boolean) || null;

    const accessGranted = Boolean(match?.access?.canLaunch || match?.accessGranted);

    return {
      code: canonical.code,
      name: canonical.name,
      description: canonical.description,
      aliases: canonical.aliases,
      launchUrl: match?.launchUrl || '',
      ssoPath: match?.ssoPath || '/sso-login',
      assigned: Boolean(match?.assigned),
      accessGranted,
      access: {
        canLaunch: accessGranted,
        blockedReason: accessGranted ? null : 'Project not assigned or access has expired',
      },
      role: match?.role || 'member',
      status: match?.status || (accessGranted ? 'active' : 'blocked'),
      startDate: match?.startDate || null,
      endDate: match?.endDate || null,
      permissions: Array.isArray(match?.permissions) ? match.permissions : [],
      projectAssignment: match?.projectAssignment || null,
    };
  });
};
