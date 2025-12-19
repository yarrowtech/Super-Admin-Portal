const dashboard = {
  greeting: 'Alex',
  stats: [
    { label: 'Active Projects', value: 8, meta: '2 launching this week', delta: '+2.4%' },
    { label: 'My Tasks', value: 27, meta: '6 due today', delta: '-3 pending' },
    { label: 'Unread Updates', value: 12, meta: 'Standup by 9:30 AM', delta: '3 urgent' },
    { label: 'Focus Hours', value: '18h', meta: 'Booked this sprint', delta: '+4h planned' },
  ],
  sprint: {
    name: 'Sprint 42',
    progress: 68,
  },
  schedule: [
    { time: '08:45', title: 'Design stand-up', meta: 'Huddle room / Meet', badge: 'Live now' },
    { time: '11:30', title: 'Sprint review prep', meta: 'Slides + talking points', badge: 'Priority' },
    { time: '15:00', title: 'Client sync', meta: 'Product Alpha', badge: 'Share demo' },
  ],
  documents: [
    { name: 'Sprint board', type: 'Miro', size: '2.4 MB' },
    { name: 'Release notes', type: 'Docs', size: '860 KB' },
    { name: 'Standup clips', type: 'Drive', size: '1.9 GB' },
  ],
};

const projects = {
  board: [
    {
      id: 'backlog',
      title: 'Backlog',
      cards: [
        { id: 'card-bl-1', title: 'Admin analytics IA', tag: 'Discovery', owners: ['UX', 'PM'], attachments: 3, comments: 4 },
        { id: 'card-bl-2', title: 'Notification rules matrix', tag: 'Customer success', owners: ['PM'], attachments: 1, comments: 2 },
      ],
    },
    {
      id: 'progress',
      title: 'In Progress',
      cards: [
        { id: 'card-ip-1', title: 'Billing workflow copy', tag: 'Marketing', owners: ['COPY', 'LEGAL'], attachments: 0, comments: 6 },
        { id: 'card-ip-2', title: 'Mobile nav polish', tag: 'Engineering', owners: ['ENG'], attachments: 2, comments: 1 },
        { id: 'card-ip-3', title: 'New user onboarding', tag: 'Design', owners: ['UX'], attachments: 5, comments: 9 },
      ],
    },
    {
      id: 'review',
      title: 'Review',
      cards: [
        { id: 'card-r-1', title: 'OKR dashboard QA', tag: 'QA', owners: ['QA', 'ENG'], attachments: 4, comments: 3 },
        { id: 'card-r-2', title: 'Security banner', tag: 'Infra', owners: ['ENG'], attachments: 1, comments: 0 },
      ],
    },
    {
      id: 'done',
      title: 'Done',
      cards: [
        { id: 'card-d-1', title: 'Ops automation pilot', tag: 'Automation', owners: ['OPS'], attachments: 2, comments: 2 },
        { id: 'card-d-2', title: 'Contract templates', tag: 'Legal', owners: ['LEGAL'], attachments: 6, comments: 5 },
      ],
    },
  ],
};

const tasks = {
  today: [
    { id: 'task-hero-motion', title: 'Hero section motion', tag: 'Design system', due: '10:30 AM', priority: 'High' },
    { id: 'task-analytics-export', title: 'Usage analytics export', tag: 'Product Insights', due: '4:00 PM', priority: 'Medium' },
  ],
  upcoming: [
    { id: 'task-qa-handoff', title: 'QA handoff checklist', tag: 'Release train', due: 'Tomorrow', priority: 'High' },
    { id: 'task-prototype-narration', title: 'Prototype narration', tag: 'Townhall', due: 'Friday', priority: 'Low' },
  ],
  blocked: [
    { id: 'task-billing-copy', title: 'Billing workflow copy', tag: 'Legal review', due: 'Awaiting', priority: 'Need help' },
  ],
};

const documents = {
  folders: [
    { id: 'all', name: 'All files', count: 248 },
    { id: 'shared', name: 'Shared with me', count: 42 },
    { id: 'approvals', name: 'Approvals', count: 18 },
    { id: 'archives', name: 'Archives', count: 64 },
  ],
  items: [
    { id: 'doc-release-checklist', name: 'Release checklist v4', owner: 'Alex', size: '2.1 MB', updated: 'Today', status: 'High' },
    { id: 'doc-sprint-retro', name: 'Sprint retro deck', owner: 'Priya', size: '6.4 MB', updated: 'Yesterday', status: 'Review' },
    { id: 'doc-contract-templates', name: 'Contract templates', owner: 'Legal', size: '1.8 MB', updated: 'Oct 28', status: 'Approved' },
    { id: 'doc-automation-brief', name: 'Automation brief', owner: 'Ops', size: '820 KB', updated: 'Oct 27', status: 'Draft' },
  ],
  storage: {
    used: 15,
    capacity: 20,
  },
};

const team = [
  { id: 'member-sarah', name: 'Sarah Jenkins', role: 'Senior Product Designer', status: 'Available', team: 'Design', location: 'Toronto' },
  { id: 'member-michael', name: 'Michael Chen', role: 'Engineering Manager', status: 'Away', team: 'Engineering', location: 'Vancouver' },
  { id: 'member-lena', name: 'Lena Patel', role: 'Product Operations', status: 'In focus', team: 'Product', location: 'Remote' },
  { id: 'member-mateo', name: 'Mateo Silva', role: 'QA Lead', status: 'Available', team: 'Engineering', location: 'São Paulo' },
];

const chat = {
  threads: [
    { id: 'daily', name: 'Daily Standup', meta: 'Product Alpha · 8 members', badge: 'Live', unread: 2 },
    { id: 'design', name: 'Design System', meta: 'Hand-off · 5 members', badge: 'Review', unread: 0 },
    { id: 'support', name: 'Customer Insights', meta: 'Support pod', badge: null, unread: 4 },
    { id: 'ops', name: 'Ops Automation', meta: 'Workflow · 6 members', badge: 'New', unread: 0 },
  ],
  messages: {
    daily: [
      { id: 'msg-1', from: 'Sarah', text: 'Prototype build exported — ready for QA review.', time: '09:10' },
      { id: 'msg-2', from: 'Michael', text: 'Love it. Shipping logs look healthy — shipping build queued.', time: '09:13' },
      { id: 'msg-3', from: 'You', text: 'I’ll record motion notes before noon.', time: '09:16', me: true },
    ],
    design: [{ id: 'msg-4', from: 'Priya', text: 'Typography tokens merged on `main`.', time: 'Yesterday' }],
    support: [{ id: 'msg-5', from: 'Trent', text: 'Customer asked for the dark-mode toggle ETA.', time: '08:45' }],
    ops: [{ id: 'msg-6', from: 'Ops Bot', text: 'Automation pilot retro tomorrow.', time: 'Monday' }],
  },
};

module.exports = {
  dashboard,
  projects,
  tasks,
  documents,
  team,
  chat,
};
