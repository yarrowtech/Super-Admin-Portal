'use strict';
// Escalates overdue invoices to the finance head and the project's manager (§B).
//
// Two properties matter more than the schedule itself.
//
// Idempotence: `escalatedAt` on the invoice is a watermark, so an invoice is escalated once
// per threshold crossing rather than every night until someone pays. Without it the daily
// run would turn into noise and the notifications would start being ignored — the same
// reason Budget carries `alertedAt`.
//
// Isolation: a notification failure must never affect financial data. This job only reads
// invoices and writes that one watermark field; it posts nothing to the ledger.
const cron = require('node-cron');
const Invoice = require('../models/finance/Invoice');
const Project = require('../models/common/Project');
const notify = require('../services/finance/notify.service');
const logger = require('../utils/logger');

// Default 07:30 every day, in India time — early enough to action during the working day.
const SCHEDULE = process.env.FINANCE_OVERDUE_ESCALATION_CRON || '30 7 * * *';
const TIMEZONE = process.env.FINANCE_OVERDUE_ESCALATION_TZ || 'Asia/Kolkata';
const THRESHOLD_DAYS = Number(process.env.FINANCE_OVERDUE_ESCALATION_DAYS || 7);
// Re-escalate only after this long, so a still-unpaid invoice is chased periodically
// instead of either once ever or every single day.
const REESCALATE_AFTER_DAYS = Number(process.env.FINANCE_OVERDUE_REESCALATE_DAYS || 14);
const BATCH_LIMIT = Number(process.env.FINANCE_OVERDUE_ESCALATION_LIMIT || 200);

const DAY_MS = 86400000;

// Exported separately from the schedule so it can be run on demand and asserted in tests
// without waiting for a cron tick.
async function runOverdueEscalation({ now = new Date(), thresholdDays = THRESHOLD_DAYS } = {}) {
  const dueBefore = new Date(now.getTime() - thresholdDays * DAY_MS);
  const reescalateBefore = new Date(now.getTime() - REESCALATE_AFTER_DAYS * DAY_MS);

  const candidates = await Invoice.find({
    invoiceType: 'customer',
    status: { $nin: ['draft', 'void', 'paid'] },
    balanceDue: { $gt: 0 },
    dueDate: { $lt: dueBefore },
    // Never escalated, or last escalated long enough ago to be worth repeating.
    $or: [{ escalatedAt: null }, { escalatedAt: { $lt: reescalateBefore } }],
    // A disputed invoice is already being handled; chasing payment on it would be wrong.
    disputeId: null,
  })
    .sort({ dueDate: 1 })
    .limit(BATCH_LIMIT)
    .select('invoiceNumber clientName balanceDue dueDate projectId departmentId')
    .lean();

  if (!candidates.length) return { escalated: 0, notified: 0 };

  // One lookup for every project involved, rather than per invoice.
  const projectIds = [...new Set(candidates.map((i) => i.projectId).filter(Boolean).map(String))];
  const managers = new Map();
  if (projectIds.length) {
    const projects = await Project.find({ _id: { $in: projectIds } }).select('projectManager').lean();
    for (const project of projects) {
      if (project.projectManager) managers.set(String(project._id), project.projectManager);
    }
  }

  const invoices = candidates.map((invoice) => ({
    ...invoice,
    projectManager: invoice.projectId ? managers.get(String(invoice.projectId)) || null : null,
  }));

  // Notify first, then watermark: if delivery throws, the invoices stay un-watermarked and
  // the next run retries them. The reverse order could drop an escalation silently.
  const notified = await notify.overdueInvoices({ invoices, thresholdDays });
  await Invoice.updateMany({ _id: { $in: candidates.map((i) => i._id) } }, { $set: { escalatedAt: now } });

  logger.info({ escalated: candidates.length, notified, thresholdDays }, 'Overdue invoice escalation completed');
  return { escalated: candidates.length, notified };
}

let task = null;

// True when running under `node --test`. NODE_ENV is not a reliable signal here: this
// project's .env sets it to `development`, so a test run would otherwise look like a normal
// boot and could fire notifications at real users.
const isTestRun = () =>
  process.env.NODE_ENV === 'test'
  || Boolean(process.env.NODE_TEST_CONTEXT)
  || process.execArgv.some((arg) => arg === '--test' || arg.startsWith('--test-'));

// Registered from server startup. Disabled under the test runner and wherever the flag is
// off, so a test run or a one-off script never notifies real people.
function startOverdueEscalationJob() {
  if (task) return task;
  if (isTestRun()) return null;
  if (String(process.env.FINANCE_OVERDUE_ESCALATION_ENABLED || 'true') === 'false') {
    logger.info('Overdue invoice escalation is disabled by configuration');
    return null;
  }
  if (!cron.validate(SCHEDULE)) {
    logger.error({ schedule: SCHEDULE }, 'Overdue invoice escalation cron expression is invalid; job not started');
    return null;
  }

  task = cron.schedule(SCHEDULE, async () => {
    try {
      await runOverdueEscalation();
    } catch (err) {
      // A failed run is logged and retried on the next tick; it must never take the
      // process down.
      logger.error({ err }, 'Overdue invoice escalation failed');
    }
  }, { timezone: TIMEZONE });

  logger.info({ schedule: SCHEDULE, timezone: TIMEZONE, thresholdDays: THRESHOLD_DAYS }, 'Overdue invoice escalation scheduled');
  return task;
}

function stopOverdueEscalationJob() {
  if (!task) return;
  task.stop();
  task = null;
}

module.exports = { runOverdueEscalation, startOverdueEscalationJob, stopOverdueEscalationJob, THRESHOLD_DAYS };
