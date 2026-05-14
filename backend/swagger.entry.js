const express = require("express");

const app = express();

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/dept/admin", require("./routes/admin.routes"));
app.use("/api/dept/super-admin", require("./routes/superAdmin.routes"));
app.use("/api/dept/ceo", require("./routes/ceo.routes"));
app.use("/api/dept/it", require("./routes/it.routes"));
app.use("/api/dept/hr", require("./routes/hr.routes"));
app.use("/api/dept/finance", require("./routes/finance.routes"));
app.use("/api/dept/law", require("./routes/law.routes"));
app.use("/api/dept/media", require("./routes/media.routes"));
app.use("/api/dept/manager", require("./routes/manager.routes"));
app.use("/api/dept/employee", require("./routes/employee.dept.routes"));
app.use("/api/employee", require("./routes/employee.routes"));
app.use("/api/dept", require("./routes/department.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));
app.use("/api/chat", require("./routes/chat.routes"));
app.use("/api/reports", require("./routes/report.routes"));
app.use("/api/outsourcing", require("./routes/outsourcing.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "API is running" });
});

module.exports = app;
