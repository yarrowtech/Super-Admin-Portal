const { spawn } = require("child_process");

const child = spawn("node", ["test_finance_department_checklist.js"], {
  cwd: __dirname,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 1));

