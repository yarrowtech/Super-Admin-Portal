require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const User = require("../models/auth/User");
const { ROLES } = require("../config/roles");

const users = [
  {
    email: "raphael@test.com",
    password: "raphael@test.com",
    role: ROLES.CEO,
    firstName: "Raphael",
    lastName: "CEO",
    department: "Executive"
  },
  {
    email: "sekhar@test.com",
    password: "sekhar@test.com",
    role: ROLES.MANAGER,
    firstName: "Sekhar",
    lastName: "Manager",
    department: "Operations"
  },
  {
    email: "santu@test.com",
    password: "santu@test.com",
    role: ROLES.EMPLOYEE,
    firstName: "Santu",
    lastName: "Employee",
    department: "Operations"
  },
  {
    email: "rajesh@test.com",
    password: "rajesh@test.com",
    role: ROLES.EMPLOYEE,
    firstName: "Rajesh",
    lastName: "Outsourcing",
    department: "External Workforce",
    metadata: {
      outsourcingType: "freelancer",
      workerClass: "external_contractor",
      isInHouse: false
    }
  },
  {
    email: "admin@test.com",
    password: "admin@test.com",
    role: ROLES.ADMIN,
    firstName: "Admin",
    lastName: "User",
    department: "Administration"
  },
  {
    email: "attreyee@test.com",
    password: "attreyee@test.com",
    role: ROLES.HR,
    firstName: "Attreyee",
    lastName: "HR",
    department: "Human Resources"
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
