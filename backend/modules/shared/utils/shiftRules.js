const SHIFT_RULES = [
  {
    id: 'it',
    match: (department = '') => department.toLowerCase().includes('it'),
    start: { hour: 11, minute: 15 },
    end: { hour: 19, minute: 0 },
    label: 'IT Core Hours (11:15 AM – 7:00 PM)',
  },
  {
    id: 'default',
    match: () => true,
    start: { hour: 9, minute: 0 },
    end: { hour: 18, minute: 0 },
    label: 'Standard Hours (9:00 AM – 6:00 PM)',
  },
];

const determineShift = (department = '') => {
  const normalized = department?.toString?.().toLowerCase() || '';
  return SHIFT_RULES.find((rule) => rule.match(normalized)) || SHIFT_RULES[SHIFT_RULES.length - 1];
};

const isITShift = (shift) => shift?.id === 'it';

const buildShiftWindow = (referenceDate, shift = SHIFT_RULES[SHIFT_RULES.length - 1]) => {
  const baseDate =
    referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())
      ? new Date(referenceDate)
      : new Date();
  const expectedStart = new Date(baseDate);
  expectedStart.setHours(shift.start.hour, shift.start.minute, 0, 0);

  const expectedEnd = new Date(expectedStart);
  expectedEnd.setHours(shift.end.hour, shift.end.minute, 0, 0);

  // Handle overnight shifts
  if (expectedEnd <= expectedStart) {
    expectedEnd.setDate(expectedEnd.getDate() + 1);
  }

  return { expectedStart, expectedEnd };
};

const formatTimeLabel = (date) =>
  new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(date);

const formatDuration = (ms) => {
  const totalMinutes = Math.round(Math.abs(ms) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes || !parts.length) parts.push(`${minutes}m`);
  return parts.join(' ');
};

const evaluateAttendanceRecord = (record, { force = false } = {}) => {
  if (!record) return null;
  const department = record.employee?.department || record.department || '';
  const shift = determineShift(department);

  if (!force && !isITShift(shift)) {
    return null;
  }

  const checkIn = record.checkIn ? new Date(record.checkIn) : null;
  if (!checkIn || Number.isNaN(checkIn.getTime())) {
    return null;
  }
  const checkOut = record.checkOut ? new Date(record.checkOut) : null;

  const { expectedStart, expectedEnd } = buildShiftWindow(checkIn, shift);
  const isLate = checkIn > expectedStart;
  const hasCheckedOut = Boolean(checkOut && !Number.isNaN(checkOut.getTime()));
  const leftEarly = hasCheckedOut ? checkOut < expectedEnd : false;

  const durationHours = hasCheckedOut
    ? Math.max(0, Math.round(((checkOut - checkIn) / (1000 * 60 * 60)) * 100) / 100)
    : record.workHours ?? 0;

  let status;
  if (!hasCheckedOut) {
    status = isLate ? 'late' : 'present';
  } else if (!isLate && !leftEarly) {
    status = 'present';
  } else if (!isLate && leftEarly) {
    status = 'half-day';
  } else {
    status = 'late';
  }

  const arrivalNote = isLate
    ? `Arrived ${formatDuration(checkIn - expectedStart)} late (after ${formatTimeLabel(
        expectedStart
      )})`
    : `Arrived on time (expected ${formatTimeLabel(expectedStart)})`;

  const departureNote = hasCheckedOut
    ? leftEarly
      ? `Left ${formatDuration(expectedEnd - checkOut)} early (before ${formatTimeLabel(
          expectedEnd
        )})`
      : `Completed scheduled hours (to ${formatTimeLabel(expectedEnd)})`
    : 'Pending check-out';

  const notes = `${arrivalNote} • ${departureNote}`;

  return {
    status,
    workHours: durationHours,
    notes,
    shift,
    isLate,
    leftEarly,
  };
};

module.exports = {
  determineShift,
  buildShiftWindow,
  formatTimeLabel,
  formatDuration,
  evaluateAttendanceRecord,
  isITShift,
};
