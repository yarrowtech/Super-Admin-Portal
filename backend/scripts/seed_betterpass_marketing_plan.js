require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const Project = require('../models/common/Project');
const { upsertPlanByProject } = require('../modules/media/marketingPlan.service');

const normalizeKey = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

const PLAN_PAYLOAD = {
  overview: {
    industry: 'Travel / Hospitality / SaaS',
    platform: 'Digital Pass & Unlocking Ecosystem',
    targetAudience: 'Travelers, Hotels, Resorts, Co-working Spaces, Local Guides, Activity Providers',
    usp: 'One Pass. Multiple Stays. Seamless Access.',
    currentPhase: 'Foundation / Growth / Scaling',
    overallStatus: 'On Track',
  },
  goals: {
    brand: [
      "Position The Better Pass as India's trusted digital travel marketplace.",
      'Connect travelers with verified partners and authentic local experiences.',
    ],
    marketing: [
      'Build strong brand awareness across digital platforms.',
      'Increase traveler registrations & pass purchases.',
      'Onboard verified vendors & build strong partnerships.',
      'Promote local tourism and unique experiences.',
      'Improve user engagement and repeat bookings.',
    ],
    business: [
      'Grow marketplace transactions and revenue.',
      'Expand into multiple cities and tourist destinations.',
      'Build recurring revenue through memberships and partner services.',
      'Develop long-term customer loyalty.',
    ],
  },
  framework: [
    {
      phase: 'Foundation Kit',
      whenUsed: 'Before Launch',
      mainFocus: ['Branding & Positioning', 'Digital Assets', 'Marketplace Setup', 'Tracking Setup'],
      keyOutput: 'Platform ready for market launch',
    },
    {
      phase: 'Growth Kit',
      whenUsed: 'Active Marketing',
      mainFocus: ['Lead Generation', 'Content Marketing', 'Paid Advertising', 'CRM & Follow-up', 'Retargeting'],
      keyOutput: 'Consistent user acquisition',
    },
    {
      phase: 'Scaling Kit',
      whenUsed: 'Growth Stage',
      mainFocus: ['Optimization', 'Automation', 'Partnership Expansion', 'Data-Driven Scaling'],
      keyOutput: 'Sustainable business growth',
    },
  ],
  planning: {
    targetCustomers: [
      'Leisure Travelers',
      'Business Travelers',
      'Families',
      'Solo Travelers',
      'Tour Groups',
      'Secondary: Tour Operators, Local Guides, Hotels, Resorts, Activity Providers, Co-working Spaces',
    ],
    painPoints: [
      'Multiple platforms for planning & bookings',
      'Difficult to find authentic experiences',
      'High costs & hidden fees',
      'Lack of itinerary planning',
      'Poor travel coordination',
    ],
    buyingTriggers: [
      'One-stop travel planning',
      'Verified travel partners',
      'Flexible travel options',
      'Exclusive offers',
      'Local experiences',
      'Easy booking process',
      'Secure payments',
    ],
    positioning:
      'The Better Pass is a digital travel marketplace connecting travelers with verified travel partners, local experiences, accommodations, transport, and activities through one integrated platform.',
    valueProposition:
      'Helping travelers discover, plan, book, and enjoy better journeys while helping local businesses reach more customers through one trusted ecosystem.',
    channelPlan: [
      { category: 'Organic', channels: ['Website, SEO, Blogs', 'YouTube', 'Social Media'] },
      { category: 'Paid', channels: ['Google Ads', 'Meta Ads', 'YouTube Ads', 'Display Ads'] },
      { category: 'Direct', channels: ['WhatsApp', 'Email', 'SMS', 'Push Notifications'] },
      { category: 'Partnerships', channels: ['Hotels', 'Resorts', 'Tour Operators', 'Local Guides', 'Activity Providers', 'Tourism Boards'] },
    ],
  },
  funnelStages: ['Awareness', 'Interest', 'Website Visit', 'Registration', 'Trip Planning', 'Booking', 'Travel Experience', 'Referral'],
  kpiPlan: [
    'Website Traffic',
    'App Downloads',
    'Registrations',
    'Vendor Signups',
    'Booking Value',
    'Booking Conversion Rate',
    'Cost per Lead (CPL)',
    'Customer Acquisition Cost (CAC)',
    'Return on Ad Spend (ROAS)',
    'Revenue',
    'Vendor Retention',
    'Customer Retention',
    'Repeat Bookings',
  ],
  budgetPlan: [
    { phase: 'Foundation', items: ['Website Development', 'Branding', 'Marketplace Setup', 'Content Creation', 'Vendor Acquisition'] },
    { phase: 'Growth', items: ['Paid Advertising', 'Influencer Marketing', 'Travel Campaigns', 'Content Marketing', 'CRM & Automation'] },
    { phase: 'Scaling', items: ['Referral Program', 'Premium Membership', 'Automation', 'Partnership Expansion', 'National Campaigns'] },
  ],
};

const run = async () => {
  await connectDB();

  const projects = await Project.find({}).lean();
  const project = projects.find((p) => {
    const code = normalizeKey(p.projectCode);
    const name = normalizeKey(p.name);
    return code === 'BETTERPASS' || name === 'BETTERPASS' || name.includes('BETTERPASS');
  });

  if (!project) {
    throw new Error('Better Pass project not found. Run seed_canonical_projects.js first.');
  }

  await upsertPlanByProject(project._id, PLAN_PAYLOAD, null);
  console.log(`Marketing plan seeded for: ${project.name} [${project._id}]`);
};

run()
  .catch((err) => {
    console.error('Better Pass marketing plan seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
