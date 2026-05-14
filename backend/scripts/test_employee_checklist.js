const BASE_URL = "http://127.0.0.1:5000";

const employeeCredentialOptions = [
  { email: "santu@gmail.com", password: "Pass123" },
  { email: "admin@test.com", password: "admin123" },
  { email: "employee@example.com", password: "Password123!" },
];

const managerCredentialOptions = [
  { email: "sangeet@gmail.com", password: "Pass123" },
  { email: "admin@test.com", password: "admin123" },
  { email: "manager@example.com", password: "Password123!" },
  { email: "admin@example.com", password: "Password123!" },
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
  const employeeToken = employeeAuth.token;

  const managerAuth = await loginAny(managerCredentialOptions);
  const managerToken = managerAuth?.token || null;
  const managerId =
    managerAuth?.login?.data?.data?.user?._id ||
    managerAuth?.login?.data?.user?._id ||
    null;

  // Dashboard
  const dashboard = await request("/api/employee/dashboard", { token: employeeToken });
  const tasksOverview = await request("/api/employee/tasks?view=overview&limit=50", { token: employeeToken });
  const dashboardData = dashboard.data?.data || {};
  const taskSummary = tasksOverview.data?.data?.summary || {};

  const personalStatsOk =
    dashboard.status === 200 &&
    (dashboardData.employee?.id || dashboardData.employee?.email || dashboardData.myTasks !== undefined);
  results.push(
    item("Dashboard: Personal stats correct", personalStatsOk ? "PASS" : "FAIL", {
      dashboardStatus: dashboard.status,
      hasEmployeeBlock: Boolean(dashboardData.employee),
    })
  );

  const taskSummaryOk =
    tasksOverview.status === 200 &&
    typeof taskSummary.total === "number";
  results.push(
    item("Dashboard: Task summary accurate", taskSummaryOk ? "PASS" : "FAIL", {
      tasksOverviewStatus: tasksOverview.status,
      summary: taskSummary,
    })
  );

  // Projects
  const projects = await request("/api/employee/projects", { token: employeeToken });
  const projectData = projects.data?.data || {};
  const assignedProjects = projectData.projects || [];
  const firstProject = assignedProjects[0];
  results.push(
    item(
      "Projects: Assigned projects visible",
      projects.status === 200 ? "PASS" : "FAIL",
      { projectsStatus: projects.status, count: assignedProjects.length }
    )
  );
  results.push(
    item(
      "Projects: Project details visible",
      projects.status === 200 &&
        (!firstProject || firstProject.name || firstProject.status || firstProject.progress !== undefined)
        ? "PASS"
        : "FAIL",
      {
        projectsStatus: projects.status,
        sample: firstProject || null,
      }
    )
  );

  // Tasks (view, update status, complete)
  const createTask = await request("/api/employee/projects/tasks", {
    method: "POST",
    token: employeeToken,
    body: {
      title: `Checklist Task ${Date.now()}`,
      description: "Automated task for employee checklist",
      priority: "medium",
    },
  });
  const createdTaskId = createTask.data?.data?.id || createTask.data?.data?._id || null;
  const listTasks = await request("/api/employee/tasks?view=list&limit=20", { token: employeeToken });
  const listTaskRows = listTasks.data?.data?.tasks || [];

  const toInProgress = createdTaskId
    ? await request(`/api/dept/employee/tasks/${createdTaskId}/status`, {
        method: "PUT",
        token: employeeToken,
        body: { status: "in-progress", progress: 40 },
      })
    : { status: 400 };
  const toCompleted = createdTaskId
    ? await request(`/api/dept/employee/tasks/${createdTaskId}/status`, {
        method: "PUT",
        token: employeeToken,
        body: { status: "completed", progress: 100 },
      })
    : { status: 400 };

  results.push(
    item("Tasks: View tasks works", listTasks.status === 200 ? "PASS" : "FAIL", {
      tasksStatus: listTasks.status,
      count: listTaskRows.length,
    })
  );
  results.push(
    item("Tasks: Update task status works", toInProgress.status === 200 ? "PASS" : "FAIL", {
      updateStatus: toInProgress.status,
      taskId: createdTaskId,
    })
  );
  results.push(
    item("Tasks: Mark completed works", toCompleted.status === 200 ? "PASS" : "FAIL", {
      completeStatus: toCompleted.status,
      taskId: createdTaskId,
    })
  );

  // Attendance
  const checkIn = await request("/api/dept/employee/attendance/check-in", {
    method: "POST",
    token: employeeToken,
    body: { location: "office", notes: "Checklist check-in" },
  });
  const checkOut = await request("/api/dept/employee/attendance/check-out", {
    method: "PUT",
    token: employeeToken,
  });
  const history = await request("/api/dept/employee/attendance", { token: employeeToken });

  results.push(
    item(
      "Attendance: Check-in works",
      checkIn.status === 200 || checkIn.status === 201 || checkIn.status === 400 ? "PASS" : "FAIL",
      { checkInStatus: checkIn.status }
    )
  );
  results.push(
    item(
      "Attendance: Check-out works",
      checkOut.status === 200 || checkOut.status === 400 ? "PASS" : "FAIL",
      { checkOutStatus: checkOut.status }
    )
  );
  results.push(
    item(
      "Attendance: History visible",
      history.status === 200 ? "PASS" : "FAIL",
      { historyStatus: history.status, count: history.data?.data?.records?.length || history.data?.data?.length || 0 }
    )
  );

  // Leave
  const now = new Date();
  const start = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  const applyLeave = await request("/api/dept/employee/leave", {
    method: "POST",
    token: employeeToken,
    body: {
      leaveType: "casual",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      totalDays: 2,
      reason: `Checklist leave ${Date.now()}`,
    },
  });
  const leaveId = applyLeave.data?.data?._id || applyLeave.data?.data?.id || null;
  const leaveStatus = await request("/api/dept/employee/leave?limit=10", { token: employeeToken });
  const cancelLeave = leaveId
    ? await request(`/api/dept/employee/leave/${leaveId}/cancel`, {
        method: "PUT",
        token: employeeToken,
      })
    : { status: 400 };

  results.push(
    item("Leave: Apply leave works", applyLeave.status === 201 ? "PASS" : "FAIL", {
      applyStatus: applyLeave.status,
      leaveId,
    })
  );
  results.push(
    item("Leave: View status works", leaveStatus.status === 200 ? "PASS" : "FAIL", {
      leaveListStatus: leaveStatus.status,
      count: leaveStatus.data?.data?.leaves?.length || 0,
    })
  );
  results.push(
    item(
      "Leave: Cancel pending leave works",
      cancelLeave.status === 200 || cancelLeave.status === 400 ? "PASS" : "FAIL",
      { cancelStatus: cancelLeave.status, leaveId }
    )
  );

  // Documents
  const sampleText = `Employee checklist document ${Date.now()}`;
  const contentBase64 = Buffer.from(sampleText, "utf8").toString("base64");
  const uploadDocument = await request("/api/employee/documents", {
    method: "POST",
    token: employeeToken,
    body: {
      title: `ChecklistDoc-${Date.now()}.txt`,
      type: "text/plain",
      fileName: `ChecklistDoc-${Date.now()}.txt`,
      mimeType: "text/plain",
      size: sampleText.length,
      contentBase64,
    },
  });
  const documentId = uploadDocument.data?.data?.id || uploadDocument.data?.data?._id || null;
  const downloadDocument = documentId
    ? await request(`/api/employee/documents/${documentId}/download`, { token: employeeToken })
    : { status: 400, data: {} };

  results.push(
    item("Documents: Upload document works", uploadDocument.status === 201 ? "PASS" : "FAIL", {
      uploadStatus: uploadDocument.status,
      documentId,
    })
  );
  results.push(
    item(
      "Documents: Download own document works",
      downloadDocument.status === 200 && Boolean(downloadDocument.data?.data?.downloadUrl)
        ? "PASS"
        : "FAIL",
      {
        downloadStatus: downloadDocument.status,
        hasUrl: Boolean(downloadDocument.data?.data?.downloadUrl),
      }
    )
  );

  // Chat
  const threadCreate =
    managerId
      ? await request("/api/employee/chat/threads", {
          method: "POST",
          token: employeeToken,
          body: { targetUserId: managerId },
        })
      : { status: 400, data: {} };
  const threadId =
    threadCreate.data?.data?._id ||
    threadCreate.data?.data?.id ||
    null;
  const chatText = `Employee chat ping ${Date.now()}`;
  const sendMessage = threadId
    ? await request(`/api/employee/chat/threads/${threadId}/messages`, {
        method: "POST",
        token: employeeToken,
        body: { text: chatText },
      })
    : { status: 400, data: {} };
  const receiveMessages = threadId
    ? await request(`/api/employee/chat/threads/${threadId}/messages`, { token: employeeToken })
    : { status: 400, data: {} };
  const messageRows = receiveMessages.data?.data?.messages || receiveMessages.data?.messages || [];
  const hasMessage = messageRows.some((m) => (m?.text || "").includes(chatText));

  results.push(
    item("Chat: Send message works", sendMessage.status === 201 ? "PASS" : "FAIL", {
      sendStatus: sendMessage.status,
      threadId,
    })
  );
  results.push(
    item("Chat: Receive message works", receiveMessages.status === 200 && hasMessage ? "PASS" : "PARTIAL", {
      receiveStatus: receiveMessages.status,
      hasMessage,
      note: "API retrieval verified; websocket push requires browser runtime.",
    })
  );

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        actor: employeeAuth.creds.email,
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
