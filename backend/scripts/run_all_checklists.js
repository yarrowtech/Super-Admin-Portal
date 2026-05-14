const { spawn } = require("child_process");
const path = require("path");

const backendRoot = path.resolve(__dirname, "..");
const scripts = [
  "test_admin_checklist.js",
  "test_manager_checklist.js",
  "test_hr_checklist.js",
  "test_ceo_checklist.js",
  "test_employee_checklist.js",
  "test_finance_department_checklist.js",
];

const runNode = (args, cwd = backendRoot) =>
  new Promise((resolve) => {
    const child = spawn("node", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const waitForHealth = async (timeoutMs = 45000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch("http://127.0.0.1:5000/health");
      if (res.ok) return true;
    } catch (err) {}
    await wait(600);
  }
  return false;
};

async function main() {
  const server = spawn("node", ["server.js"], { cwd: backendRoot, stdio: ["ignore", "pipe", "pipe"] });
  let serverLogs = "";
  server.stdout.on("data", (d) => (serverLogs += d.toString()));
  server.stderr.on("data", (d) => (serverLogs += d.toString()));
  const ready = await waitForHealth();

  const results = [];
  if (!ready) {
    results.push({
      script: "server-startup",
      exitCode: 1,
      stdoutTail: "",
      stderrTail: serverLogs.trim().slice(-1200) || "Server did not become healthy within timeout",
    });
  } else {
    for (const script of scripts) {
      const res = await runNode([path.join("scripts", script)], backendRoot);
      results.push({
        script,
        exitCode: res.code,
        stdoutTail: res.stdout.trim().slice(-1200),
        stderrTail: res.stderr.trim().slice(-600),
      });
    }
  }

  if (server.exitCode === null) {
    server.kill("SIGINT");
    await new Promise((r) => setTimeout(r, 800));
    if (server.exitCode === null) server.kill("SIGKILL");
  }

  const failed = results.filter((r) => r.exitCode !== 0);
  console.log(
    JSON.stringify(
      {
        runAt: new Date().toISOString(),
        summary: {
          total: results.length,
          passed: results.length - failed.length,
          failed: failed.length,
        },
        results,
      },
      null,
      2
    )
  );

  process.exit(failed.length ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
