const { spawn } = require("child_process");
const path = require("path");

const BASE_URL = "http://127.0.0.1:5000";
const START_TIMEOUT_MS = 30000;

const endpointChecks = [
  { method: "GET", path: "/health" },
  { method: "GET", path: "/api/auth/me" },
  { method: "GET", path: "/api/dept/admin/dashboard" },
  { method: "GET", path: "/api/super-admin/overview" },
  { method: "GET", path: "/api/super-admin/health" },
  { method: "GET", path: "/api/dept/super-admin/dashboard" },
  { method: "GET", path: "/api/dept/ceo/dashboard" },
  { method: "GET", path: "/api/dept/it/dashboard" },
  { method: "GET", path: "/api/dept/hr/dashboard" },
  { method: "GET", path: "/api/dept/finance/dashboard" },
  { method: "GET", path: "/api/dept/law/dashboard" },
  { method: "GET", path: "/api/dept/media/dashboard" },
  { method: "GET", path: "/api/dept/manager/dashboard" },
  { method: "GET", path: "/api/dept/employee/dashboard" },
  { method: "GET", path: "/api/employee/dashboard" },
  { method: "GET", path: "/api/dept/it/dashboard" },
  { method: "GET", path: "/api/notifications" },
  { method: "GET", path: "/api/chat/threads" },
  { method: "GET", path: "/api/reports" },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (url, options = {}, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    return { ok: true, status: response.status, body: text };
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    clearTimeout(timer);
  }
};

async function run() {
  const logs = [];
  const backendRoot = path.resolve(__dirname, "..");
  const serverProcess = spawn("node", ["server.js"], {
    cwd: backendRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  serverProcess.stderr.on("data", (chunk) => logs.push(chunk.toString()));

  let started = false;
  const startedAt = Date.now();

  while (Date.now() - startedAt < START_TIMEOUT_MS) {
    const ping = await fetchWithTimeout(`${BASE_URL}/health`, { method: "GET" }, 3000);
    if (ping.ok) {
      started = true;
      break;
    }
    if (serverProcess.exitCode !== null) break;
    await wait(500);
  }

  const combinedLogs = logs.join("");
  let dbConnected = false;
  const health = await fetchWithTimeout(`${BASE_URL}/health`, { method: "GET" }, 5000);
  if (health.ok) {
    try {
      const parsed = JSON.parse(health.body || "{}");
      dbConnected = parsed?.data?.database?.state === "connected";
    } catch (err) {
      dbConnected = false;
    }
  }
  const serverStarted = started;

  const results = [];
  if (started) {
    for (const check of endpointChecks) {
      const result = await fetchWithTimeout(`${BASE_URL}${check.path}`, { method: check.method });
      results.push({
        method: check.method,
        path: check.path,
        reachable: result.ok,
        status: result.ok ? result.status : null,
        error: result.ok ? null : result.error,
      });
    }
  }

  if (serverProcess.exitCode === null) {
    serverProcess.kill("SIGINT");
    await wait(1200);
    if (serverProcess.exitCode === null) {
      serverProcess.kill("SIGKILL");
    }
  }

  const failed = results.filter((item) => !item.reachable);

  console.log(JSON.stringify({
    serverStarted,
    dbConnected,
    endpointsTested: results.length,
    endpointsUnreachable: failed.length,
    results,
    startupLogSnippet: combinedLogs.split(/\r?\n/).slice(-30),
  }, null, 2));

  if (!serverStarted || !dbConnected || failed.length > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
