const { spawnSync } = require("child_process");

const scripts = [
  "test_admin_checklist.js",
  "test_manager_checklist.js",
  "test_hr_checklist.js",
  "test_ceo_checklist.js",
  "test_employee_checklist.js",
];

const runScript = (script) => {
  const result = spawnSync("node", [script], {
    cwd: __dirname,
    encoding: "utf-8",
  });

  let parsed = null;
  try {
    parsed = JSON.parse((result.stdout || "").trim());
  } catch (err) {
    parsed = null;
  }

  return {
    script,
    exitCode: result.status,
    summary: parsed?.summary || null,
    stdout: parsed ? undefined : (result.stdout || "").trim().slice(0, 1000),
    stderr: (result.stderr || "").trim().slice(0, 1000),
  };
};

const reports = scripts.map(runScript);
const failed = reports.filter((r) => r.exitCode !== 0).length;

const output = {
  generatedAt: new Date().toISOString(),
  summary: {
    total: reports.length,
    passed: reports.length - failed,
    failed,
  },
  reports,
};

console.log(JSON.stringify(output, null, 2));
process.exit(failed > 0 ? 2 : 0);

