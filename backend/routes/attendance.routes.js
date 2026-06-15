const express = require('express');
const attendanceController = require('../controllers/employee/employeeAttendance.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

const router = express.Router();

router.use(authenticate);
router.use(authorize(...Object.values(ROLES)));

router.get('/', attendanceController.getTodayAttendanceStatus);
router.get('/history', attendanceController.getMyAttendance);
router.post('/check-in', attendanceController.checkIn);
router.put('/check-out', attendanceController.checkOut);
router.put('/location', attendanceController.setAttendanceLocation);

module.exports = router;
