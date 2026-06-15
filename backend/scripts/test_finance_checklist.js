const BASE_URL = "http://127.0.0.1:5000";

const credentials = [
  { email: "admin@test.com", password: "admin@test.com" },
  { email: "raphael@test.com", password: "raphael@test.com" },
];

const request = async (path, { method = "GET", token, body } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data };
};

const getToken = (payload) =>
  payload?.token ||
  payload?.accessToken ||
  payload?.data?.token ||
  payload?.data?.accessToken ||
  null;

async function run() {
  let token = null;
  for (const creds of credentials) {
    const login = await request("/api/auth/login", { method: "POST", body: creds });
    token = getToken(login.data);
    if (token) break;
  }
  if (!token) {
    console.log(JSON.stringify({ error: "Finance checklist login failed" }, null, 2));
    process.exit(1);
  }

  const checks = [];
  const push = (name, status, details) => checks.push({ name, status, details });

  const dashboard = await request("/api/dept/finance/dashboard", { token });
  push("Finance dashboard reachable", dashboard.status === 200 ? "PASS" : "FAIL", { status: dashboard.status });

  const tx = await request("/api/dept/finance/module/transactions?page=1&limit=5", { token });
  push("Finance module transactions reachable", tx.status === 200 ? "PASS" : "FAIL", { status: tx.status });

  const overview = await request("/api/dept/finance/module/overview", { token });
  push("Finance module overview reachable", overview.status === 200 ? "PASS" : "FAIL", { status: overview.status });

  const fail = checks.filter((c) => c.status === "FAIL").length;
  console.log(JSON.stringify({ summary: { total: checks.length, failed: fail }, checks }, null, 2));
  process.exit(fail ? 2 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

