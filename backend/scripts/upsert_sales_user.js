require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User = require('../models/auth/User');
const { ROLES } = require('../config/roles');

const SALES_EMAIL = 'sales@test.com';
const SALES_PASSWORD = 'sales@test.com';

const run = async () => {
  await connectDB();

  const existing = await User.findOne({ email: SALES_EMAIL }).select('+password');
  const baseUser = {
    email: SALES_EMAIL,
    role: ROLES.SALES,
    firstName: 'Sales',
    lastName: 'User',
    department: 'Media Sales',
    isActive: true,
    accountStatus: 'active',
    emailVerified: true,
    emailVerifiedAt: new Date(),
    metadata: {
      portal: 'media',
      departmentType: 'sales',
      loginSource: 'password',
    },
  };

  if (existing) {
    Object.assign(existing, baseUser);
    existing.password = SALES_PASSWORD;
    await existing.save();
    console.log(`Updated sales login: ${SALES_EMAIL}`);
    return;
  }

  await User.create({
    ...baseUser,
    password: SALES_PASSWORD,
  });
  console.log(`Created sales login: ${SALES_EMAIL}`);
};

run()
  .catch((err) => {
    console.error('Sales user upsert failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
