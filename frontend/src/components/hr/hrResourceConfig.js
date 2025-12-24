const hrResourceConfig = {
  employees: {
    title: 'Employee Management',
    description: 'Create and manage employee profiles and status.',
    endpoint: '/api/dept/hr/employees',
    allowDelete: false,
    allowDelete: false,
    formFields: [
      { name: 'email', label: 'Email', type: 'text', required: true, hideOnEdit: true },
      { name: 'password', label: 'Password', type: 'text', required: true, hideOnEdit: true },
      { name: 'role', label: 'Role', type: 'text', required: true },
      { name: 'firstName', label: 'First Name', type: 'text', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'isActive', label: 'Active', type: 'checkbox' }
    ],
    columns: [
      { label: 'Name', path: 'firstName' },
      { label: 'Last Name', path: 'lastName' },
      { label: 'Email', path: 'email' },
      { label: 'Role', path: 'role' },
      { label: 'Department', path: 'department' },
      { label: 'Active', path: 'isActive' }
    ]
  },
  departments: {
    title: 'Departments',
    description: 'Manage departments and mapping.',
    endpoint: '/api/dept/hr/departments',
    formFields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'isActive', label: 'Active', type: 'checkbox' }
    ],
    columns: [
      { label: 'Name', path: 'name' },
      { label: 'Code', path: 'code' },
      { label: 'Active', path: 'isActive' }
    ]
  },
  designations: {
    title: 'Designations',
    description: 'Manage designations and levels.',
    endpoint: '/api/dept/hr/designations',
    formFields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'level', label: 'Level', type: 'number' },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'isActive', label: 'Active', type: 'checkbox' }
    ],
    columns: [
      { label: 'Name', path: 'name' },
      { label: 'Level', path: 'level' },
      { label: 'Department', path: 'department' },
      { label: 'Active', path: 'isActive' }
    ]
  },
  'employee-documents': {
    title: 'Employee Documents',
    description: 'Upload and track employee documents.',
    endpoint: '/api/dept/hr/employee-documents',
    formFields: [
      { name: 'employee', label: 'Employee ID', type: 'text', required: true },
      { name: 'documentType', label: 'Document Type', type: 'text', required: true },
      { name: 'fileUrl', label: 'File URL', type: 'text', required: true },
      { name: 'issuedDate', label: 'Issued Date', type: 'date' },
      { name: 'expiryDate', label: 'Expiry Date', type: 'date' },
      { name: 'notes', label: 'Notes', type: 'text' }
    ],
    columns: [
      { label: 'Employee', path: 'employee.email' },
      { label: 'Type', path: 'documentType' },
      { label: 'Issued', path: 'issuedDate' },
      { label: 'Expiry', path: 'expiryDate' }
    ]
  },
  biometrics: {
    title: 'Biometric Enrollment',
    description: 'Track employee ID/bio enrollment.',
    endpoint: '/api/dept/hr/biometrics',
    formFields: [
      { name: 'employee', label: 'Employee ID', type: 'text', required: true },
      { name: 'enrollmentId', label: 'Enrollment ID', type: 'text', required: true },
      { name: 'device', label: 'Device', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'revoked'] }
    ],
    columns: [
      { label: 'Employee', path: 'employee.email' },
      { label: 'Enrollment ID', path: 'enrollmentId' },
      { label: 'Status', path: 'status' }
    ]
  },
  'leave-policies': {
    title: 'Leave Policies',
    description: 'Configure leave policies.',
    endpoint: '/api/dept/hr/leave-policies',
    formFields: [
      { name: 'name', label: 'Policy Name', type: 'text', required: true },
      { name: 'leaveType', label: 'Leave Type', type: 'text', required: true },
      { name: 'daysPerYear', label: 'Days/Year', type: 'number', required: true },
      { name: 'carryForward', label: 'Carry Forward', type: 'checkbox' },
      { name: 'maxCarryForward', label: 'Max Carry Forward', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
      { name: 'description', label: 'Description', type: 'text' }
    ],
    columns: [
      { label: 'Name', path: 'name' },
      { label: 'Type', path: 'leaveType' },
      { label: 'Days', path: 'daysPerYear' },
      { label: 'Active', path: 'isActive' }
    ]
  },
  holidays: {
    title: 'Holiday Calendar',
    description: 'Manage holidays.',
    endpoint: '/api/dept/hr/holidays',
    formFields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'isOptional', label: 'Optional', type: 'checkbox' }
    ],
    columns: [
      { label: 'Name', path: 'name' },
      { label: 'Date', path: 'date' },
      { label: 'Department', path: 'department' }
    ]
  },
  jobs: {
    title: 'Job Posts',
    description: 'Create and manage job postings.',
    endpoint: '/api/dept/hr/jobs',
    formFields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'department', label: 'Department', type: 'text', required: true },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'employmentType', label: 'Type', type: 'select', options: ['full-time', 'part-time', 'contract', 'intern'] },
      { name: 'status', label: 'Status', type: 'select', options: ['draft', 'open', 'closed'] },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'postedDate', label: 'Posted Date', type: 'date' },
      { name: 'closingDate', label: 'Closing Date', type: 'date' }
    ],
    columns: [
      { label: 'Title', path: 'title' },
      { label: 'Department', path: 'department' },
      { label: 'Status', path: 'status' }
    ]
  },
  interviews: {
    title: 'Interview Scheduling',
    description: 'Schedule and track interviews.',
    endpoint: '/api/dept/hr/interviews',
    formFields: [
      { name: 'applicant', label: 'Applicant ID', type: 'text', required: true },
      { name: 'stage', label: 'Stage', type: 'text', required: true },
      { name: 'scheduledAt', label: 'Scheduled At', type: 'datetime-local', required: true },
      { name: 'mode', label: 'Mode', type: 'select', options: ['in-person', 'virtual', 'phone'] },
      { name: 'panel', label: 'Panel (User IDs)', type: 'list' },
      { name: 'status', label: 'Status', type: 'select', options: ['scheduled', 'completed', 'cancelled'] },
      { name: 'notes', label: 'Notes', type: 'text' }
    ],
    columns: [
      { label: 'Applicant', path: 'applicant.email' },
      { label: 'Stage', path: 'stage' },
      { label: 'Scheduled', path: 'scheduledAt' },
      { label: 'Status', path: 'status' }
    ]
  },
  offers: {
    title: 'Offers',
    description: 'Manage offers and acceptance.',
    endpoint: '/api/dept/hr/offers',
    formFields: [
      { name: 'applicant', label: 'Applicant ID', type: 'text', required: true },
      { name: 'position', label: 'Position', type: 'text', required: true },
      { name: 'salary', label: 'Salary', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['draft', 'issued', 'accepted', 'declined', 'withdrawn'] },
      { name: 'issuedAt', label: 'Issued At', type: 'date' },
      { name: 'acceptedAt', label: 'Accepted At', type: 'date' },
      { name: 'notes', label: 'Notes', type: 'text' }
    ],
    columns: [
      { label: 'Applicant', path: 'applicant.email' },
      { label: 'Position', path: 'position' },
      { label: 'Status', path: 'status' }
    ]
  },
  'appraisal-cycles': {
    title: 'Appraisal Cycles',
    description: 'Track appraisal cycles.',
    endpoint: '/api/dept/hr/appraisal-cycles',
    formFields: [
      { name: 'name', label: 'Cycle Name', type: 'text', required: true },
      { name: 'startDate', label: 'Start Date', type: 'date', required: true },
      { name: 'endDate', label: 'End Date', type: 'date', required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['planned', 'active', 'closed'] }
    ],
    columns: [
      { label: 'Name', path: 'name' },
      { label: 'Start', path: 'startDate' },
      { label: 'End', path: 'endDate' },
      { label: 'Status', path: 'status' }
    ]
  },
  appraisals: {
    title: 'Appraisal Reviews',
    description: 'Manage appraisal reviews.',
    endpoint: '/api/dept/hr/appraisals',
    formFields: [
      { name: 'employee', label: 'Employee ID', type: 'text', required: true },
      { name: 'cycle', label: 'Cycle ID', type: 'text', required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['draft', 'submitted', 'finalized'] },
      { name: 'summary', label: 'Summary', type: 'text' },
      { name: 'scores', label: 'Scores (JSON)', type: 'json' }
    ],
    columns: [
      { label: 'Employee', path: 'employee.email' },
      { label: 'Cycle', path: 'cycle.name' },
      { label: 'Status', path: 'status' }
    ]
  },
  policies: {
    title: 'Policies & Handbook',
    description: 'Publish HR policies.',
    endpoint: '/api/dept/hr/policies',
    formFields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'fileUrl', label: 'File URL', type: 'text', required: true },
      { name: 'version', label: 'Version', type: 'text' },
      { name: 'isActive', label: 'Active', type: 'checkbox' }
    ],
    columns: [
      { label: 'Title', path: 'title' },
      { label: 'Category', path: 'category' },
      { label: 'Active', path: 'isActive' }
    ]
  },
  'policy-acknowledgements': {
    title: 'Policy Acknowledgements',
    description: 'Track policy acknowledgements.',
    endpoint: '/api/dept/hr/policy-acknowledgements',
    formFields: [
      { name: 'policy', label: 'Policy ID', type: 'text', required: true },
      { name: 'employee', label: 'Employee ID', type: 'text', required: true },
      { name: 'acknowledgedAt', label: 'Acknowledged At', type: 'date' }
    ],
    columns: [
      { label: 'Policy', path: 'policy.title' },
      { label: 'Employee', path: 'employee.email' },
      { label: 'Acknowledged', path: 'acknowledgedAt' }
    ]
  },
  'support-tickets': {
    title: 'Employee Queries & Tickets',
    description: 'Manage employee tickets and queries.',
    endpoint: '/api/dept/hr/support-tickets',
    allowDelete: false,
    formFields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['hardware', 'software', 'network', 'access', 'email', 'application', 'other'] },
      { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
      { name: 'status', label: 'Status', type: 'select', options: ['open', 'in-progress', 'waiting', 'resolved', 'closed', 'cancelled'] },
      { name: 'requester', label: 'Requester ID', type: 'text', required: true },
      { name: 'assignedTo', label: 'Assigned To ID', type: 'text' },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'solution', label: 'Solution', type: 'text' }
    ],
    columns: [
      { label: 'Title', path: 'title' },
      { label: 'Priority', path: 'priority' },
      { label: 'Status', path: 'status' }
    ]
  },
  'exit-interviews': {
    title: 'Exit Interviews',
    description: 'Manage exit interviews.',
    endpoint: '/api/dept/hr/exit-interviews',
    formFields: [
      { name: 'employee', label: 'Employee ID', type: 'text', required: true },
      { name: 'interviewDate', label: 'Interview Date', type: 'date', required: true },
      { name: 'reasonForLeaving', label: 'Reason for Leaving', type: 'text' },
      { name: 'feedback', label: 'Feedback', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['scheduled', 'completed', 'cancelled'] }
    ],
    columns: [
      { label: 'Employee', path: 'employee.email' },
      { label: 'Date', path: 'interviewDate' },
      { label: 'Status', path: 'status' }
    ]
  }
};

export default hrResourceConfig;
