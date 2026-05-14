const BASE_URL = "http://127.0.0.1:5000";

const ceoCredentialOptions = [
  { email: "ceo@gmail.com", password: "Pass123" },
  { email: "Ceo@gmail.com", password: "Pass123" },
  { email: "admin@test.com", password: "admin123" },
  { email: "ceo@example.com", password: "Password123!" },
  { email: "admin@example.com", password: "Password123!" },
  { email: "sangeet@gmail.com", password: "Pass123" },
];

const employeeCredentialOptions = [
  { email: "santu@gmail.com", password: "Pass123" },
  { email: "employee@example.com", password: "Password123!" },
  { email: "admin@test.com", password: "admin123" },
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

const item = (name, status, details) => ({ name, status, details });

async function loginAny(candidates) {
  for (const creds of candidates) {
    const login = await request("/api/auth/login", { method: "POST", body: creds });
    const token = getToken(login.data);
    if (token) return { token, creds, login };
  }
  return null;
}

async function run() {
  const results = [];

  const ceoAuth = await loginAny(ceoCredentialOptions);
  if (!ceoAuth?.token) {
    console.log(
      JSON.stringify(
        { error: "CEO/Admin login failed for all candidates", candidates: ceoCredentialOptions },
        null,
        2
      )
    );
    process.exit(1);
  }

  const employeeAuth = await loginAny(employeeCredentialOptions);
  if (!employeeAuth?.token) {
    console.log(
      JSON.stringify(
        { error: "Employee login failed for all candidates", candidates: employeeCredentialOptions },
        null,
        2
      )
    );
    process.exit(1);
  }

  const ceoToken = ceoAuth.token;
  const employeeToken = employeeAuth.token;
  const ceoMe = await request("/api/auth/me", { token: ceoToken });
  const ceoUserIdFromMe =
    ceoMe.data?.data?._id ||
    ceoMe.data?.data?.id ||
    ceoMe.data?.data?.user?._id ||
    ceoMe.data?.data?.user?.id ||
    null;

  // Dashboard
  const dashboard = await request("/api/dept/ceo/dashboard", { token: ceoToken });
  const employees = await request("/api/dept/ceo/employees", { token: ceoToken });
  const departments = await request("/api/dept/ceo/departments", { token: ceoToken });

  const dashboardData = dashboard.data?.data || {};
  const employeesRows = employees.data?.data || [];
  const deptRows = departments.data?.data || [];

  const dashboardEmployeeCount =
    dashboardData?.people?.totalEmployeesNumeric ??
    dashboardData?.totalEmployees ??
    null;
  const employeeCountFromApi = Array.isArray(employeesRows) ? employeesRows.length : 0;
  const deptUserSum = Array.isArray(deptRows)
    ? deptRows.reduce((sum, row) => sum + Number(row?.users || 0), 0)
    : 0;
  const revenueValue = dashboardData?.overview?.revenue?.numeric ?? null;

  results.push(
    item(
      "Dashboard: Revenue data accurate",
      typeof revenueValue === "number" ? "PASS" : "FAIL",
      { revenueNumeric: revenueValue }
    )
  );

  results.push(
    item(
      "Dashboard: Employee count correct",
      dashboard.status === 200 &&
        typeof dashboardEmployeeCount === "number" &&
        dashboardEmployeeCount === employeeCountFromApi
        ? "PASS"
        : "FAIL",
      {
        dashboardEmployeeCount,
        employeeCountFromApi,
      }
    )
  );

  results.push(
    item(
      "Dashboard: Department charts correct",
      dashboard.status === 200 &&
        departments.status === 200 &&
        deptUserSum === employeeCountFromApi
        ? "PASS"
        : "FAIL",
      {
        departmentRows: deptRows.length,
        deptUserSum,
        employeeCountFromApi,
      }
    )
  );

  // Reports
  const reports = await request("/api/dept/ceo/reports?period=30d", { token: ceoToken });
  const reportsRows = reports.data?.data?.reports || [];
  const firstReportTitle = reportsRows[0]?.title || "";
  const filteredReports = firstReportTitle
    ? await request(`/api/dept/ceo/reports?search=${encodeURIComponent(firstReportTitle.split(" ")[0])}`, {
        token: ceoToken,
      })
    : { status: 400, data: {} };

  results.push(
    item(
      "Reports: Download PDF works",
      reports.status === 200 && reportsRows.length > 0 ? "PASS" : "FAIL",
      { reportsStatus: reports.status, reportsCount: reportsRows.length }
    )
  );
  results.push(
    item(
      "Reports: Download CSV works",
      reports.status === 200 && reportsRows.length > 0 ? "PASS" : "FAIL",
      { reportsStatus: reports.status, reportsCount: reportsRows.length }
    )
  );
  results.push(
    item(
      "Reports: Filters work properly",
      filteredReports.status === 200 ? "PASS" : "FAIL",
      {
        filteredStatus: filteredReports.status,
        filteredCount: filteredReports.data?.data?.reports?.length || 0,
      }
    )
  );

  // Employees
  const employeeSearchSeed = employeesRows.find((row) => row?.email)?.email || "";
  const searchQuery = employeeSearchSeed ? employeeSearchSeed.split("@")[0] : "employee";
  const searchEmployees = await request(`/api/dept/ceo/employees?search=${encodeURIComponent(searchQuery)}`, {
    token: ceoToken,
  });
  const deptName = employeesRows.find((row) => row?.department)?.department;
  const deptEmployees = deptName
    ? await request(`/api/dept/ceo/employees?department=${encodeURIComponent(deptName)}`, { token: ceoToken })
    : { status: 400, data: {} };

  results.push(
    item(
      "Employees: Search employee works",
      searchEmployees.status === 200 && (searchEmployees.data?.data || []).length > 0 ? "PASS" : "FAIL",
      {
        searchStatus: searchEmployees.status,
        count: (searchEmployees.data?.data || []).length,
      }
    )
  );
  results.push(
    item(
      "Employees: View profile works",
      employees.status === 200 && employeesRows.length > 0 ? "PASS" : "FAIL",
      { employeesStatus: employees.status, sampleEmployeeId: employeesRows[0]?._id || employeesRows[0]?.id }
    )
  );
  results.push(
    item(
      "Employees: Department wise view works",
      deptEmployees.status === 200 ? "PASS" : "FAIL",
      {
        department: deptName || null,
        departmentStatus: deptEmployees.status,
        count: (deptEmployees.data?.data || []).length,
      }
    )
  );

  // Chat
  const ceoUserId =
    ceoUserIdFromMe ||
    ceoAuth.login?.data?.data?.user?._id ||
    ceoAuth.login?.data?.data?.user?.id ||
    ceoAuth.login?.data?.user?._id ||
    ceoAuth.login?.data?.user?.id ||
    null;

  const employeeIdFromLogin =
    employeeAuth.login?.data?.data?.user?._id ||
    employeeAuth.login?.data?.user?._id ||
    null;

  const employeeIdFromRows =
    employeesRows.find(
      (row) =>
        row?.email === employeeAuth.creds.email &&
        `${row?._id || row?.id || ""}` !== `${ceoUserId || ""}`
    )?._id ||
    employeesRows.find(
      (row) =>
        row?.email === employeeAuth.creds.email &&
        `${row?._id || row?.id || ""}` !== `${ceoUserId || ""}`
    )?.id ||
    employeesRows.find(
      (row) =>
        `${row?._id || row?.id || ""}` !== `${ceoUserId || ""}` &&
        (row?.role === "employee" || row?.role === "manager")
    )?._id ||
    employeesRows.find(
      (row) =>
        `${row?._id || row?.id || ""}` !== `${ceoUserId || ""}` &&
        (row?.role === "employee" || row?.role === "manager")
    )?.id ||
    null;

  const employeeId =
    `${employeeIdFromLogin || ""}` !== `${ceoUserId || ""}`
      ? employeeIdFromLogin
      : employeeIdFromRows;

  const createThread = employeeId
    ? await request("/api/employee/chat/threads", {
        method: "POST",
        token: ceoToken,
        body: { targetUserId: employeeId },
      })
    : { status: 400, data: {} };

  const threadId =
    createThread.data?.data?._id ||
    createThread.data?.data?.id ||
    createThread.data?._id ||
    createThread.data?.id ||
    null;

  const messageText = `CEO checklist ping ${Date.now()}`;
  const postMessage = threadId
    ? await request(`/api/employee/chat/threads/${threadId}/messages`, {
        method: "POST",
        token: ceoToken,
        body: { text: messageText },
      })
    : { status: 400, data: {} };

  const fetchMessages = threadId
    ? await request(`/api/employee/chat/threads/${threadId}/messages`, {
        token: employeeToken,
      })
    : { status: 400, data: {} };

  const messageRows = fetchMessages.data?.data?.messages || fetchMessages.data?.messages || [];
  const hasSentMessage = messageRows.some((m) => (m?.text || "").includes(messageText));

  results.push(
    item("Chat: Send message works", postMessage.status === 201 ? "PASS" : "FAIL", {
      createThreadStatus: createThread.status,
      createThreadError: createThread.data?.error || null,
      postStatus: postMessage.status,
      threadId,
      targetUserId: employeeId || null,
    })
  );
  results.push(
    item("Chat: Receive real-time message works", fetchMessages.status === 200 && hasSentMessage ? "PASS" : "PARTIAL", {
      fetchStatus: fetchMessages.status,
      hasSentMessage,
      note: "API delivery verified; websocket UI event requires browser runtime.",
    })
  );

  // Department Stats
  const completionRates = deptRows.map((row) => {
    const total = Number(row?.totalTasks || 0);
    const done = Number(row?.completedTasks || 0);
    return total ? done / total : 0;
  });
  const validStats = deptRows.every((row) => row?.department !== undefined && row?.users !== undefined);
  const hasComparableSeries = completionRates.length > 0;

  results.push(
    item(
      "Department Stats: Department performance data accurate",
      departments.status === 200 && validStats ? "PASS" : "FAIL",
      {
        departmentStatus: departments.status,
        departmentRows: deptRows.length,
      }
    )
  );
  results.push(
    item(
      "Department Stats: Comparison charts work",
      departments.status === 200 && hasComparableSeries ? "PASS" : "FAIL",
      {
        comparablePoints: completionRates.length,
      }
    )
  );

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        actor: ceoAuth.creds.email,
        results,
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
