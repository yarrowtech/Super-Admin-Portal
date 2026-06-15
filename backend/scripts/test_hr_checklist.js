const BASE_URL = "http://127.0.0.1:5000";

const hrCredentialOptions = [
  { email: "attreyee@test.com", password: "attreyee@test.com" },
  { email: "admin@test.com", password: "admin@test.com" },
  { email: "hr@example.com", password: "Password123!" },
];

const employeeCredentialOptions = [
  { email: "santu@test.com", password: "santu@test.com" },
  { email: "employee@example.com", password: "Password123!" },
  { email: "admin@test.com", password: "admin@test.com" },
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

  const hrAuth = await loginAny(hrCredentialOptions);
  if (!hrAuth?.token) {
    console.log(
      JSON.stringify(
        { error: "HR/Admin login failed for all candidates", candidates: hrCredentialOptions },
        null,
        2
      )
    );
    process.exit(1);
  }
  const hrToken = hrAuth.token;

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
  const employeeEmail = employeeAuth.creds.email;

  const employeeLookup = await request(`/api/dept/hr/employees?search=${encodeURIComponent(employeeEmail)}&limit=5`, {
    token: hrToken,
  });
  const employeeRecords = employeeLookup.data?.data?.employees || [];
  const employeeId =
    employeeRecords[0]?._id ||
    employeeRecords[0]?.id ||
    null;

  // Dashboard
  const dashboard = await request("/api/dept/hr/dashboard", { token: hrToken });
  const employeesCount = await request("/api/dept/hr/employees?role=employee&limit=1", { token: hrToken });
  const pendingLeaves = await request("/api/dept/hr/leave?status=pending&limit=1", { token: hrToken });
  const dashboardEmployeeSummary = dashboard.data?.data?.employeeSummary;
  const employeesTotal = employeesCount.data?.data?.total;
  const pendingLeavesTotal = pendingLeaves.data?.data?.total;

  results.push(
    item(
      "Dashboard: Employee summary accurate",
      dashboard.status === 200 &&
        dashboardEmployeeSummary &&
        typeof employeesTotal === "number" &&
        dashboardEmployeeSummary.total === employeesTotal
        ? "PASS"
        : "FAIL",
      {
        status: dashboard.status,
        dashboardTotal: dashboardEmployeeSummary?.total,
        employeesApiTotal: employeesTotal,
      }
    )
  );
  results.push(
    item(
      "Dashboard: Pending leave count accurate",
      dashboard.status === 200 &&
        typeof pendingLeavesTotal === "number" &&
        dashboard.data?.data?.pendingLeaves === pendingLeavesTotal
        ? "PASS"
        : "FAIL",
      {
        dashboardPending: dashboard.data?.data?.pendingLeaves,
        leaveApiPending: pendingLeavesTotal,
      }
    )
  );

  // Staff Work Report
  const reportCreate = await request("/api/dept/employee/work-reports", {
    method: "POST",
    token: employeeToken,
    body: {
      reportType: "daily",
      title: `HR Checklist Report ${Date.now()}`,
      description: "Created for HR checklist testing",
    },
  });
  const createdReportId = reportCreate.data?.data?._id || reportCreate.data?.data?.id || null;
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const reports = await request("/api/dept/hr/work-reports?limit=10", { token: hrToken });
  const filteredReports = employeeId
    ? await request(
        `/api/dept/hr/work-reports?employee=${employeeId}&startDate=${encodeURIComponent(
          yesterday.toISOString()
        )}&endDate=${encodeURIComponent(tomorrow.toISOString())}&limit=20`,
        { token: hrToken }
      )
    : { status: 400, data: {} };
  const visibleReports = reports.data?.data?.reports || [];
  const filteredReportRows = filteredReports.data?.data?.reports || [];
  const hasCreatedReport = visibleReports.some((r) => `${r?._id || r?.id}` === `${createdReportId}`);
  const allFilteredForEmployee = employeeId
    ? filteredReportRows.every((r) => `${r?.employee?._id || r?.employee}` === `${employeeId}`)
    : false;

  results.push(
    item("Staff Work Report: Employee reports visible", reports.status === 200 && hasCreatedReport ? "PASS" : "FAIL", {
      status: reports.status,
      createdReportId,
      visibleCount: visibleReports.length,
    })
  );
  results.push(
    item(
      "Staff Work Report: Filter by date/user works",
      filteredReports.status === 200 && allFilteredForEmployee
        ? "PASS"
        : "FAIL",
      {
        status: filteredReports.status,
        employeeId,
        filteredCount: filteredReportRows.length,
      }
    )
  );

  // Attendance Management
  const attendanceDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const checkIn = new Date(attendanceDate);
  checkIn.setHours(9, 0, 0, 0);
  const checkOut = new Date(attendanceDate);
  checkOut.setHours(18, 0, 0, 0);
  const attendanceCreate = employeeId
    ? await request("/api/dept/hr/attendance", {
        method: "POST",
        token: hrToken,
        body: {
          employee: employeeId,
          date: attendanceDate.toISOString(),
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          status: "present",
          location: "office",
          notes: "HR checklist mark attendance",
        },
      })
    : { status: 400, data: {} };
  const attendanceId = attendanceCreate.data?.data?._id || attendanceCreate.data?.data?.id || null;
  const attendanceEdit = attendanceId
    ? await request(`/api/dept/hr/attendance/${attendanceId}`, {
        method: "PUT",
        token: hrToken,
        body: { notes: "HR checklist attendance updated" },
      })
    : { status: 400, data: {} };
  const attendanceList = employeeId
    ? await request(
        `/api/dept/hr/attendance?employee=${employeeId}&month=${today.getMonth() + 1}&year=${today.getFullYear()}&limit=50`,
        { token: hrToken }
      )
    : { status: 400, data: {} };
  const monthSummary = attendanceList.data?.data?.monthSummary;
  const summaryCount =
    (monthSummary?.present || 0) +
    (monthSummary?.late || 0) +
    (monthSummary?.absent || 0) +
    (monthSummary?.halfDay || 0) +
    (monthSummary?.onLeave || 0);

  results.push(
    item("Attendance Management: Mark attendance works", attendanceCreate.status === 201 ? "PASS" : "FAIL", {
      status: attendanceCreate.status,
      attendanceId,
    })
  );
  results.push(
    item("Attendance Management: Edit attendance works", attendanceEdit.status === 200 ? "PASS" : "FAIL", {
      status: attendanceEdit.status,
      attendanceId,
    })
  );
  results.push(
    item(
      "Attendance Management: Monthly summary accurate",
      attendanceList.status === 200 &&
        monthSummary &&
        typeof monthSummary.totalRecords === "number" &&
        summaryCount === monthSummary.totalRecords
        ? "PASS"
        : "FAIL",
      {
        status: attendanceList.status,
        monthSummary,
      }
    )
  );

  // Leave Management
  const leavesView = await request("/api/dept/hr/leave?status=pending&limit=20", { token: hrToken });
  const employeeBeforeLeaveBalance = employeeId
    ? await request(`/api/dept/hr/employees?search=${encodeURIComponent(employeeEmail)}&limit=5`, { token: hrToken })
    : { status: 400, data: {} };
  const beforeLeaveBalance =
    employeeBeforeLeaveBalance.data?.data?.employees?.[0]?.metadata?.leaveBalance || null;

  const leaveCreate1 = await request("/api/dept/employee/leave", {
    method: "POST",
    token: employeeToken,
    body: {
      leaveType: "casual",
      startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      totalDays: 1,
      reason: "HR checklist approval leave",
    },
  });
  const leaveCreate2 = await request("/api/dept/employee/leave", {
    method: "POST",
    token: employeeToken,
    body: {
      leaveType: "casual",
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      totalDays: 1,
      reason: "HR checklist reject leave",
    },
  });
  const leaveId1 = leaveCreate1.data?.data?._id || leaveCreate1.data?.data?.id || null;
  const leaveId2 = leaveCreate2.data?.data?._id || leaveCreate2.data?.data?.id || null;
  const approveLeave = leaveId1
    ? await request(`/api/dept/hr/leave/${leaveId1}/approve`, { method: "PUT", token: hrToken })
    : { status: 400, data: {} };
  const rejectLeave = leaveId2
    ? await request(`/api/dept/hr/leave/${leaveId2}/reject`, {
        method: "PUT",
        token: hrToken,
        body: { rejectionReason: "Checklist reject" },
      })
    : { status: 400, data: {} };
  const employeeAfterLeaveBalance = employeeId
    ? await request(`/api/dept/hr/employees?search=${encodeURIComponent(employeeEmail)}&limit=5`, { token: hrToken })
    : { status: 400, data: {} };
  const afterLeaveBalance =
    employeeAfterLeaveBalance.data?.data?.employees?.[0]?.metadata?.leaveBalance || null;
  const balanceUpdated =
    beforeLeaveBalance &&
    afterLeaveBalance &&
    typeof beforeLeaveBalance.casual === "number" &&
    typeof afterLeaveBalance.casual === "number" &&
    afterLeaveBalance.casual <= beforeLeaveBalance.casual;

  results.push(item("Leave Management: View requests works", leavesView.status === 200 ? "PASS" : "FAIL", { status: leavesView.status }));
  results.push(item("Leave Management: Approve leave works", approveLeave.status === 200 ? "PASS" : "FAIL", { status: approveLeave.status, leaveId: leaveId1 }));
  results.push(item("Leave Management: Reject leave works", rejectLeave.status === 200 ? "PASS" : "FAIL", { status: rejectLeave.status, leaveId: leaveId2 }));
  results.push(
    item("Leave Management: Leave balance updates", balanceUpdated ? "PASS" : "FAIL", {
      beforeLeaveBalance,
      afterLeaveBalance,
      approveMetaBalance: approveLeave.data?.meta?.leaveBalance || null,
    })
  );

  // Employee Records
  const unique = `hrcheck${Date.now()}`;
  const createEmployee = await request("/api/dept/hr/employees", {
    method: "POST",
    token: hrToken,
    body: {
      email: `${unique}@example.com`,
      password: "Pass1234",
      role: "employee",
      firstName: "Hr",
      lastName: "Checklist",
      department: "Operations",
      phone: "9999999999",
    },
  });
  const createdEmployeeId = createEmployee.data?.data?._id || createEmployee.data?.data?.id || null;
  const updateEmployee = createdEmployeeId
    ? await request(`/api/dept/hr/employees/${createdEmployeeId}`, {
        method: "PUT",
        token: hrToken,
        body: {
          firstName: "HrUpdated",
          department: "Operations Updated",
          phone: "8888888888",
        },
      })
    : { status: 400, data: {} };
  const searchEmployee = await request(`/api/dept/hr/employees?search=${encodeURIComponent(unique)}&limit=5`, {
    token: hrToken,
  });
  const archiveEmployee = createdEmployeeId
    ? await request(`/api/dept/hr/employees/${createdEmployeeId}/toggle-status`, {
        method: "POST",
        token: hrToken,
      })
    : { status: 400, data: {} };

  results.push(item("Employee Records: Add employee record works", createEmployee.status === 201 ? "PASS" : "FAIL", { status: createEmployee.status, employeeId: createdEmployeeId }));
  results.push(item("Employee Records: Update employee data works", updateEmployee.status === 200 ? "PASS" : "FAIL", { status: updateEmployee.status }));
  results.push(
    item(
      "Employee Records: Search employee works",
      searchEmployee.status === 200 && (searchEmployee.data?.data?.employees || []).length > 0 ? "PASS" : "FAIL",
      { status: searchEmployee.status, resultCount: (searchEmployee.data?.data?.employees || []).length }
    )
  );
  results.push(item("Employee Records: Archive employee works", archiveEmployee.status === 200 ? "PASS" : "FAIL", { status: archiveEmployee.status }));

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.status === "PASS").length,
    fail: results.filter((r) => r.status === "FAIL").length,
    partial: results.filter((r) => r.status === "PARTIAL").length,
    blocked: results.filter((r) => r.status === "BLOCKED").length,
  };

  console.log(JSON.stringify({ authUsed: { hr: hrAuth.creds.email, employee: employeeAuth.creds.email }, summary, results }, null, 2));
  process.exit(summary.fail > 0 ? 2 : 0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
