// Project-specific Privacy Policy content for the Law Portal's Policy
// Overview panel. Each project gets its own real data-collection/usage
// content instead of one generic template shown under every project name —
// showing another project's specifics under the wrong name would be
// misleading, so any project without confirmed content below falls back to
// an honest "not yet configured" placeholder rather than borrowed text.
const NOT_CONFIGURED_SECTIONS = [];

const PROJECT_PRIVACY_SECTIONS = {
  efnbmms: [
    {
      title: 'Information We Collect',
      points: [
        'Account & Authentication Data: Name, email address, phone/mobile number, username, authentication information, employee ID, vendor ID, user role, account status, login attempts, password-reset and OTP information.',
        'Restaurant & Business Data: Restaurant/business name, restaurant code, address, phone number, GST/tax information, restaurant type, billing configuration, billing templates, invoice numbering, business preferences and integration settings.',
        'Employee & Staff Data: Employee name, employee ID, contact details, role/designation, branch or restaurant assignment, attendance, check-in/check-out records and work-related activity.',
        'Menu & Kitchen Data: Menu item name, item code, description, price, category/cuisine, course type, ingredients, kitchen section and availability status.',
        'Table & Order Data: Table number, capacity, table status, order type, ordered items, quantities, customizations, special instructions, waiter/chef assignment, order status, KOT information and table-transfer history.',
        'Billing & Transaction Data: Bill/invoice number, items, quantities, prices, GST/taxes, service charges, packaging charges, discounts, payment method, payment status, complimentary items and receipt information.',
        'Customer Data: Customer name, phone number, email address and other customer information provided through the platform or during transactions.',
        'Inventory & Stock Data: Item names, categories, units, quantities, stock thresholds, unit costs, stock-in/out records, adjustments, approvals, rejections, transfers and stock-movement history.',
        'Vendor & Supplier Data: Vendor name, vendor ID, contact details, vendor type, products, pricing, purchase orders, vendor bills, settlement information, payment cycles and vendor-related records.',
        'Subscription & Payment Data: Subscription plan, subscription status, billing cycle, subscription dates, payment status, transaction/order references and payment-related information.',
        'Communication & Support Data: Contact-form details, inquiries, support requests, feedback, messages, internal notes, notification information and support history.',
        'Analytics, Activity & Audit Data: Login/logout records, sessions, actions performed, audit logs, error logs, timestamps and security events.',
        'Technical & Device Data: IP address, browser type, operating system, device information, application/browser version, access timestamps and connection information.',
        'AI & Machine Learning Data: Relevant restaurant, menu, order, sales, inventory, purchasing, vendor, billing, business-performance data, reports and user-provided AI queries or prompts.',
        'Legal & Compliance Data: Business, transaction, billing, tax, accounting, contractual, security and other legally or commercially necessary records.',
      ],
    },
    {
      title: 'How We Use Your Information',
      points: [
        'Create and manage accounts, authenticate users and provide role-based access.',
        'Operate restaurant/business profiles, menus, tables, orders and kitchen workflows.',
        'Generate bills and invoices, calculate taxes and charges, process payments and maintain transaction histories.',
        'Manage employees, customers, inventory, vendors, purchasing and subscriptions.',
        'Generate reports, analytics, dashboards and business insights.',
        'Provide AI/ML-powered business insights, forecasting, recommendations and intelligent assistance.',
        'Provide customer and technical support and service-related communications.',
        'Maintain audit trails, detect suspicious activity and improve platform security and reliability.',
        'Meet applicable legal, regulatory, tax, accounting and contractual obligations.',
      ],
    },
    {
      title: 'Data Sharing',
      points: [
        'Information may be processed by service providers supporting hosting, infrastructure, payment processing, communications, analytics, security, monitoring and AI/ML functionality.',
        'Payment information may be processed directly by applicable third-party payment providers.',
        'Third-party processing is subject to applicable contractual, security and privacy requirements.',
      ],
    },
    {
      title: 'Data Security',
      points: [
        'Maintain account authentication and role-based access controls.',
        'Maintain audit trails, activity logs and security-event records.',
        'Monitor for unauthorized or suspicious activity.',
        'Use appropriate contractual, security and privacy requirements when third-party providers process information.',
      ],
    },
    {
      title: 'Your Rights',
      points: [
        'Relevant information may be exported or recovered before deletion where applicable and technically available.',
        'Following account or service termination, information is handled according to applicable retention and deletion procedures.',
        'Information may be deleted, anonymized, aggregated or retained where required for legal, regulatory, accounting, security or dispute-resolution purposes.',
      ],
    },
  ],

  edifyeight: [
    {
      title: 'Information We Collect',
      points: [
        'Curriculum & Lesson Structure: Subject, grade, chapter, specific concept, prerequisite topics and teaching language.',
        'Lesson & Activity Data: Lesson, video, worksheet and quiz topics, difficulty, reading level, content source, review/approval status and model-training permissions.',
        'Questions & Quizzes: Topic tested, difficulty, correct answer/grading guide, common wrong answers, related misunderstandings and whether the student previously saw the question.',
        'Student Activity: Lessons opened, questions answered, hints requested, solutions viewed, recommendations received and whether recommendations were opened or ignored.',
        'Answers & Results: Student answers, correctness, completion time, hints used, practice/test status, grading source and teacher corrections.',
        'Learning Outcome Data: Checks before, immediately after and later following a lesson or recommendation, together with teacher assessment of effectiveness.',
        'AI Tutor Conversations: Topic, language, student message, tutor response, source material, safety-check result and applicable student/teacher feedback.',
        'Search & Source Matching Data: Information about source material retrieved by the AI tutor and whether it was appropriate and correctly used.',
        'Teacher Review Data: Teacher ratings, corrections and explanations regarding AI scores, answers or recommendations.',
        'Accessibility Data: Language preferences and accessibility information where necessary, lawful and approved.',
      ],
    },
    {
      title: 'How We Use Your Information',
      points: [
        'Understand student mastery of individual topics.',
        'Identify misunderstandings and missing prerequisite knowledge.',
        'Recommend appropriate lessons, activities and practice questions.',
        'Adjust explanations, pacing and difficulty to individual learning needs.',
        'Evaluate whether lessons, recommendations and AI/teacher assistance improve learning.',
        'Improve AI tutor response quality and source-material matching.',
        'Support reading and writing practice.',
        'Provide teachers with reviewable information while keeping important decisions subject to human oversight.',
      ],
    },
    {
      title: 'Data Sharing',
      points: [
        'Full AI tutor conversations are kept separately with restricted access.',
        'Information intended for model improvement should use reviewed data with identifying information removed.',
        'Student information should not be used without appropriate approval and safeguards.',
        'Training permissions are treated separately from permission to display educational content to students.',
      ],
    },
    {
      title: 'Data Security',
      points: [
        'Replace identifying names with anonymous codes before information is used to build or improve models.',
        'Encrypt sensitive information and restrict access.',
        'Screen conversations for names, phone numbers and other private information before wider use.',
        'Require human review for high-impact decisions.',
        'Conduct privacy, child-safety and legal review before production-model training.',
      ],
    },
    {
      title: 'Your Rights',
      points: [
        'Maintain records showing what data was approved, for what purpose and whether approval can be withdrawn.',
        'Honor deletion requests wherever the relevant information is stored.',
        'Keep important AI-generated decisions reviewable and overridable by teachers.',
        'Do not use private information for model building where it is prohibited by the defined safeguards.',
      ],
    },
  ],

  'better pass': [
    {
      title: 'Information We Collect',
      points: [
        'Device Location: Physical device location, city, country, latitude and longitude.',
        'Account Information: Name, email, phone number, password/authentication account ID.',
        'Profile Information: Bio, profile image, cover image, website, city and country.',
        'User Role: Tourist, tour company, instructor, guide, local guide, admin or marketing.',
        'Usage Data: Session duration, device/browser information, pages visited and features used.',
        'Favorites & Follow Data: Saved listings, followed providers and follower records.',
        'Route History: Start point, destination, stops, waypoints, recommended places, route path, travel mode, distance, duration and visited status.',
        'Booking Data: Listing booked, booking date, number of people, price, booking status, provider and traveler.',
        'Payment & Refund Data: Razorpay order/payment identifiers, payment status, currency, paid time, refund reason, refund status and refund references.',
        'Provider Payout Data: Payout status, amount, platform fee, payout reference, payout errors, beneficiary information, UPI ID, bank-account reference and IFSC.',
        'Listing Data: Title, description, location, category, type, price, start date, status and listing media.',
        'Communication Data: Messages, notifications and contact-form submissions.',
        'CRM Data: Lead status, notes, assignment information and conversion indicators.',
        'Verification Data: Government ID references, provider identity documents, company registration, registration number, license number, certificates and verification status.',
        'Moderation Data: Approval/rejection actions, reasons, responsible actor and related metadata.',
        'Advertisement Data: Listing/ad ID, plan, amount, duration, dates and payment status.',
        'Local Storage & Draft Data: Signup drafts, listing drafts, pending booking confirmations, dashboard settings and theme.',
      ],
    },
    {
      title: 'How We Use Your Information',
      points: [
        'Provide maps, navigation, route planning and nearby activity features.',
        'Create and secure accounts and provide role-based access.',
        'Manage bookings, booking history and trip coordination.',
        'Process and verify payments, refunds and provider payouts.',
        'Publish, search, filter, review and moderate travel listings.',
        'Enable communication between travelers and providers.',
        'Manage customer inquiries, CRM leads and follow-up activities.',
        'Verify provider identities, companies, qualifications and licenses.',
        'Manage paid promotions and boosted listings.',
        'Preserve drafts, preferences and user progress.',
      ],
    },
    {
      title: 'Data Sharing',
      points: [
        'Payment information may be processed through Razorpay/payment infrastructure.',
        'Location information is used for location-dependent services where permission is provided.',
        'Verification information may be used within applicable identity, provider and compliance workflows.',
        'Information is made available to relevant platform roles where necessary to provide bookings, communication and services.',
      ],
    },
    {
      title: 'Data Security',
      points: [
        'Authentication information is used for login, account recovery and account security.',
        'Payment identifiers and signatures are used to verify transactions and prevent fraud.',
        'Verification records support provider/account trust and approval workflows.',
        'Moderation records maintain an audit trail of approval and rejection actions.',
      ],
    },
    {
      title: 'Your Rights',
      points: [
        'Users can manage relevant account and profile information.',
        'Device location is used for applicable services where permission is provided.',
        'Users can manage saved listings, routes and other user-controlled platform information through supported functionality.',
        'Personal information should only be processed for the purposes associated with the applicable platform feature.',
      ],
    },
  ],

  esportsm: [
    {
      title: 'Information We Collect',
      points: [
        'Player Identity: Player ID, name, age/date of birth, nationality, position and preferred foot.',
        'Player Profile: Height, weight, body composition and role/position.',
        'Match Data: Match ID, date, opponent, competition, result, minutes played and starter/substitute status.',
        'Match Events: Goals, assists, shots, passes, tackles, interceptions, key passes, progressive passes and defensive actions.',
        'Player Ratings: Match, coach and analyst ratings.',
        'Training Data: Session date, drill, drill score, duration, intensity, workload and attendance/compliance.',
        'Position & Tracking Data: Player position, positional role, position changes, X/Y position, timestamps and movement trajectories.',
        'Tactical Data: Heatmaps, passing networks, pressing actions, ball progression, defensive actions, attacking data, formations, tactical systems and transitions.',
        'Physical Data: Training intensity, workload, high-intensity exposure, distance, sprinting and acceleration/deceleration.',
        'Recovery & Wearable Data: Recovery score, sleep, rest, recovery trends, heart rate and recovery metrics.',
        'Health Data: Injury history, injury status, active/injured status and medical flags.',
        'Travel & Schedule Data: Travel duration/frequency/fatigue, match dates, match density and days between matches.',
        'Coach & Skill Data: Coach assessments, priorities, technical/physical test results and drill scores.',
        'Development Data: Target skills, development goals and historical skill scores.',
        'Squad & Club Data: Squad composition, player availability, positional shortages, club profile, league level and tactical preferences.',
        'Recruitment Data: Budget constraints, player cost/transfer value, geographic constraints, availability, recruitment status, market value and demand/interest.',
      ],
    },
    {
      title: 'How We Use Your Information',
      points: [
        'Evaluate player skill and performance.',
        'Support training and player-development analysis.',
        'Analyze tactical performance and positional behavior.',
        'Evaluate physical workload, recovery and readiness.',
        'Support injury/readiness-related models.',
        'Analyze match and opponent information for performance prediction.',
        'Support squad planning and player recruitment.',
        'Create unified player-analysis and recruitment information.',
      ],
    },
    {
      title: 'Data Sharing',
      points: [
        'The supplied document identifies which internal model/function uses each data category, including skill, tactical, performance, prediction, readiness, injury, training, progress and recruitment functions.',
        'The supplied document does not define detailed external third-party sharing rules. These should not be invented.',
      ],
    },
    {
      title: 'Data Security',
      points: [
        'The supplied ESPORTSM document does not define specific encryption, access-control, retention or infrastructure-security rules.',
        'Security controls should therefore come from the approved ESPORTSM privacy/security policy rather than being invented from this data-collection document.',
      ],
    },
    {
      title: 'Your Rights',
      points: [
        'The supplied ESPORTSM document does not specify detailed access, correction, deletion, portability or consent-withdrawal rights.',
        'These rights should be populated only after the corresponding approved privacy/legal policy is available.',
      ],
    },
  ],

  // MateBid content is sourced only from "Data Collection (Investor &
  // Fundraiser).pdf". Keep this entry isolated from every other project.
  matebid: [
    {
      key: 'information-we-collect',
      title: 'Information We Collect',
      items: [
        { title: 'Investor Data', description: 'Name, email, phone number, investment amount, transaction history, PAN card, Aadhaar / ID proof, and address proof.' },
        { title: 'Fundraiser Data', description: 'Name, contact details, company name, business type, industry category, project description, funding goal, timeline, bank account details, IFSC code, PAN card, Aadhaar / ID proof, and address proof.' },
        { title: 'Individual Documents', description: 'PAN Card, Aadhaar Card / Passport, address proof, and bank account details.' },
        { title: 'Company / Business Documents', description: 'Certificate of Incorporation, GST Certificate, Business License, Company PAN, Director/Owner KYC, and bank account details.' },
        { title: 'Transaction Data', description: 'Payment ID, transaction status, timestamps, failed transactions, refunds, and payment verification information.' },
      ],
    },
    {
      key: 'how-we-use-your-information',
      title: 'How We Use Your Information',
      items: [
        { title: 'Payment Processing', description: 'Process secure financial transactions between investors and fundraisers through integrated payment gateways.' },
        { title: 'Transaction Management', description: 'Record investments and maintain transaction details such as payment ID, status, timestamps, failed transactions, and refunds for traceability and transparency.' },
        { title: 'Platform Fee Processing', description: 'Calculate and deduct the applicable platform fee from successful investments before allocating the remaining amount to the fundraiser.' },
        { title: 'Identity Verification', description: 'Use individual documents for identity verification and fraud prevention.' },
        { title: 'Business Verification', description: 'Use company and business documents to verify business legitimacy, support legal compliance, and improve investor trust.' },
        { title: 'Document Verification', description: 'Admins review uploaded documents, cross-check details, validate consistency across documents, and approve or reject submissions.' },
        { title: 'Fraud & Risk Control', description: 'Monitor unusual transaction patterns, duplicate accounts, fake campaigns, and suspicious funding spikes.' },
        { title: 'Marketing & Communication', description: 'Use automated communication for registration confirmations, investment confirmations, campaign updates, promotional campaigns, and transaction alerts.' },
      ],
    },
    {
      key: 'data-sharing',
      title: 'Data Sharing',
      items: [
        { title: 'Payment Gateways', description: 'Data may be shared with payment gateways where required for payment processing.' },
        { title: 'Verification Services', description: 'Data may be shared with verification services where required for identity, KYC, document, or business verification.' },
        { title: 'Legal Authorities', description: 'Data may be shared with legal authorities where required.' },
      ],
    },
    {
      key: 'data-security',
      title: 'Data Security',
      items: [
        { title: 'Encryption', description: 'Sensitive data is encrypted during storage and transmission.' },
        { title: 'Password Security', description: 'Passwords are hashed using secure algorithms.' },
        { title: 'Payment Data Protection', description: 'Payment details are not stored directly by the platform and are handled by the payment gateway.' },
        { title: 'Authentication', description: 'JWT-based authentication is used.' },
        { title: 'Role-Based Access', description: 'Role-based access control is used for Investor, Fundraiser, and Admin roles.' },
        { title: 'Activity Monitoring', description: 'Activity logging and monitoring are used as security features.' },
        { title: 'Manual Verification', description: 'Admins check identity documents, verify business registration, confirm campaign authenticity, and approve or reject users or campaigns.' },
      ],
    },
    {
      key: 'your-rights',
      title: 'Your Rights',
      items: [
        { title: 'Update Profile Information', description: 'Users can update their profile information.' },
        { title: 'Request Data Deletion', description: 'Users can request deletion of their data.' },
        { title: 'Communication Preferences', description: 'Users can control their communication preferences.' },
      ],
    },
  ],

  ehc: NOT_CONFIGURED_SECTIONS,
  erms: NOT_CONFIGURED_SECTIONS,
};

// Resolves the Policy Overview sections for a given project name (case-
// insensitive). Falls back to the honest "not configured" placeholder for
// any project without confirmed source content — never borrows another
// project's specifics.
export const resolvePrivacySections = (projectName) => {
  const key = String(projectName || '').trim().toLowerCase();
  return PROJECT_PRIVACY_SECTIONS[key] || NOT_CONFIGURED_SECTIONS;
};

export { NOT_CONFIGURED_SECTIONS };
