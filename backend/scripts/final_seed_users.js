require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const User = require("../models/auth/User");
const { ROLES } = require("../config/roles");

const users = [
  {
    email: "admin@test.com",
    password: "admin@test.com",
    role: ROLES.ADMIN,
    firstName: "Admin",
    lastName: "User",
    department: "Administration"
  },
  {
    email: "raphael@test.com",
    password: "raphael@test.com",
    role: ROLES.CEO,
    firstName: "Raphael",
    lastName: "CEO",
    department: "Executive"
  },
  {
    email: "attreyee@test.com",
    password: "attreyee@test.com",
    role: ROLES.HR,
    firstName: "Attreyee",
    lastName: "HR",
    department: "Human Resources"
  },
  // IT department
  {
    email: "it.manager@test.com",
    password: "it.manager@test.com",
    role: ROLES.IT_MANAGER,
    firstName: "IT",
    lastName: "Manager",
    department: "IT"
  },
  {
    email: "it.admin@test.com",
    password: "it.admin@test.com",
    role: ROLES.IT_ADMIN,
    firstName: "IT",
    lastName: "Admin",
    department: "IT"
  },
  {
    email: "it.employee@test.com",
    password: "it.employee@test.com",
    role: ROLES.IT_EMPLOYEE,
    firstName: "IT",
    lastName: "Employee",
    department: "IT"
  },
  {
    email: "it.hr@test.com",
    password: "it.hr@test.com",
    role: ROLES.IT_HR,
    firstName: "IT",
    lastName: "HR",
    department: "IT"
  },
  // Finance department
  {
    email: "finance.manager@test.com",
    password: "finance.manager@test.com",
    role: ROLES.FINANCE_MANAGER,
    firstName: "Finance",
    lastName: "Manager",
    department: "Finance"
  },
  {
    email: "finance.employee@test.com",
    password: "finance.employee@test.com",
    role: ROLES.FINANCE_EMPLOYEE,
    firstName: "Finance",
    lastName: "Employee",
    department: "Finance"
  },
  // Media department
  {
    email: "media.head@test.com",
    password: "media.head@test.com",
    role: ROLES.MEDIA_HEAD,
    firstName: "Media",
    lastName: "Head",
    department: "Media"
  },
  {
    email: "media.sales@test.com",
    password: "media.sales@test.com",
    role: ROLES.MEDIA_SALES,
    firstName: "Media",
    lastName: "Sales",
    department: "Media"
  },
  {
    email: "media.marketing@test.com",
    password: "media.marketing@test.com",
    role: ROLES.MEDIA_MARKETING,
    firstName: "Media",
    lastName: "Marketing",
    department: "Media"
  },
  // Law department
  {
    email: "law.head@test.com",
    password: "law.head@test.com",
    role: ROLES.LAW_HEAD,
    firstName: "Law",
    lastName: "Head",
    department: "Law"
  },
  {
    email: "law.employee@test.com",
    password: "law.employee@test.com",
    role: ROLES.LAW_EMPLOYEE,
    firstName: "Law",
    lastName: "Employee",
    department: "Law"
  },
  // Outsourcing (unchanged)
  {
    email: "rajesh@test.com",
    password: "rajesh@test.com",
    role: ROLES.FREELANCER,
    firstName: "Rajesh",
    lastName: "Outsourcing",
    department: "External Workforce",
    metadata: {
      outsourcingType: "freelancer",
      workerClass: "external_contractor",
      isInHouse: false
    }
  }
];

const run = async () => {
  if (process.env.RESET_DB_CONFIRM !== "YES") {
    throw new Error("Set RESET_DB_CONFIRM=YES to run final seed reset.");
  }

  await connectDB();
  await User.deleteMany({});

  const payload = users.map((u) => ({
    ...u,
    isActive: true,
    accountStatus: "active",
    emailVerified: true,
    emailVerifiedAt: new Date()
  }));

  for (const user of payload) {
    await User.create(user);
  }

  console.log(`Final seed complete. Inserted ${payload.length} users.`);
};

run()
  .catch((err) => {
    console.error("Final seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
