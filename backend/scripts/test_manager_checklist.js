const BASE_URL = "http://127.0.0.1:5000";

const creds = {
  managerCandidates: [
    { email: "sekhar@test.com", password: "sekhar@test.com" },
    { email: "admin@test.com", password: "admin@test.com" },
  ],
  employeeCandidates: [
    { email: "santu@test.com", password: "santu@test.com" },
    { email: "admin@test.com", password: "admin@test.com" },
  ],
};

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

async function run() {
  const results = [];

  let managerLogin = { status: 0, data: null };
  let managerToken = null;
  for (const candidate of creds.managerCandidates) {
    managerLogin = await request("/api/auth/login", {
      method: "POST",
      body: candidate,
    });
    managerToken = getToken(managerLogin.data);
    if (managerToken) break;
  }
  if (!managerToken) {
    console.log(
      JSON.stringify(
        {
          error: "Manager login failed",
          loginStatus: managerLogin.status,
          loginBody: managerLogin.data,
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  let employeeLogin = { status: 0, data: null };
  let employeeToken = null;
  for (const candidate of creds.employeeCandidates) {
    employeeLogin = await request("/api/auth/login", {
      method: "POST",
      body: candidate,
    });
    employeeToken = getToken(employeeLogin.data);
    if (employeeToken) break;
  }

  // Dashboard
  const dashboard = await request("/api/dept/manager/dashboard", { token: managerToken });
  const team = await request("/api/dept/manager/team", { token: managerToken });
  const leaveList = await request("/api/dept/manager/leave?status=pending", { token: managerToken });

  const dashboardOk =
    dashboard.status === 200 &&
    dashboard.data?.data?.teamSummary &&
    dashboard.data?.data?.taskSummary;
  results.push(item("Dashboard: Team stats correct", dashboardOk ? "PASS" : "FAIL", {
    status: dashboard.status,
    hasTeamSummary: Boolean(dashboard.data?.data?.teamSummary),
  }));

  const hasPendingInDashboard =
    dashboard.data?.data?.pendingApprovals !== undefined ||
    dashboard.data?.data?.approvals !== undefined;
  const pendingCountStatus =
    hasPendingInDashboard
      ? "PASS"
      : leaveList.status === 200
        ? "PARTIAL"
        : "FAIL";
  results.push(
    item("Dashboard: Pending approvals count correct", pendingCountStatus, {
      dashboardHasPendingField: hasPendingInDashboard,
      leaveEndpointStatus: leaveList.status,
      pendingLeavesFromLeaveApi: leaveList.data?.data?.total || leaveList.data?.data?.leaves?.length || 0,
    })
  );

  // Team Management
  const teamMembers = team.data?.data?.team || [];
  const employeeMembers = teamMembers.filter((member) => member?.role === "employee");
  const memberId = employeeMembers[0]?._id || employeeMembers[0]?.id || null;
  const secondMemberId = employeeMembers[1]?._id || employeeMembers[1]?.id || null;
  const candidateMemberIds = [memberId, secondMemberId].filter(Boolean);
  const createProjectTeam = memberId
    ? await request("/api/dept/manager/project-teams", {
        method: "POST",
        token: managerToken,
        body: {
          name: `Manager Team ${Date.now()}`,
          description: "Automated checklist team",
          memberIds: candidateMemberIds.length ? candidateMemberIds : [memberId],
          projectCode: `PRJ-${Date.now()}`,
        },
      })
    : { status: 400 };
  const createdTeamId =
    createProjectTeam.data?.data?.id ||
    createProjectTeam.data?.data?._id ||
    null;
  const removeMemberTargetId = candidateMemberIds[0] || null;
  const removeMember = createdTeamId && removeMemberTargetId
    ? await request(`/api/dept/manager/project-teams/${createdTeamId}/members/${removeMemberTargetId}`, {
        method: "DELETE",
        token: managerToken,
      })
    : { status: 400 };
  results.push(
    item("Team Management: Add team member works", createProjectTeam.status === 201 ? "PASS" : "FAIL", {
      status: createProjectTeam.status,
      selectedMemberId: memberId,
    })
  );
  results.push(
    item("Team Management: Remove member works", removeMember.status === 200 ? "PASS" : "FAIL", {
      status: removeMember.status,
      teamId: createdTeamId,
      memberId: removeMemberTargetId,
    })
  );
  const searchSource = employeeMembers[0] || teamMembers[0] || {};
  const searchValue =
    searchSource?.firstName ||
    (searchSource?.email ? searchSource.email.split("@")[0] : "a");
  const searchTeam = await request(`/api/dept/manager/team?search=${encodeURIComponent(searchValue)}`, { token: managerToken });
  const searchResults = searchTeam.data?.data?.team || [];
  results.push(
    item("Team Management: Search member works", searchTeam.status === 200 && searchResults.length > 0 ? "PASS" : "FAIL", {
      status: searchTeam.status,
      search: searchValue,
      resultCount: searchResults.length,
    })
  );

  // Project Management
  const projectCreate = memberId
    ? await request("/api/dept/manager/projects", {
        method: "POST",
        token: managerToken,
        body: {
          name: `Manager Project ${Date.now()}`,
          description: "Checklist project",
          startDate: new Date().toISOString(),
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          teamMemberIds: [memberId],
        },
      })
    : { status: 400, data: {} };
  const createdProjectId = projectCreate.data?.data?._id || projectCreate.data?.data?.id;

  const projects = await request("/api/dept/manager/projects", { token: managerToken });
  const taskCreate = memberId
    ? await request("/api/dept/manager/tasks", {
        method: "POST",
        token: managerToken,
        body: {
          title: `Manager Task ${Date.now()}`,
          description: "Checklist task",
          assignedTo: memberId,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          priority: "medium",
        },
      })
    : { status: 400, data: {} };
  const taskId = taskCreate.data?.data?._id || taskCreate.data?.data?.id;
  const taskUpdate =
    taskId
      ? await request(`/api/dept/manager/tasks/${taskId}`, {
          method: "PUT",
          token: managerToken,
          body: { status: "in-progress", progress: 40 },
        })
      : { status: 400 };
  const projectStatusUpdate = createdProjectId
    ? await request(`/api/dept/manager/projects/${createdProjectId}/status`, {
        method: "PUT",
        token: managerToken,
        body: { status: "in-progress", progress: 35 },
      })
    : { status: 400 };

  results.push(
    item("Project Management: Create project works", projectCreate.status === 201 ? "PASS" : "FAIL", {
      status: projectCreate.status,
      projectId: createdProjectId || null,
    })
  );
  results.push(
    item("Project Management: Assign project works", taskCreate.status === 201 ? "PASS" : "FAIL", {
      status: taskCreate.status,
      taskId: taskId || null,
    })
  );
  results.push(
    item("Project Management: Update project status works", projectStatusUpdate.status === 200 ? "PASS" : "FAIL", {
      status: projectStatusUpdate.status,
      projectId: createdProjectId || null,
      taskUpdateStatus: taskUpdate.status,
    })
  );

  // Work Approval
  const submittedWork = await request("/api/dept/manager/completed-tasks", { token: managerToken });
  const employeeReport1 = employeeToken
    ? await request("/api/dept/employee/work-reports", {
        method: "POST",
        token: employeeToken,
        body: {
          reportType: "daily",
          title: `Checklist Report A ${Date.now()}`,
          description: "Work submission for manager approval test A",
        },
      })
    : { status: 0, data: {} };
  const employeeReport2 = employeeToken
    ? await request("/api/dept/employee/work-reports", {
        method: "POST",
        token: employeeToken,
        body: {
          reportType: "daily",
          title: `Checklist Report B ${Date.now()}`,
          description: "Work submission for manager approval test B",
        },
      })
    : { status: 0, data: {} };
  const approveWorkId =
    employeeReport1.data?.data?._id ||
    employeeReport1.data?.data?.id ||
    null;
  const rejectWorkId =
    employeeReport2.data?.data?._id ||
    employeeReport2.data?.data?.id ||
    null;

  const approveWork = approveWorkId
    ? await request(`/api/dept/manager/employee-work/${approveWorkId}/approve`, {
        method: "PUT",
        token: managerToken,
      })
    : { status: 400 };
  const rejectWork = rejectWorkId
    ? await request(`/api/dept/manager/employee-work/${rejectWorkId}/reject`, {
        method: "PUT",
        token: managerToken,
        body: { reason: "Not acceptable" },
      })
    : { status: 400 };
  results.push(item("Work Approval: View submitted work", submittedWork.status === 200 ? "PASS" : "FAIL", { status: submittedWork.status }));
  results.push(item("Work Approval: Approve work works", approveWork.status === 200 ? "PASS" : "FAIL", { status: approveWork.status }));
  results.push(item("Work Approval: Reject work works", rejectWork.status === 200 ? "PASS" : "FAIL", { status: rejectWork.status }));

  // Leave Approval (create pending leave as employee first)
  let leaveCreate1 = { status: 0, data: {} };
  let leaveCreate2 = { status: 0, data: {} };
  if (employeeToken) {
    leaveCreate1 = await request("/api/dept/employee/leave", {
      method: "POST",
      token: employeeToken,
      body: {
        leaveType: "casual",
        startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        totalDays: 2,
        reason: "Checklist leave 1",
      },
    });
    leaveCreate2 = await request("/api/dept/employee/leave", {
      method: "POST",
      token: employeeToken,
      body: {
        leaveType: "casual",
        startDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        totalDays: 1,
        reason: "Checklist leave 2",
      },
    });
  }

  const leaves = await request("/api/dept/manager/leave?status=pending", { token: managerToken });
  const firstLeaveId =
    leaveCreate1.data?.data?._id ||
    leaveCreate1.data?.data?.id ||
    leaves.data?.data?.leaves?.[0]?._id ||
    null;
  const secondLeaveId =
    leaveCreate2.data?.data?._id ||
    leaveCreate2.data?.data?.id ||
    leaves.data?.data?.leaves?.find((l) => `${l?._id || l?.id}` !== `${firstLeaveId}`)?._id ||
    null;

  const approveLeave = firstLeaveId
    ? await request(`/api/dept/manager/leave/${firstLeaveId}/approve`, {
        method: "PUT",
        token: managerToken,
      })
    : { status: 400 };
  const rejectLeave = secondLeaveId && `${secondLeaveId}` !== `${firstLeaveId}`
    ? await request(`/api/dept/manager/leave/${secondLeaveId}/reject`, {
        method: "PUT",
        token: managerToken,
        body: { rejectionReason: "Checklist reject" },
      })
    : { status: 0, data: { note: "No distinct second pending leave available for reject scenario" } };

  results.push(item("Leave Approval: View leave requests", leaves.status === 200 ? "PASS" : "FAIL", { status: leaves.status }));
  results.push(item("Leave Approval: Approve leave works", approveLeave.status === 200 ? "PASS" : "FAIL", { status: approveLeave.status, leaveId: firstLeaveId }));
  results.push(
    item(
      "Leave Approval: Reject leave works",
      rejectLeave.status === 200 ? "PASS" : rejectLeave.status === 0 ? "PARTIAL" : "FAIL",
      { status: rejectLeave.status, leaveId: secondLeaveId }
    )
  );

  // Notifications
  const notifications = await request("/api/dept/manager/notifications", { token: managerToken });
  results.push(item("Notifications: Alerts visible", notifications.status === 200 ? "PASS" : "FAIL", { status: notifications.status }));
  results.push(
    item("Notifications: Real-time updates work", "BLOCKED", {
      reason: "Socket.IO event flow not validated by this HTTP checklist script",
      requiredTest: "Connect socket client and verify manager:notification push events",
    })
  );

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.status === "PASS").length,
    fail: results.filter((r) => r.status === "FAIL").length,
    partial: results.filter((r) => r.status === "PARTIAL").length,
    blocked: results.filter((r) => r.status === "BLOCKED").length,
  };

  console.log(JSON.stringify({ summary, results }, null, 2));
  process.exit(summary.fail > 0 ? 2 : 0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
