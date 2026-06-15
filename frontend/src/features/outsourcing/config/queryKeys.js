export const outsourcingKeys = {
  all: ['outsourcing'],
  dashboard: (role) => ['outsourcing', 'dashboard', role],
  jobs: (filters = {}) => ['outsourcing', 'jobs', filters],
  contracts: () => ['outsourcing', 'contracts'],
  timeLogs: () => ['outsourcing', 'timeLogs'],
  profile: () => ['outsourcing', 'profile'],
  payments: () => ['outsourcing', 'payments'],
  notifications: () => ['outsourcing', 'notifications'],
  invoices: () => ['outsourcing', 'invoices'],
  analytics: () => ['outsourcing', 'analytics'],
  workflow: () => ['outsourcing', 'workflow'],
  sessions: () => ['outsourcing', 'sessions'],
};
