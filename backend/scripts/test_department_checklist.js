const { spawnSync } = require("child_process");

const scripts = [
  "test_finance_department_checklist.js",
  "test_hr_checklist.js",
  "test_manager_checklist.js",
];

const results = scripts.map((script) => {
  const run = spawnSync("node", [script], { cwd: __dirname, encoding: "utf-8" });
  return {
    script,
    exitCode: run.status,
    stderr: (run.stderr || "").trim().slice(0, 800),
  };
});

const failed = results.filter((r) => r.exitCode !== 0).length;
console.log(
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      summary: { total: results.length, passed: results.length - failed, failed },
      results,
    },
    null,
    2
  )
);
process.exit(failed > 0 ? 2 : 0);

