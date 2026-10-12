'use strict';

// The API owns the available workflow stages. Labels are presentation, IDs are persisted.
const stages = [
  ['LEAD_IDENTIFIED', 'Lead Identified', 'Contact the school'],
  ['EMAIL_SENT', 'Email Sent', 'Await or follow up on a reply'],
  ['REPLY_RECEIVED', 'Reply Received', 'Assign the sales team'],
  ['SALES_ASSIGNED', 'Sales Team Assigned', 'Arrange a sales visit'],
  ['SALES_VISITED', 'Sales Team Visited', 'Request a meeting'],
  ['MEETING_REQUESTED', 'Meeting Requested', 'Confirm a meeting'],
  ['MEETING_FIXED', 'Meeting Fixed', 'Conduct the meeting'],
  ['MEETING_COMPLETED', 'Meeting Completed', 'Prepare a proposal or demo'],
  ['PROPOSAL_DEMO', 'Proposal / Demo', 'Follow up on the proposal'],
  ['FOLLOW_UP', 'Follow-up', 'Agree the next action'],
  ['NEGOTIATION', 'Negotiation', 'Agree terms'],
  ['WON', 'Converted / Won', 'Begin onboarding'],
  ['NOT_INTERESTED', 'Not Interested', 'Review the recorded outcome'],
  ['LOST', 'Lost', 'Review the recorded outcome'],
  ['ON_HOLD', 'On Hold', 'Review when outreach can resume'],
].map(([id, label, nextStep], index) => ({
  id, label, nextStep, order: index,
  branch: ['NOT_INTERESTED', 'LOST', 'ON_HOLD'].includes(id),
  tone: ['NOT_INTERESTED', 'LOST'].includes(id) ? 'negative' : ['FOLLOW_UP', 'ON_HOLD'].includes(id) ? 'attention' : id === 'WON' ? 'success' : 'active',
}));

module.exports = { stages, stageIds: stages.map(stage => stage.id) };
