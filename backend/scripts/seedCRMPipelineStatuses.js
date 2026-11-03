/**
 * Seeds the default Media and Marketing relationship pipelines for the central
 * Media & Marketing CRM (Super Admin -> CRM Management -> Status Management).
 *
 * Idempotent: each stage is upserted on (name, department) with $setOnInsert, so
 * re-running never overwrites colours, ordering or descriptions an administrator
 * has since customised, and never deletes anything.
 *
 *   node scripts/seedCRMPipelineStatuses.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const CRMStatus = require("../models/crm/CRMStatus");

// Stage colours progress cool -> warm -> green as a relationship advances, so the
// pipeline reads as a temperature gradient in the UI.
const MEDIA_PIPELINE = [
  { name: "New Enquiry",          color: "#6366f1", description: "Enquiry received, not yet actioned" },
  { name: "Contacted",            color: "#3b82f6", description: "Initial contact made with the client" },
  { name: "Requirement Received", color: "#0ea5e9", description: "Client has shared their creative requirement" },
  { name: "Discussion",           color: "#14b8a6", description: "Scope and approach under discussion" },
  { name: "Proposal Sent",        color: "#f59e0b", description: "Creative proposal issued to the client" },
  { name: "Awaiting Approval",    color: "#f97316", description: "Awaiting client sign-off on the proposal" },
  { name: "Project Active",       color: "#10b981", description: "Approved and in production" },
  { name: "Delivered",            color: "#059669", description: "Work delivered and handed over", isTerminal: true },
];

const MARKETING_PIPELINE = [
  { name: "New Lead",           color: "#6366f1", description: "Lead captured, not yet actioned" },
  { name: "Contacted",          color: "#3b82f6", description: "First outreach completed" },
  { name: "Email Sent",         color: "#0ea5e9", description: "Outreach email dispatched" },
  { name: "Reply Received",     color: "#06b6d4", description: "Lead has responded" },
  { name: "Follow-up Required", color: "#14b8a6", description: "Awaiting a further follow-up action" },
  { name: "Meeting Scheduled",  color: "#8b5cf6", description: "Meeting booked with the lead" },
  { name: "Meeting Completed",  color: "#a855f7", description: "Meeting held, outcome recorded" },
  { name: "Qualified",          color: "#f59e0b", description: "Lead qualified as a genuine opportunity" },
  { name: "Proposal Sent",      color: "#f97316", description: "Commercial proposal issued" },
  { name: "Converted",          color: "#10b981", description: "Converted into an active client relationship", isTerminal: true },
];

const buildStages = (pipeline, department) =>
  pipeline.map((stage, index) => ({
    ...stage,
    department,
    order: index + 1,
    // The first stage of each pipeline is where new records land.
    isDefault: index === 0,
  }));

const run = async () => {
  await connectDB();

  const stages = [
    ...buildStages(MEDIA_PIPELINE, "media"),
    ...buildStages(MARKETING_PIPELINE, "marketing"),
  ];

  let created = 0;
  let existing = 0;

  for (const stage of stages) {
    const result = await CRMStatus.updateOne(
      { name: stage.name, department: stage.department },
      {
        $setOnInsert: {
          name: stage.name,
          department: stage.department,
          color: stage.color,
          order: stage.order,
          description: stage.description,
          isDefault: stage.isDefault,
          isTerminal: Boolean(stage.isTerminal),
          isActive: true,
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount) created += 1;
    else existing += 1;
  }

  console.log(
    `CRM pipeline seed complete. Created ${created}, left unchanged ${existing} (of ${stages.length} stages: ` +
      `${MEDIA_PIPELINE.length} media, ${MARKETING_PIPELINE.length} marketing).`
  );
};

run()
  .catch((err) => {
    console.error("CRM pipeline seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
