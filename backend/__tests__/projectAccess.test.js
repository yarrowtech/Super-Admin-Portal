const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildWorkspaceCatalog,
  getAccessibleProjects,
  isPrivilegedProjectLauncher,
} = require('../utils/projectAccess');

test('workspace catalog preserves the HOUSE OF MUSA hierarchy', () => {
  const catalog = buildWorkspaceCatalog();
  assert.equal(catalog.organization.name, 'HOUSE OF MUSA');
  assert.equal(catalog.brands.length, 7);
  assert.deepEqual(catalog.brands.find((brand) => brand.code === 'MATEBID').projects.map((project) => project.code), ['MATEBID']);
  const yarrowtech = catalog.brands.find((brand) => brand.code === 'YARROWTECH');
  assert.deepEqual(
    yarrowtech.projects.map((project) => project.code),
    ['EEC_B2B', 'EFNBMMS', 'ESPORTSM', 'ERMS', 'EHC', 'SMARTFARMING']
  );
});

test('admins and freelancers can access every workspace', () => {
  assert.equal(isPrivilegedProjectLauncher({ role: 'freelancer' }), true);
  assert.equal(isPrivilegedProjectLauncher({ role: 'admin' }), true);
  assert.equal(isPrivilegedProjectLauncher({ role: 'super_admin' }), true);
});

test('freelancer access remains open regardless of assignments', () => {
  const projects = getAccessibleProjects({
    role: 'freelancer',
    metadata: {
      projectAssignments: [
        { projectCode: 'EEC', status: 'active', permissions: ['edifyeight:teachers:read'] },
        { projectCode: 'EFNBMMS', status: 'revoked' },
      ],
    },
  });
  assert.equal(projects.find((project) => project.code === 'EEC').accessGranted, true);
  assert.equal(projects.find((project) => project.code === 'EFNBMMS').accessGranted, true);
  assert.equal(projects.find((project) => project.code === 'ESPORTSM').accessGranted, true);
});
