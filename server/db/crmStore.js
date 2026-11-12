// ── Nexora CRM — Enterprise CRM Data Store ──────────────────
// Provides seamless dual-mode data layer: uses MongoDB via Mongoose when connected,
// or high-performance in-memory collection engine with full schema parity and seed data.
import { v4 as uuidv4 } from 'uuid';
import { isMongoConnected } from './connection.js';
import { Lead } from '../models/Lead.js';
import { Contact } from '../models/Contact.js';
import { Company } from '../models/Company.js';
import { Deal, STAGE_CONFIG } from '../models/Deal.js';
import { Activity } from '../models/Activity.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import { Email } from '../models/Email.js';
import { Attachment } from '../models/Attachment.js';

// In-Memory Storage Collections
export const memoryLeads = new Map();
export const memoryContacts = new Map();
export const memoryCompanies = new Map();
export const memoryDeals = new Map();
export const memoryActivities = new Map();
export const memoryNotifications = new Map();
export const memoryAuditLogs = new Map();
export const memoryEmails = new Map();
export const memoryAttachments = new Map();

// ── Seed Enterprise Companies ───────────────────────────────
const SEED_COMPANIES = [
  {
    id: 'comp-001',
    orgId: 'org-001',
    ownerId: 'user-001',
    ownerName: 'Alexandra Reid',
    name: 'Stripe Payments Inc.',
    domain: 'stripe.com',
    website: 'https://stripe.com',
    industry: 'Financial Services',
    size: '500+',
    annualRevenue: 14000000000,
    phone: '+1 (415) 555-0190',
    status: 'Active Client',
    address: { street: '354 Oyster Point Blvd', city: 'South San Francisco', state: 'CA', postalCode: '94080', country: 'United States' },
    description: 'Global financial infrastructure provider enabling millions of businesses to accept payments.',
    tags: ['FinTech', 'Enterprise', 'Strategic Account'],
    contactsCount: 2,
    dealsValue: 240000,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'comp-002',
    orgId: 'org-001',
    ownerId: 'user-002',
    ownerName: 'Marcus Chen',
    name: 'Datadog Observability',
    domain: 'datadoghq.com',
    website: 'https://datadoghq.com',
    industry: 'Technology & SaaS',
    size: '500+',
    annualRevenue: 2100000000,
    phone: '+1 (866) 328-2834',
    status: 'Active Client',
    address: { street: '620 8th Ave 45th Floor', city: 'New York', state: 'NY', postalCode: '10018', country: 'United States' },
    description: 'Cloud monitoring and security platform for cloud-scale applications.',
    tags: ['Cloud', 'SaaS', 'DevOps'],
    contactsCount: 2,
    dealsValue: 185000,
    createdAt: '2024-02-14T09:30:00Z',
    updatedAt: '2024-02-14T09:30:00Z',
  },
  {
    id: 'comp-003',
    orgId: 'org-001',
    ownerId: 'user-003',
    ownerName: 'Priya Sharma',
    name: 'BioGenix Diagnostics',
    domain: 'biogenix-dx.com',
    website: 'https://biogenix-dx.com',
    industry: 'Healthcare & Life Sciences',
    size: '51-200',
    annualRevenue: 48000000,
    phone: '+1 (617) 555-8321',
    status: 'Prospect',
    address: { street: '100 Technology Square', city: 'Cambridge', state: 'MA', postalCode: '02139', country: 'United States' },
    description: 'Next-generation genomic sequencing and molecular diagnostic solutions.',
    tags: ['Genomics', 'Biotech', 'High Growth'],
    contactsCount: 1,
    dealsValue: 95000,
    createdAt: '2024-03-01T11:00:00Z',
    updatedAt: '2024-03-01T11:00:00Z',
  },
  {
    id: 'comp-004',
    orgId: 'org-001',
    ownerId: 'user-003',
    ownerName: 'Priya Sharma',
    name: 'HyperScale Logistics',
    domain: 'hyperscalelogistics.io',
    website: 'https://hyperscalelogistics.io',
    industry: 'Manufacturing & Logistics',
    size: '201-500',
    annualRevenue: 130000000,
    phone: '+1 (312) 555-4422',
    status: 'Prospect',
    address: { street: '233 S Wacker Dr', city: 'Chicago', state: 'IL', postalCode: '60606', country: 'United States' },
    description: 'AI-driven supply chain automation and intelligent freight dispatch platform.',
    tags: ['Logistics', 'Supply Chain', 'AI'],
    contactsCount: 1,
    dealsValue: 140000,
    createdAt: '2024-03-12T14:20:00Z',
    updatedAt: '2024-03-12T14:20:00Z',
  },
  {
    id: 'comp-005',
    orgId: 'org-001',
    ownerId: 'user-002',
    ownerName: 'Marcus Chen',
    name: 'Nordic Clean Energy',
    domain: 'nordicclean.se',
    website: 'https://nordicclean.se',
    industry: 'Energy & Utilities',
    size: '11-50',
    annualRevenue: 18000000,
    phone: '+46 8 555 9010',
    status: 'Partner',
    address: { street: 'Kungsgatan 12', city: 'Stockholm', state: 'Stockholm', postalCode: '111 43', country: 'Sweden' },
    description: 'Renewable grid optimization and offshore wind distributed software.',
    tags: ['CleanTech', 'Renewables', 'Europe'],
    contactsCount: 1,
    dealsValue: 70000,
    createdAt: '2024-04-05T08:00:00Z',
    updatedAt: '2024-04-05T08:00:00Z',
  },
];

// ── Seed Enterprise Contacts ────────────────────────────────
const SEED_CONTACTS = [
  {
    id: 'cont-001',
    orgId: 'org-001',
    ownerId: 'user-001',
    ownerName: 'Alexandra Reid',
    companyId: 'comp-001',
    companyName: 'Stripe Payments Inc.',
    firstName: 'Patrick',
    lastName: 'Vance',
    email: 'pvance@stripe.com',
    phone: '+1 (415) 555-0144',
    title: 'Director of Global Revenue Ops',
    department: 'Revenue Operations',
    status: 'Customer',
    lifecycleStage: 'Customer',
    leadSource: 'Referral',
    address: { city: 'San Francisco', state: 'CA', country: 'United States' },
    tags: ['Champion', 'Executive Sponsor'],
    notes: 'Key decision maker for annual CRM expansion deal ($140k).',
    lastContactedAt: '2024-10-25T14:30:00Z',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-10-25T14:30:00Z',
  },
  {
    id: 'cont-002',
    orgId: 'org-001',
    ownerId: 'user-001',
    ownerName: 'Alexandra Reid',
    companyId: 'comp-001',
    companyName: 'Stripe Payments Inc.',
    firstName: 'Clara',
    lastName: 'Olsen',
    email: 'clara.olsen@stripe.com',
    phone: '+1 (415) 555-0182',
    title: 'VP of Commercial Sales',
    department: 'Sales',
    status: 'Customer',
    lifecycleStage: 'Customer',
    leadSource: 'Referral',
    address: { city: 'San Francisco', state: 'CA', country: 'United States' },
    tags: ['Budget Holder'],
    notes: 'Approved multi-seat Nexora rollout for 45 sales reps.',
    lastContactedAt: '2024-10-28T09:15:00Z',
    createdAt: '2024-01-18T11:00:00Z',
    updatedAt: '2024-10-28T09:15:00Z',
  },
  {
    id: 'cont-003',
    orgId: 'org-001',
    ownerId: 'user-002',
    ownerName: 'Marcus Chen',
    companyId: 'comp-002',
    companyName: 'Datadog Observability',
    firstName: 'Devon',
    lastName: 'Miles',
    email: 'devon.miles@datadoghq.com',
    phone: '+1 (212) 555-8812',
    title: 'Senior Enterprise Architect',
    department: 'Infrastructure',
    status: 'Customer',
    lifecycleStage: 'Customer',
    leadSource: 'Website',
    address: { city: 'New York', state: 'NY', country: 'United States' },
    tags: ['Technical Evaluator'],
    notes: 'Tested API webhooks and single sign-on security compliance.',
    lastContactedAt: '2024-10-22T16:00:00Z',
    createdAt: '2024-02-20T14:00:00Z',
    updatedAt: '2024-10-22T16:00:00Z',
  },
  {
    id: 'cont-004',
    orgId: 'org-001',
    ownerId: 'user-002',
    ownerName: 'Marcus Chen',
    companyId: 'comp-002',
    companyName: 'Datadog Observability',
    firstName: 'Sarah',
    lastName: 'Kaufman',
    email: 's.kaufman@datadoghq.com',
    phone: '+1 (212) 555-9011',
    title: 'Head of Sales Operations',
    department: 'Sales Ops',
    status: 'Customer',
    lifecycleStage: 'Customer',
    leadSource: 'LinkedIn',
    address: { city: 'New York', state: 'NY', country: 'United States' },
    tags: ['Primary Contact'],
    notes: 'Requested monthly pipeline reporting export.',
    lastContactedAt: '2024-10-29T11:30:00Z',
    createdAt: '2024-02-22T15:30:00Z',
    updatedAt: '2024-10-29T11:30:00Z',
  },
  {
    id: 'cont-005',
    orgId: 'org-001',
    ownerId: 'user-003',
    ownerName: 'Priya Sharma',
    companyId: 'comp-003',
    companyName: 'BioGenix Diagnostics',
    firstName: 'Evelyn',
    lastName: 'Zhao',
    email: 'evelyn.zhao@biogenix-dx.com',
    phone: '+1 (617) 555-3211',
    title: 'Chief Technology Officer',
    department: 'Engineering',
    status: 'Lead',
    lifecycleStage: 'Opportunity',
    leadSource: 'Inbound',
    address: { city: 'Cambridge', state: 'MA', country: 'United States' },
    tags: ['Decision Maker', 'High Value'],
    notes: 'Demo scheduled for next Tuesday at 2 PM EST.',
    lastContactedAt: '2024-10-30T10:00:00Z',
    createdAt: '2024-03-05T09:00:00Z',
    updatedAt: '2024-10-30T10:00:00Z',
  },
  {
    id: 'cont-006',
    orgId: 'org-001',
    ownerId: 'user-003',
    ownerName: 'Priya Sharma',
    companyId: 'comp-004',
    companyName: 'HyperScale Logistics',
    firstName: 'Tariq',
    lastName: 'Al-Mansoor',
    email: 'tariq@hyperscalelogistics.io',
    phone: '+1 (312) 555-9943',
    title: 'VP of Commercial Strategy',
    department: 'Strategy',
    status: 'Lead',
    lifecycleStage: 'SQL',
    leadSource: 'Webinar',
    address: { city: 'Chicago', state: 'IL', country: 'United States' },
    tags: ['Midwest', 'Freight Tech'],
    notes: 'Evaluating Nexora vs Salesforce. Budget approved for Q4.',
    lastContactedAt: '2024-10-27T13:45:00Z',
    createdAt: '2024-03-15T11:30:00Z',
    updatedAt: '2024-10-27T13:45:00Z',
  },
];

// ── Seed Enterprise Leads ───────────────────────────────────
const SEED_LEADS = [
  {
    id: 'lead-001',
    orgId: 'org-001',
    ownerId: 'user-003',
    ownerName: 'Priya Sharma',
    firstName: 'Kavita',
    lastName: 'Reddy',
    email: 'kavita.r@apexcloudsystems.com',
    phone: '+1 (408) 555-7822',
    company: 'Apex Cloud Systems',
    title: 'VP of Product Infrastructure',
    source: 'Website',
    status: 'New',
    value: 65000,
    score: 85,
    notes: 'Requested interactive demo of role-based pipelines and custom fields.',
    tags: ['Hot Lead', 'Enterprise Tier', 'Cloud'],
    converted: false,
    conversion: {},
    createdAt: '2024-10-28T09:00:00Z',
    updatedAt: '2024-10-28T09:00:00Z',
  },
  {
    id: 'lead-002',
    orgId: 'org-001',
    ownerId: 'user-003',
    ownerName: 'Priya Sharma',
    firstName: 'Liam',
    lastName: 'O\'Connor',
    email: 'liam.oc@celticfintech.ie',
    phone: '+353 1 496 0122',
    company: 'Celtic FinTech Global',
    title: 'Head of Growth & Partnerships',
    source: 'LinkedIn',
    status: 'Contacted',
    value: 92000,
    score: 78,
    notes: 'Initial discovery call held. Interested in multi-currency reporting.',
    tags: ['FinTech', 'EMEA', 'Priority'],
    converted: false,
    conversion: {},
    createdAt: '2024-10-26T14:15:00Z',
    updatedAt: '2024-10-29T11:20:00Z',
  },
  {
    id: 'lead-003',
    orgId: 'org-001',
    ownerId: 'user-002',
    ownerName: 'Marcus Chen',
    firstName: 'Samantha',
    lastName: 'Vance',
    email: 'svance@aeroflightdynamics.com',
    phone: '+1 (206) 555-6611',
    company: 'AeroFlight Dynamics',
    title: 'Chief Commercial Officer',
    source: 'Referral',
    status: 'Qualified',
    value: 120000,
    score: 94,
    notes: 'Fully qualified opportunity. Board approval pending for annual contract.',
    tags: ['Strategic', 'Q4 Close', 'Executive'],
    converted: false,
    conversion: {},
    createdAt: '2024-10-20T11:00:00Z',
    updatedAt: '2024-10-30T16:00:00Z',
  },
  {
    id: 'lead-004',
    orgId: 'org-001',
    ownerId: 'user-001',
    ownerName: 'Alexandra Reid',
    firstName: 'Dr. Arthur',
    lastName: 'Pendleton',
    email: 'arthur.p@genomixlabs.org',
    phone: '+1 (415) 555-8911',
    company: 'Genomix Laboratories',
    title: 'Chief Medical Officer',
    source: 'Webinar',
    status: 'Converted',
    value: 110000,
    score: 98,
    notes: 'Converted successfully into enterprise client.',
    tags: ['Converted', 'Healthcare'],
    converted: true,
    conversion: {
      convertedAt: '2024-10-24T15:30:00Z',
      convertedBy: 'user-001',
      convertedByName: 'Alexandra Reid',
      contactId: 'cont-005',
      companyId: 'comp-003',
      dealName: 'Genomix Clinical CRM Rollout',
      dealAmount: 110000,
    },
    createdAt: '2024-10-15T08:00:00Z',
    updatedAt: '2024-10-24T15:30:00Z',
  },
  {
    id: 'lead-005',
    orgId: 'org-001',
    ownerId: 'user-003',
    ownerName: 'Priya Sharma',
    firstName: 'Carlos',
    lastName: 'Santana',
    email: 'csantana@solarenergycorp.com',
    phone: '+1 (512) 555-9233',
    company: 'Solaria Energy Systems',
    title: 'Senior Director of Business Dev',
    source: 'Cold Outreach',
    status: 'New',
    value: 45000,
    score: 62,
    notes: 'Downloaded whitepaper on solar CRM workflows.',
    tags: ['CleanTech', 'Inbound'],
    converted: false,
    conversion: {},
    createdAt: '2024-10-30T13:45:00Z',
    updatedAt: '2024-10-30T13:45:00Z',
  },
];

// ── Seed Enterprise Deals ───────────────────────────────────
const SEED_DEALS = [
  {
    id: 'deal-001',
    orgId: 'org-001',
    ownerId: 'user-001',
    ownerName: 'Alexandra Reid',
    name: 'Stripe — Enterprise Cloud Expansion',
    amount: 140000,
    companyId: 'comp-001',
    companyName: 'Stripe Payments Inc.',
    contactId: 'cont-001',
    contactName: 'Patrick Vance',
    stage: 'negotiation',
    probability: 70,
    expectedCloseDate: '2024-11-20T00:00:00Z',
    actualCloseDate: null,
    priority: 'Critical',
    lostReason: '',
    notes: 'Legal & security review underway. Multi-year agreement.',
    tags: ['Strategic', 'FinTech', 'Expansion'],
    currency: 'USD',
    stageHistory: [
      { fromStage: 'qualification', toStage: 'proposal', changedAt: '2024-10-10T14:00:00Z', changedBy: 'user-001', changedByName: 'Alexandra Reid', note: 'Completed discovery demo' },
      { fromStage: 'proposal', toStage: 'negotiation', changedAt: '2024-10-24T16:30:00Z', changedBy: 'user-001', changedByName: 'Alexandra Reid', note: 'Sent redlined master service agreement' },
    ],
    createdAt: '2024-10-01T10:00:00Z',
    updatedAt: '2024-10-24T16:30:00Z',
  },
  {
    id: 'deal-002',
    orgId: 'org-001',
    ownerId: 'user-002',
    ownerName: 'Marcus Chen',
    name: 'Datadog — Distributed Agent Rollout',
    amount: 115000,
    companyId: 'comp-002',
    companyName: 'Datadog Observability',
    contactId: 'cont-003',
    contactName: 'Devon Miles',
    stage: 'closing',
    probability: 90,
    expectedCloseDate: '2024-11-10T00:00:00Z',
    actualCloseDate: null,
    priority: 'High',
    lostReason: '',
    notes: 'Final executive sign-off pending procurement approval.',
    tags: ['DevOps', 'Cloud', 'Q4 Target'],
    currency: 'USD',
    stageHistory: [
      { fromStage: 'qualification', toStage: 'proposal', changedAt: '2024-09-15T09:00:00Z', changedBy: 'user-002', changedByName: 'Marcus Chen', note: 'Technical architecture accepted' },
      { fromStage: 'proposal', toStage: 'negotiation', changedAt: '2024-10-05T11:00:00Z', changedBy: 'user-002', changedByName: 'Marcus Chen', note: 'Commercial terms agreed' },
      { fromStage: 'negotiation', toStage: 'closing', changedAt: '2024-10-28T15:00:00Z', changedBy: 'user-002', changedByName: 'Marcus Chen', note: 'Order form generated' },
    ],
    createdAt: '2024-09-01T09:00:00Z',
    updatedAt: '2024-10-28T15:00:00Z',
  },
  {
    id: 'deal-003',
    orgId: 'org-001',
    ownerId: 'user-003',
    ownerName: 'Priya Sharma',
    name: 'BioGenix — Genomic Analytics Licensing',
    amount: 95000,
    companyId: 'comp-003',
    companyName: 'BioGenix Diagnostics',
    contactId: 'cont-005',
    contactName: 'Evelyn Zhao',
    stage: 'proposal',
    probability: 40,
    expectedCloseDate: '2024-12-05T00:00:00Z',
    actualCloseDate: null,
    priority: 'High',
    lostReason: '',
    notes: 'Pitching 50 analyst seats with HIPAA-compliant audit logs.',
    tags: ['Biotech', 'Healthcare', 'Inbound'],
    currency: 'USD',
    stageHistory: [
      { fromStage: 'qualification', toStage: 'proposal', changedAt: '2024-10-18T10:00:00Z', changedBy: 'user-003', changedByName: 'Priya Sharma', note: 'Scope requirements defined' },
    ],
    createdAt: '2024-10-05T11:00:00Z',
    updatedAt: '2024-10-18T10:00:00Z',
  },
  {
    id: 'deal-004',
    orgId: 'org-001',
    ownerId: 'user-003',
    ownerName: 'Priya Sharma',
    name: 'HyperScale — Fleet Dispatch Automation',
    amount: 140000,
    companyId: 'comp-004',
    companyName: 'HyperScale Logistics',
    contactId: 'cont-006',
    contactName: 'Tariq Al-Mansoor',
    stage: 'proposal',
    probability: 40,
    expectedCloseDate: '2024-12-15T00:00:00Z',
    actualCloseDate: null,
    priority: 'Medium',
    lostReason: '',
    notes: 'Evaluating automated webhook triggers and custom pipeline stages.',
    tags: ['Logistics', 'Supply Chain'],
    currency: 'USD',
    stageHistory: [
      { fromStage: 'qualification', toStage: 'proposal', changedAt: '2024-10-22T14:00:00Z', changedBy: 'user-003', changedByName: 'Priya Sharma', note: 'Delivered tailored live demo' },
    ],
    createdAt: '2024-10-12T13:00:00Z',
    updatedAt: '2024-10-22T14:00:00Z',
  },
  {
    id: 'deal-005',
    orgId: 'org-001',
    ownerId: 'user-002',
    ownerName: 'Marcus Chen',
    name: 'Nordic Clean Energy — EU Grid Optimization',
    amount: 70000,
    companyId: 'comp-005',
    companyName: 'Nordic Clean Energy',
    contactId: null,
    contactName: 'Sven Lindqvist',
    stage: 'won',
    probability: 100,
    expectedCloseDate: '2024-10-15T00:00:00Z',
    actualCloseDate: '2024-10-15T12:00:00Z',
    priority: 'Medium',
    lostReason: '',
    notes: 'Successfully closed and fully signed. Onboarding started.',
    tags: ['CleanTech', 'Europe', 'Closed Won'],
    currency: 'USD',
    stageHistory: [
      { fromStage: 'qualification', toStage: 'proposal', changedAt: '2024-09-02T10:00:00Z', changedBy: 'user-002', changedByName: 'Marcus Chen', note: 'Initial proposal' },
      { fromStage: 'proposal', toStage: 'negotiation', changedAt: '2024-09-20T14:00:00Z', changedBy: 'user-002', changedByName: 'Marcus Chen', note: 'Contract review' },
      { fromStage: 'negotiation', toStage: 'won', changedAt: '2024-10-15T12:00:00Z', changedBy: 'user-002', changedByName: 'Marcus Chen', note: 'Contract executed & paid' },
    ],
    createdAt: '2024-08-20T08:00:00Z',
    updatedAt: '2024-10-15T12:00:00Z',
  },
  {
    id: 'deal-006',
    orgId: 'org-001',
    ownerId: 'user-003',
    ownerName: 'Priya Sharma',
    name: 'Apex Cloud — Custom Pipeline Architecture',
    amount: 65000,
    companyId: null,
    companyName: 'Apex Cloud Systems',
    contactId: null,
    contactName: 'Kavita Reddy',
    stage: 'qualification',
    probability: 20,
    expectedCloseDate: '2024-12-30T00:00:00Z',
    actualCloseDate: null,
    priority: 'High',
    lostReason: '',
    notes: 'Lead qualified. Preparing custom security assessment documentation.',
    tags: ['Cloud', 'Qualification'],
    currency: 'USD',
    stageHistory: [],
    createdAt: '2024-10-28T09:30:00Z',
    updatedAt: '2024-10-28T09:30:00Z',
  },
  {
    id: 'deal-007',
    orgId: 'org-001',
    ownerId: 'user-003',
    ownerName: 'Priya Sharma',
    name: 'Celtic FinTech — Multi-Currency CRM Core',
    amount: 92000,
    companyId: null,
    companyName: 'Celtic FinTech Global',
    contactId: null,
    contactName: 'Liam O\'Connor',
    stage: 'qualification',
    probability: 20,
    expectedCloseDate: '2025-01-15T00:00:00Z',
    actualCloseDate: null,
    priority: 'Medium',
    lostReason: '',
    notes: 'Evaluating multi-tenant workspace division for EMEA branch.',
    tags: ['FinTech', 'EMEA'],
    currency: 'USD',
    stageHistory: [],
    createdAt: '2024-10-29T11:30:00Z',
    updatedAt: '2024-10-29T11:30:00Z',
  },
  {
    id: 'deal-008',
    orgId: 'org-001',
    ownerId: 'user-002',
    ownerName: 'Marcus Chen',
    name: 'AeroFlight — Cockpit Telemetry Systems',
    amount: 120000,
    companyId: null,
    companyName: 'AeroFlight Dynamics',
    contactId: null,
    contactName: 'Samantha Vance',
    stage: 'negotiation',
    probability: 70,
    expectedCloseDate: '2024-11-25T00:00:00Z',
    actualCloseDate: null,
    priority: 'Critical',
    lostReason: '',
    notes: 'Pricing discount reviewed with Alexandra. Target contract $120k.',
    tags: ['Aviation', 'Enterprise'],
    currency: 'USD',
    stageHistory: [
      { fromStage: 'qualification', toStage: 'proposal', changedAt: '2024-10-22T09:00:00Z', changedBy: 'user-002', changedByName: 'Marcus Chen', note: 'Proposal accepted' },
      { fromStage: 'proposal', toStage: 'negotiation', changedAt: '2024-10-30T16:00:00Z', changedBy: 'user-002', changedByName: 'Marcus Chen', note: 'Entering pricing finalization' },
    ],
    createdAt: '2024-10-18T10:00:00Z',
    updatedAt: '2024-10-30T16:00:00Z',
  },
];

// ── Seed Enterprise Activities & Tasks ──────────────────────
const nowMs = Date.now();
const SEED_ACTIVITIES = [
  {
    id: 'act-001',
    orgId: 'org-001',
    type: 'task',
    title: 'Security compliance review for Stripe expansion',
    description: 'Review SOC2 and ISO27001 data residency compliance with Stripe legal team.',
    status: 'pending',
    priority: 'urgent',
    dueDate: new Date(nowMs + 4 * 3600000).toISOString(),
    reminderDate: new Date(nowMs - 300000).toISOString(),
    reminderSent: true,
    entityType: 'deal',
    entityId: 'deal-001',
    entityName: 'Stripe — Enterprise Cloud Expansion',
    assignedTo: 'user-001',
    assignedToName: 'Alexandra Reid',
    creatorId: 'user-001',
    creatorName: 'Alexandra Reid',
    completedAt: null,
    completedBy: null,
    completedByName: '',
    outcome: '',
    createdAt: new Date(nowMs - 24 * 3600000).toISOString(),
    updatedAt: new Date(nowMs - 24 * 3600000).toISOString(),
  },
  {
    id: 'act-002',
    orgId: 'org-001',
    type: 'call',
    title: 'Follow-up discovery call with Patrick Collison',
    description: 'Discuss multi-region deployment timelines and APAC rollout schedule.',
    status: 'pending',
    priority: 'high',
    dueDate: new Date(nowMs + 2 * 3600000).toISOString(),
    reminderDate: new Date(nowMs + 1800000).toISOString(),
    reminderSent: false,
    entityType: 'contact',
    entityId: 'cont-001',
    entityName: 'Patrick Collison',
    assignedTo: 'user-001',
    assignedToName: 'Alexandra Reid',
    creatorId: 'user-001',
    creatorName: 'Alexandra Reid',
    completedAt: null,
    completedBy: null,
    completedByName: '',
    outcome: '',
    createdAt: new Date(nowMs - 12 * 3600000).toISOString(),
    updatedAt: new Date(nowMs - 12 * 3600000).toISOString(),
  },
  {
    id: 'act-003',
    orgId: 'org-001',
    type: 'meeting',
    title: 'Datadog platform architecture deep dive',
    description: 'Joint engineering architecture review for 100k nodes telemetry ingest.',
    status: 'pending',
    priority: 'medium',
    dueDate: new Date(nowMs + 26 * 3600000).toISOString(),
    reminderDate: new Date(nowMs + 20 * 3600000).toISOString(),
    reminderSent: false,
    entityType: 'deal',
    entityId: 'deal-002',
    entityName: 'Datadog — Distributed Tracing Platform',
    assignedTo: 'user-002',
    assignedToName: 'Marcus Chen',
    creatorId: 'user-002',
    creatorName: 'Marcus Chen',
    completedAt: null,
    completedBy: null,
    completedByName: '',
    outcome: '',
    createdAt: new Date(nowMs - 48 * 3600000).toISOString(),
    updatedAt: new Date(nowMs - 48 * 3600000).toISOString(),
  },
  {
    id: 'act-004',
    orgId: 'org-001',
    type: 'note',
    title: 'Customer requested 99.999% SLA guarantee',
    description: 'CTO confirmed that five-nines uptime clause will seal the multi-year enterprise agreement.',
    status: 'completed',
    priority: 'low',
    dueDate: null,
    reminderDate: null,
    reminderSent: false,
    entityType: 'company',
    entityId: 'comp-001',
    entityName: 'Stripe Payments Inc.',
    assignedTo: 'user-001',
    assignedToName: 'Alexandra Reid',
    creatorId: 'user-001',
    creatorName: 'Alexandra Reid',
    completedAt: new Date(nowMs - 10 * 3600000).toISOString(),
    completedBy: 'user-001',
    completedByName: 'Alexandra Reid',
    outcome: 'Confirmed SLA terms drafted into contract annex',
    createdAt: new Date(nowMs - 10 * 3600000).toISOString(),
    updatedAt: new Date(nowMs - 10 * 3600000).toISOString(),
  },
  {
    id: 'act-005',
    orgId: 'org-001',
    type: 'email',
    title: 'Send revised master service agreement to Apex Cloud',
    description: 'Send redlined draft with negotiated liability caps.',
    status: 'pending',
    priority: 'high',
    dueDate: new Date(nowMs + 18 * 3600000).toISOString(),
    reminderDate: null,
    reminderSent: false,
    entityType: 'lead',
    entityId: 'lead-001',
    entityName: 'Apex Cloud Systems',
    assignedTo: 'user-003',
    assignedToName: 'Priya Sharma',
    creatorId: 'user-001',
    creatorName: 'Alexandra Reid',
    completedAt: null,
    completedBy: null,
    completedByName: '',
    outcome: '',
    createdAt: new Date(nowMs - 8 * 3600000).toISOString(),
    updatedAt: new Date(nowMs - 8 * 3600000).toISOString(),
  },
  {
    id: 'act-006',
    orgId: 'org-001',
    type: 'reminder',
    title: 'Follow up on invoice approval with BioHealth finance',
    description: 'Confirm wire transfer details with enterprise procurement team.',
    status: 'pending',
    priority: 'urgent',
    dueDate: new Date(nowMs + 3600000).toISOString(),
    reminderDate: new Date(nowMs - 60000).toISOString(),
    reminderSent: true,
    entityType: 'deal',
    entityId: 'deal-005',
    entityName: 'BioHealth Labs — Enterprise Diagnostics Cloud',
    assignedTo: 'user-001',
    assignedToName: 'Alexandra Reid',
    creatorId: 'user-001',
    creatorName: 'Alexandra Reid',
    completedAt: null,
    completedBy: null,
    completedByName: '',
    outcome: '',
    createdAt: new Date(nowMs - 18 * 3600000).toISOString(),
    updatedAt: new Date(nowMs - 18 * 3600000).toISOString(),
  },
  {
    id: 'act-007',
    orgId: 'org-001',
    type: 'task',
    title: 'Prepare executive Q4 sales forecast deck',
    description: 'Synthesize pipeline metrics and quota attainment for executive review.',
    status: 'completed',
    priority: 'medium',
    dueDate: new Date(nowMs - 24 * 3600000).toISOString(),
    reminderDate: null,
    reminderSent: false,
    entityType: 'none',
    entityId: null,
    entityName: '',
    assignedTo: 'user-001',
    assignedToName: 'Alexandra Reid',
    creatorId: 'user-001',
    creatorName: 'Alexandra Reid',
    completedAt: new Date(nowMs - 18 * 3600000).toISOString(),
    completedBy: 'user-001',
    completedByName: 'Alexandra Reid',
    outcome: 'Deck finalized and uploaded to Google Drive',
    createdAt: new Date(nowMs - 72 * 3600000).toISOString(),
    updatedAt: new Date(nowMs - 18 * 3600000).toISOString(),
  },
];

// ── Seed Enterprise Notifications ───────────────────────────
const SEED_NOTIFICATIONS = [
  {
    id: 'notif-001',
    orgId: 'org-001',
    userId: 'user-001',
    type: 'task_reminder',
    title: 'Task Reminder',
    message: 'Security compliance review for Stripe expansion is due today.',
    link: '#/tasks',
    entityType: 'task',
    entityId: 'act-001',
    read: false,
    createdAt: new Date(nowMs - 15 * 60000).toISOString(),
  },
  {
    id: 'notif-002',
    orgId: 'org-001',
    userId: 'user-001',
    type: 'deal_won',
    title: 'Deal Closed Won!',
    message: 'BioHealth Labs ($145,000) was marked Closed Won.',
    link: '#/deals',
    entityType: 'deal',
    entityId: 'deal-005',
    read: false,
    createdAt: new Date(nowMs - 3 * 3600000).toISOString(),
  },
  {
    id: 'notif-003',
    orgId: 'org-001',
    userId: 'user-003',
    type: 'lead_assigned',
    title: 'New Lead Assigned',
    message: 'You were assigned lead Carlos Santana (Solaria Energy Systems).',
    link: '#/leads',
    entityType: 'lead',
    entityId: 'lead-005',
    read: false,
    createdAt: new Date(nowMs - 5 * 3600000).toISOString(),
  },
  {
    id: 'notif-004',
    orgId: 'org-001',
    userId: null, // Org-wide announcement
    type: 'system',
    title: 'Pipeline Milestone',
    message: 'Nexora Enterprise pipeline surpassed $1,000,000 in active opportunities!',
    link: '#/pipeline',
    entityType: 'none',
    entityId: null,
    read: true,
    createdAt: new Date(nowMs - 24 * 3600000).toISOString(),
  },
];

// Initialize Memory Collections
for (const c of SEED_COMPANIES) memoryCompanies.set(c.id, { ...c });
for (const ct of SEED_CONTACTS) memoryContacts.set(ct.id, { ...ct, fullName: `${ct.firstName} ${ct.lastName}` });
for (const ld of SEED_LEADS) memoryLeads.set(ld.id, { ...ld, fullName: `${ld.firstName} ${ld.lastName}` });
for (const dl of SEED_DEALS) memoryDeals.set(dl.id, { ...dl, weightedAmount: Math.round((dl.amount * dl.probability) / 100) });
for (const act of SEED_ACTIVITIES) memoryActivities.set(act.id, { ...act });
for (const ntf of SEED_NOTIFICATIONS) memoryNotifications.set(ntf.id, { ...ntf });

// ── Universal CRM Store Service ──────────────────────────────
export const crmStore = {
  // ── LEADS ──────────────────────────────────────────────────
  async getLeads({ orgId, ownerId = null, search = '', status = '', source = '', page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' }) {
    if (isMongoConnected()) {
      const filter = { orgId };
      if (ownerId) filter.ownerId = ownerId;
      if (status) filter.status = status;
      if (source) filter.source = source;
      if (search) {
        const regex = new RegExp(search.trim(), 'i');
        filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }, { company: regex }, { title: regex }];
      }

      const total = await Lead.countDocuments(filter);
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
      const items = await Lead.find(filter).sort(sort).skip(skip).limit(limit).lean();
      return {
        items: items.map(i => ({ ...i, id: i._id.toString(), fullName: `${i.firstName} ${i.lastName}` })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, hasNext: page * limit < total, hasPrev: page > 1 },
      };
    }

    // In-Memory Engine
    let items = Array.from(memoryLeads.values()).filter(l => l.orgId === orgId);
    if (ownerId) items = items.filter(l => l.ownerId === ownerId);
    if (status) items = items.filter(l => l.status === status);
    if (source) items = items.filter(l => l.source === source);
    if (search) {
      const q = search.trim().toLowerCase();
      items = items.filter(l =>
        l.firstName?.toLowerCase().includes(q) ||
        l.lastName?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.title?.toLowerCase().includes(q)
      );
    }

    // Sort
    items.sort((a, b) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';
      if (typeof valA === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return sortOrder === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    const total = items.length;
    const skip = (page - 1) * limit;
    const paginated = items.slice(skip, skip + limit);

    return {
      items: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, hasNext: page * limit < total, hasPrev: page > 1 },
    };
  },

  async getLeadById(id, orgId) {
    if (isMongoConnected()) {
      const doc = await Lead.findOne({ _id: id, orgId }).lean();
      return doc ? { ...doc, id: doc._id.toString(), fullName: `${doc.firstName} ${doc.lastName}` } : null;
    }
    const lead = memoryLeads.get(id);
    return (lead && lead.orgId === orgId) ? lead : null;
  },

  async createLead(data) {
    if (isMongoConnected()) {
      const lead = await Lead.create(data);
      const obj = lead.toObject();
      return { ...obj, id: obj._id.toString(), fullName: `${obj.firstName} ${obj.lastName}` };
    }
    const id = `lead-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const lead = {
      ...data,
      id,
      converted: false,
      conversion: {},
      fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      createdAt: now,
      updatedAt: now,
    };
    memoryLeads.set(id, lead);
    return lead;
  },

  async updateLead(id, orgId, updates) {
    if (isMongoConnected()) {
      const updated = await Lead.findOneAndUpdate({ _id: id, orgId }, updates, { new: true }).lean();
      return updated ? { ...updated, id: updated._id.toString(), fullName: `${updated.firstName} ${updated.lastName}` } : null;
    }
    const lead = memoryLeads.get(id);
    if (!lead || lead.orgId !== orgId) return null;
    const updated = {
      ...lead,
      ...updates,
      fullName: `${updates.firstName || lead.firstName} ${updates.lastName || lead.lastName}`.trim(),
      updatedAt: new Date().toISOString(),
    };
    memoryLeads.set(id, updated);
    return updated;
  },

  async deleteLead(id, orgId) {
    if (isMongoConnected()) {
      const res = await Lead.findOneAndDelete({ _id: id, orgId });
      return Boolean(res);
    }
    const lead = memoryLeads.get(id);
    if (!lead || lead.orgId !== orgId) return false;
    return memoryLeads.delete(id);
  },

  // ── SAFE LEAD CONVERSION ──────────────────────────────────
  async convertLead({ leadId, orgId, userId, userName, companyId = null, companyName = '', dealName = '', dealAmount = 0 }) {
    const lead = await this.getLeadById(leadId, orgId);
    if (!lead) {
      throw new Error('Lead not found in this organization');
    }
    if (lead.converted) {
      throw new Error('This lead has already been converted');
    }

    const targetCompanyName = (companyName || lead.company || 'New Company').trim();

    // 1. Resolve or Create Company
    let targetCompany = null;
    if (companyId) {
      targetCompany = await this.getCompanyById(companyId, orgId);
    }

    if (!targetCompany) {
      targetCompany = await this.findOrCreateCompany(orgId, targetCompanyName, lead.ownerId, lead.ownerName);
    }

    // 2. Create Contact from Lead
    const contactData = {
      orgId,
      ownerId: lead.ownerId || userId,
      ownerName: lead.ownerName || userName,
      companyId: targetCompany.id,
      companyName: targetCompany.name,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone || '',
      title: lead.title || '',
      department: 'General',
      status: 'Active',
      lifecycleStage: 'Opportunity',
      leadSource: lead.source || 'Lead Conversion',
      tags: [...(lead.tags || []), 'Converted Lead'],
      notes: `Converted from Lead on ${new Date().toLocaleDateString()}. Original Notes: ${lead.notes || 'None'}`,
    };

    const newContact = await this.createContact(contactData);

    // 3. Increment Company Contacts Count
    await this.updateCompany(targetCompany.id, orgId, {
      contactsCount: (targetCompany.contactsCount || 0) + 1,
      dealsValue: (targetCompany.dealsValue || 0) + (Number(dealAmount) || Number(lead.value) || 0),
    });

    // 4. Update Lead with Safe Conversion Audit Trail
    const conversionMeta = {
      convertedAt: new Date().toISOString(),
      convertedBy: userId,
      convertedByName: userName,
      contactId: newContact.id,
      companyId: targetCompany.id,
      companyName: targetCompany.name,
      dealName: dealName.trim() || `${targetCompany.name} - Initial Opportunity`,
      dealAmount: Number(dealAmount) || Number(lead.value) || 0,
    };

    const updatedLead = await this.updateLead(leadId, orgId, {
      status: 'Converted',
      converted: true,
      conversion: conversionMeta,
    });

    return {
      success: true,
      message: 'Lead safely converted to Contact & Company successfully.',
      lead: updatedLead,
      contact: newContact,
      company: targetCompany,
      conversion: conversionMeta,
    };
  },

  // ── CONTACTS ───────────────────────────────────────────────
  async getContacts({ orgId, ownerId = null, search = '', status = '', lifecycleStage = '', companyId = '', page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' }) {
    if (isMongoConnected()) {
      const filter = { orgId };
      if (ownerId) filter.ownerId = ownerId;
      if (status) filter.status = status;
      if (lifecycleStage) filter.lifecycleStage = lifecycleStage;
      if (companyId) filter.companyId = companyId;
      if (search) {
        const regex = new RegExp(search.trim(), 'i');
        filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }, { companyName: regex }, { title: regex }];
      }

      const total = await Contact.countDocuments(filter);
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
      const items = await Contact.find(filter).sort(sort).skip(skip).limit(limit).lean();
      return {
        items: items.map(i => ({ ...i, id: i._id.toString(), fullName: `${i.firstName} ${i.lastName}` })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, hasNext: page * limit < total, hasPrev: page > 1 },
      };
    }

    let items = Array.from(memoryContacts.values()).filter(c => c.orgId === orgId);
    if (ownerId) items = items.filter(c => c.ownerId === ownerId);
    if (status) items = items.filter(c => c.status === status);
    if (lifecycleStage) items = items.filter(c => c.lifecycleStage === lifecycleStage);
    if (companyId) items = items.filter(c => c.companyId === companyId);
    if (search) {
      const q = search.trim().toLowerCase();
      items = items.filter(c =>
        c.firstName?.toLowerCase().includes(q) ||
        c.lastName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.companyName?.toLowerCase().includes(q) ||
        c.title?.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';
      if (typeof valA === 'number') return sortOrder === 'asc' ? valA - valB : valB - valA;
      return sortOrder === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    const total = items.length;
    const skip = (page - 1) * limit;
    const paginated = items.slice(skip, skip + limit);

    return {
      items: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, hasNext: page * limit < total, hasPrev: page > 1 },
    };
  },

  async getContactById(id, orgId) {
    if (isMongoConnected()) {
      const doc = await Contact.findOne({ _id: id, orgId }).lean();
      return doc ? { ...doc, id: doc._id.toString(), fullName: `${doc.firstName} ${doc.lastName}` } : null;
    }
    const contact = memoryContacts.get(id);
    return (contact && contact.orgId === orgId) ? contact : null;
  },

  async createContact(data) {
    if (isMongoConnected()) {
      const doc = await Contact.create(data);
      const obj = doc.toObject();
      return { ...obj, id: obj._id.toString(), fullName: `${obj.firstName} ${obj.lastName}` };
    }
    const id = `cont-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const contact = {
      ...data,
      id,
      fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      createdAt: now,
      updatedAt: now,
    };
    memoryContacts.set(id, contact);
    return contact;
  },

  async updateContact(id, orgId, updates) {
    if (isMongoConnected()) {
      const updated = await Contact.findOneAndUpdate({ _id: id, orgId }, updates, { new: true }).lean();
      return updated ? { ...updated, id: updated._id.toString(), fullName: `${updated.firstName} ${updated.lastName}` } : null;
    }
    const contact = memoryContacts.get(id);
    if (!contact || contact.orgId !== orgId) return null;
    const updated = {
      ...contact,
      ...updates,
      fullName: `${updates.firstName || contact.firstName} ${updates.lastName || contact.lastName}`.trim(),
      updatedAt: new Date().toISOString(),
    };
    memoryContacts.set(id, updated);
    return updated;
  },

  async deleteContact(id, orgId) {
    if (isMongoConnected()) {
      const res = await Contact.findOneAndDelete({ _id: id, orgId });
      return Boolean(res);
    }
    const contact = memoryContacts.get(id);
    if (!contact || contact.orgId !== orgId) return false;
    return memoryContacts.delete(id);
  },

  // ── COMPANIES ──────────────────────────────────────────────
  async getCompanies({ orgId, ownerId = null, search = '', industry = '', size = '', status = '', page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' }) {
    if (isMongoConnected()) {
      const filter = { orgId };
      if (ownerId) filter.ownerId = ownerId;
      if (industry) filter.industry = industry;
      if (size) filter.size = size;
      if (status) filter.status = status;
      if (search) {
        const regex = new RegExp(search.trim(), 'i');
        filter.$or = [{ name: regex }, { domain: regex }, { phone: regex }, { 'address.city': regex }];
      }

      const total = await Company.countDocuments(filter);
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
      const items = await Company.find(filter).sort(sort).skip(skip).limit(limit).lean();
      return {
        items: items.map(i => ({ ...i, id: i._id.toString() })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, hasNext: page * limit < total, hasPrev: page > 1 },
      };
    }

    let items = Array.from(memoryCompanies.values()).filter(c => c.orgId === orgId);
    if (ownerId) items = items.filter(c => c.ownerId === ownerId);
    if (industry) items = items.filter(c => c.industry === industry);
    if (size) items = items.filter(c => c.size === size);
    if (status) items = items.filter(c => c.status === status);
    if (search) {
      const q = search.trim().toLowerCase();
      items = items.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.domain?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.address?.city?.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';
      if (typeof valA === 'number') return sortOrder === 'asc' ? valA - valB : valB - valA;
      return sortOrder === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    const total = items.length;
    const skip = (page - 1) * limit;
    const paginated = items.slice(skip, skip + limit);

    return {
      items: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, hasNext: page * limit < total, hasPrev: page > 1 },
    };
  },

  async getCompanyById(id, orgId) {
    if (isMongoConnected()) {
      const doc = await Company.findOne({ _id: id, orgId }).lean();
      return doc ? { ...doc, id: doc._id.toString() } : null;
    }
    const comp = memoryCompanies.get(id);
    return (comp && comp.orgId === orgId) ? comp : null;
  },

  async createCompany(data) {
    if (isMongoConnected()) {
      const doc = await Company.create(data);
      const obj = doc.toObject();
      return { ...obj, id: obj._id.toString() };
    }
    const id = `comp-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const comp = {
      ...data,
      id,
      contactsCount: data.contactsCount || 0,
      dealsValue: data.dealsValue || 0,
      createdAt: now,
      updatedAt: now,
    };
    memoryCompanies.set(id, comp);
    return comp;
  },

  async updateCompany(id, orgId, updates) {
    if (isMongoConnected()) {
      const updated = await Company.findOneAndUpdate({ _id: id, orgId }, updates, { new: true }).lean();
      return updated ? { ...updated, id: updated._id.toString() } : null;
    }
    const comp = memoryCompanies.get(id);
    if (!comp || comp.orgId !== orgId) return null;
    const updated = {
      ...comp,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    memoryCompanies.set(id, updated);
    return updated;
  },

  async deleteCompany(id, orgId) {
    if (isMongoConnected()) {
      const res = await Company.findOneAndDelete({ _id: id, orgId });
      return Boolean(res);
    }
    const comp = memoryCompanies.get(id);
    if (!comp || comp.orgId !== orgId) return false;
    return memoryCompanies.delete(id);
  },

  async findOrCreateCompany(orgId, name, ownerId, ownerName) {
    const trimmed = name.trim();
    // Search existing
    const existing = Array.from(memoryCompanies.values()).find(
      c => c.orgId === orgId && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing;

    // Create new
    const domain = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    return this.createCompany({
      orgId,
      ownerId,
      ownerName,
      name: trimmed,
      domain,
      website: `https://${domain}`,
      industry: 'Technology & SaaS',
      status: 'Prospect',
      size: '11-50',
    });
  },

  // ── DEALS & KANBAN PIPELINE ────────────────────────────────
  async getDeals({ orgId, ownerId = null, stage = '', priority = '', search = '', page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' }) {
    if (isMongoConnected()) {
      const filter = { orgId };
      if (ownerId) filter.ownerId = ownerId;
      if (stage) filter.stage = stage;
      if (priority) filter.priority = priority;
      if (search) {
        const regex = new RegExp(search.trim(), 'i');
        filter.$or = [{ name: regex }, { companyName: regex }, { contactName: regex }, { notes: regex }];
      }

      const total = await Deal.countDocuments(filter);
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
      const items = await Deal.find(filter).sort(sort).skip(skip).limit(limit).lean();
      return {
        items: items.map(i => ({
          ...i,
          id: i._id.toString(),
          weightedAmount: Math.round(((i.amount || 0) * (i.probability || 0)) / 100),
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, hasNext: page * limit < total, hasPrev: page > 1 },
      };
    }

    let items = Array.from(memoryDeals.values()).filter(d => d.orgId === orgId);
    if (ownerId) items = items.filter(d => d.ownerId === ownerId);
    if (stage) items = items.filter(d => d.stage === stage);
    if (priority) items = items.filter(d => d.priority === priority);
    if (search) {
      const q = search.trim().toLowerCase();
      items = items.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.companyName?.toLowerCase().includes(q) ||
        d.contactName?.toLowerCase().includes(q) ||
        d.notes?.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';
      if (typeof valA === 'number') return sortOrder === 'asc' ? valA - valB : valB - valA;
      return sortOrder === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    const total = items.length;
    const skip = (page - 1) * limit;
    const paginated = items.slice(skip, skip + limit);

    return {
      items: paginated.map(i => ({ ...i, weightedAmount: Math.round(((i.amount || 0) * (i.probability || 0)) / 100) })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, hasNext: page * limit < total, hasPrev: page > 1 },
    };
  },

  async getDealsPipeline({ orgId, ownerId = null }) {
    // Collect all deals in organization matching ownership filter
    let allDeals = [];
    if (isMongoConnected()) {
      const filter = { orgId };
      if (ownerId) filter.ownerId = ownerId;
      const docs = await Deal.find(filter).lean();
      allDeals = docs.map(i => ({ ...i, id: i._id.toString() }));
    } else {
      allDeals = Array.from(memoryDeals.values()).filter(d => d.orgId === orgId);
      if (ownerId) allDeals = allDeals.filter(d => d.ownerId === ownerId);
    }

    const stages = ['qualification', 'proposal', 'negotiation', 'closing', 'won', 'lost'];
    const columns = {};

    let totalPipelineValue = 0;
    let weightedPipelineValue = 0;
    let wonRevenue = 0;
    let wonCount = 0;
    let closedCount = 0;

    for (const st of stages) {
      const stageDeals = allDeals.filter(d => d.stage === st);
      const totalAmount = stageDeals.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
      const stageProb = STAGE_CONFIG[st]?.probability ?? 20;
      const weightedAmount = Math.round(stageDeals.reduce((acc, d) => acc + ((Number(d.amount) || 0) * (Number(d.probability) || stageProb)) / 100, 0));

      columns[st] = {
        key: st,
        label: STAGE_CONFIG[st]?.label || st,
        color: STAGE_CONFIG[st]?.color || '#94a3b8',
        defaultProbability: stageProb,
        count: stageDeals.length,
        totalAmount,
        weightedAmount,
        deals: stageDeals.map(d => ({
          ...d,
          weightedAmount: Math.round(((d.amount || 0) * (d.probability || stageProb)) / 100),
        })),
      };

      if (st !== 'lost') {
        totalPipelineValue += totalAmount;
        weightedPipelineValue += weightedAmount;
      }
      if (st === 'won') {
        wonRevenue += totalAmount;
        wonCount += stageDeals.length;
        closedCount += stageDeals.length;
      }
      if (st === 'lost') {
        closedCount += stageDeals.length;
      }
    }

    const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

    return {
      success: true,
      metrics: {
        totalDeals: allDeals.length,
        totalPipelineValue,
        weightedPipelineValue,
        wonRevenue,
        wonCount,
        winRate,
      },
      columns,
    };
  },

  async getDealById(id, orgId) {
    if (isMongoConnected()) {
      const doc = await Deal.findOne({ _id: id, orgId }).lean();
      return doc ? { ...doc, id: doc._id.toString(), weightedAmount: Math.round(((doc.amount || 0) * (doc.probability || 0)) / 100) } : null;
    }
    const deal = memoryDeals.get(id);
    return (deal && deal.orgId === orgId) ? { ...deal, weightedAmount: Math.round(((deal.amount || 0) * (deal.probability || 0)) / 100) } : null;
  },

  async createDeal(data) {
    const defaultProb = STAGE_CONFIG[data.stage]?.probability ?? 20;
    const probability = data.probability !== undefined ? Number(data.probability) : defaultProb;

    if (isMongoConnected()) {
      const doc = await Deal.create({ ...data, probability });
      const obj = doc.toObject();
      return { ...obj, id: obj._id.toString(), weightedAmount: Math.round(((obj.amount || 0) * (obj.probability || 0)) / 100) };
    }

    const id = `deal-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const deal = {
      ...data,
      id,
      probability,
      stageHistory: [],
      weightedAmount: Math.round(((data.amount || 0) * probability) / 100),
      createdAt: now,
      updatedAt: now,
    };
    memoryDeals.set(id, deal);
    return deal;
  },

  async updateDeal(id, orgId, updates) {
    if (updates.stage && STAGE_CONFIG[updates.stage]) {
      if (updates.probability === undefined) {
        updates.probability = STAGE_CONFIG[updates.stage].probability;
      }
    }

    if (isMongoConnected()) {
      const updated = await Deal.findOneAndUpdate({ _id: id, orgId }, updates, { new: true }).lean();
      return updated ? { ...updated, id: updated._id.toString(), weightedAmount: Math.round(((updated.amount || 0) * (updated.probability || 0)) / 100) } : null;
    }

    const deal = memoryDeals.get(id);
    if (!deal || deal.orgId !== orgId) return null;
    const updated = {
      ...deal,
      ...updates,
      weightedAmount: Math.round(((updates.amount ?? deal.amount ?? 0) * (updates.probability ?? deal.probability ?? 20)) / 100),
      updatedAt: new Date().toISOString(),
    };
    memoryDeals.set(id, updated);
    return updated;
  },

  // ── Drag & Drop Stage Transition Handler ────────────────────
  async transitionDealStage({ dealId, orgId, newStage, userId, userName, note = '', lostReason = '' }) {
    if (!STAGE_CONFIG[newStage]) {
      throw new Error(`Invalid stage '${newStage}'. Must be one of: ${Object.keys(STAGE_CONFIG).join(', ')}`);
    }

    const deal = await this.getDealById(dealId, orgId);
    if (!deal) {
      throw new Error('Deal not found in this organization');
    }

    const oldStage = deal.stage;
    if (oldStage === newStage) {
      return deal; // No change needed
    }

    const newProbability = STAGE_CONFIG[newStage].probability;
    const now = new Date().toISOString();

    const transitionRecord = {
      fromStage: oldStage,
      toStage: newStage,
      changedAt: now,
      changedBy: userId,
      changedByName: userName,
      note: note.trim() || `Moved from ${STAGE_CONFIG[oldStage]?.label || oldStage} to ${STAGE_CONFIG[newStage]?.label || newStage}`,
    };

    const stageHistory = [...(deal.stageHistory || []), transitionRecord];

    const updates = {
      stage: newStage,
      probability: newProbability,
      stageHistory,
      updatedAt: now,
    };

    if (newStage === 'won') {
      updates.actualCloseDate = now;
      // If linked to company, update company dealsValue
      if (deal.companyId) {
        const comp = await this.getCompanyById(deal.companyId, orgId);
        if (comp) {
          await this.updateCompany(deal.companyId, orgId, {
            status: 'Active Client',
            dealsValue: (comp.dealsValue || 0) + (Number(deal.amount) || 0),
          });
        }
      }
    } else if (newStage === 'lost') {
      updates.actualCloseDate = now;
      if (lostReason) updates.lostReason = lostReason.trim();
    } else {
      updates.actualCloseDate = null;
    }

    return this.updateDeal(dealId, orgId, updates);
  },

  async deleteDeal(id, orgId) {
    if (isMongoConnected()) {
      const res = await Deal.findOneAndDelete({ _id: id, orgId });
      return Boolean(res);
    }
    const deal = memoryDeals.get(id);
    if (!deal || deal.orgId !== orgId) return false;
    return memoryDeals.delete(id);
  },

  // ── ACTIVITIES & TASKS ──────────────────────────────────────
  async getActivities({
    orgId,
    entityType = '',
    entityId = '',
    type = '',
    status = '',
    priority = '',
    assignedTo = '',
    search = '',
    page = 1,
    limit = 20,
    sortBy = 'dueDate',
    sortOrder = 'asc',
  }) {
    if (isMongoConnected()) {
      const filter = { orgId };
      if (entityType && entityType !== 'all') filter.entityType = entityType;
      if (entityId) filter.entityId = entityId;
      if (type && type !== 'all') filter.type = type;
      if (status && status !== 'all') filter.status = status;
      if (priority && priority !== 'all') filter.priority = priority;
      if (assignedTo && assignedTo !== 'all') filter.assignedTo = assignedTo;
      if (search) {
        const regex = new RegExp(search.trim(), 'i');
        filter.$or = [{ title: regex }, { description: regex }, { entityName: regex }, { assignedToName: regex }];
      }

      const total = await Activity.countDocuments(filter);
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
      const items = await Activity.find(filter).sort(sort).skip(skip).limit(limit).lean();

      return {
        items: items.map(i => ({ ...i, id: i._id.toString() })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    }

    // In-memory fallback
    let list = Array.from(memoryActivities.values()).filter(a => a.orgId === orgId);

    if (entityType && entityType !== 'all') {
      list = list.filter(a => a.entityType === entityType);
    }
    if (entityId) {
      list = list.filter(a => a.entityId === entityId);
    }
    if (type && type !== 'all') {
      list = list.filter(a => a.type === type);
    }
    if (status && status !== 'all') {
      if (status === 'overdue') {
        const now = new Date().toISOString();
        list = list.filter(a => a.status === 'pending' && a.dueDate && a.dueDate < now);
      } else if (status === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10);
        list = list.filter(a => a.dueDate && a.dueDate.slice(0, 10) === todayStr);
      } else {
        list = list.filter(a => a.status === status);
      }
    }
    if (priority && priority !== 'all') {
      list = list.filter(a => a.priority === priority);
    }
    if (assignedTo && assignedTo !== 'all') {
      list = list.filter(a => a.assignedTo === assignedTo);
    }
    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        a =>
          (a.title && a.title.toLowerCase().includes(q)) ||
          (a.description && a.description.toLowerCase().includes(q)) ||
          (a.entityName && a.entityName.toLowerCase().includes(q)) ||
          (a.assignedToName && a.assignedToName.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      let va = a[sortBy] ?? '';
      let vb = b[sortBy] ?? '';
      if (sortBy === 'dueDate') {
        // Put items without dueDate at the end
        if (!va) return 1;
        if (!vb) return -1;
      }
      if (va < vb) return sortOrder === 'asc' ? -1 : 1;
      if (va > vb) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = list.length;
    const skip = (page - 1) * limit;
    const paginated = list.slice(skip, skip + Number(limit));

    return {
      items: paginated,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  },

  async getActivityTimeline(orgId, { entityType = '', entityId = '', limit = 30 } = {}) {
    // MongoDB path
    if (isMongoConnected()) {
      const filter = { orgId };
      if (entityType && entityType !== 'all') filter.entityType = entityType;
      if (entityId) filter.entityId = entityId;

      const items = await Activity.find(filter)
        .sort({ updatedAt: -1 })
        .limit(Number(limit))
        .lean();

      return items.map(i => ({ ...i, id: i._id.toString() }));
    }

    // In-memory fallback
    let list = Array.from(memoryActivities.values()).filter(a => a.orgId === orgId);

    if (entityType && entityType !== 'all') {
      list = list.filter(a => a.entityType === entityType);
    }
    if (entityId) {
      list = list.filter(a => a.entityId === entityId);
    }

    // Sort descending by activity date (completedAt or dueDate or createdAt)
    list.sort((a, b) => {
      const da = a.completedAt || a.dueDate || a.createdAt;
      const db = b.completedAt || b.dueDate || b.createdAt;
      return new Date(db) - new Date(da);
    });

    return list.slice(0, Number(limit));
  },

  async getActivityById(id, orgId) {
    if (isMongoConnected()) {
      const doc = await Activity.findOne({ _id: id, orgId }).lean();
      return doc ? { ...doc, id: doc._id.toString() } : null;
    }
    const act = memoryActivities.get(id);
    return act && act.orgId === orgId ? { ...act } : null;
  },

  async createActivity(data) {
    const id = `act-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    const activity = {
      id,
      orgId: data.orgId,
      type: data.type || 'task',
      title: data.title.trim(),
      description: (data.description || '').trim(),
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      dueDate: data.dueDate || null,
      reminderDate: data.reminderDate || null,
      reminderSent: Boolean(data.reminderSent),
      entityType: data.entityType || 'none',
      entityId: data.entityId || null,
      entityName: data.entityName || '',
      assignedTo: data.assignedTo,
      assignedToName: data.assignedToName || '',
      creatorId: data.creatorId,
      creatorName: data.creatorName || '',
      completedAt: data.status === 'completed' ? now : null,
      completedBy: data.status === 'completed' ? data.creatorId : null,
      completedByName: data.status === 'completed' ? data.creatorName : '',
      outcome: data.outcome || '',
      createdAt: now,
      updatedAt: now,
    };

    if (isMongoConnected()) {
      const doc = await Activity.create({ ...activity, _id: id });
      return { ...doc.toObject(), id };
    }

    memoryActivities.set(id, activity);
    return { ...activity };
  },

  async updateActivity(id, orgId, updates) {
    const act = await this.getActivityById(id, orgId);
    if (!act) return null;

    const now = new Date().toISOString();
    const updated = {
      ...act,
      ...updates,
      updatedAt: now,
    };

    if (updates.status === 'completed' && !act.completedAt) {
      updated.completedAt = now;
      updated.completedBy = updates.completedBy || act.assignedTo;
      updated.completedByName = updates.completedByName || act.assignedToName;
    } else if (updates.status && updates.status !== 'completed') {
      updated.completedAt = null;
      updated.completedBy = null;
      updated.completedByName = '';
    }

    if (isMongoConnected()) {
      const doc = await Activity.findOneAndUpdate({ _id: id, orgId }, updated, { new: true }).lean();
      return doc ? { ...doc, id: doc._id.toString() } : null;
    }

    memoryActivities.set(id, updated);
    return { ...updated };
  },

  async completeActivity(id, orgId, completedBy, completedByName) {
    const act = await this.getActivityById(id, orgId);
    if (!act) return null;

    const isCurrentlyCompleted = act.status === 'completed';
    const newStatus = isCurrentlyCompleted ? 'pending' : 'completed';
    const now = new Date().toISOString();

    const updates = {
      status: newStatus,
      completedAt: newStatus === 'completed' ? now : null,
      completedBy: newStatus === 'completed' ? completedBy : null,
      completedByName: newStatus === 'completed' ? completedByName : '',
      updatedAt: now,
    };

    return this.updateActivity(id, orgId, updates);
  },

  async deleteActivity(id, orgId) {
    if (isMongoConnected()) {
      const res = await Activity.findOneAndDelete({ _id: id, orgId });
      return Boolean(res);
    }
    const act = memoryActivities.get(id);
    if (!act || act.orgId !== orgId) return false;
    return memoryActivities.delete(id);
  },

  // ── NOTIFICATIONS ───────────────────────────────────────────
  async getNotifications(orgId, userId, { limit = 30, unreadOnly = false } = {}) {
    if (isMongoConnected()) {
      const filter = {
        orgId,
        $or: [{ userId }, { userId: null }],
      };
      if (unreadOnly) filter.read = false;

      const items = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .lean();

      const unreadCount = await Notification.countDocuments({
        orgId,
        read: false,
        $or: [{ userId }, { userId: null }],
      });

      return {
        notifications: items.map(i => ({ ...i, id: i._id.toString() })),
        unreadCount,
      };
    }

    let list = Array.from(memoryNotifications.values()).filter(
      n => n.orgId === orgId && (n.userId === userId || n.userId === null)
    );

    const unreadCount = list.filter(n => !n.read).length;

    if (unreadOnly) {
      list = list.filter(n => !n.read);
    }

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      notifications: list.slice(0, Number(limit)),
      unreadCount,
    };
  },

  async getUnreadNotificationsCount(orgId, userId) {
    if (isMongoConnected()) {
      return Notification.countDocuments({
        orgId,
        read: false,
        $or: [{ userId }, { userId: null }],
      });
    }

    return Array.from(memoryNotifications.values()).filter(
      n => n.orgId === orgId && (n.userId === userId || n.userId === null) && !n.read
    ).length;
  },

  async createNotification(data) {
    const id = `notif-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    const notif = {
      id,
      orgId: data.orgId,
      userId: data.userId || null,
      type: data.type || 'system',
      title: data.title.trim(),
      message: data.message.trim(),
      link: data.link || '',
      entityType: data.entityType || 'none',
      entityId: data.entityId || null,
      read: false,
      createdAt: now,
      updatedAt: now,
    };

    if (isMongoConnected()) {
      const doc = await Notification.create({ ...notif, _id: id });
      return { ...doc.toObject(), id };
    }

    memoryNotifications.set(id, notif);
    return { ...notif };
  },

  async markNotificationRead(id, orgId, userId) {
    if (isMongoConnected()) {
      const res = await Notification.findOneAndUpdate(
        { _id: id, orgId, $or: [{ userId }, { userId: null }] },
        { read: true },
        { new: true }
      ).lean();
      return res ? { ...res, id: res._id.toString() } : null;
    }

    const ntf = memoryNotifications.get(id);
    if (!ntf || ntf.orgId !== orgId) return null;
    if (ntf.userId !== null && ntf.userId !== userId) return null;

    ntf.read = true;
    ntf.updatedAt = new Date().toISOString();
    return { ...ntf };
  },

  async markAllNotificationsRead(orgId, userId) {
    if (isMongoConnected()) {
      await Notification.updateMany(
        { orgId, read: false, $or: [{ userId }, { userId: null }] },
        { read: true }
      );
      return true;
    }

    for (const [id, ntf] of memoryNotifications.entries()) {
      if (ntf.orgId === orgId && (ntf.userId === userId || ntf.userId === null) && !ntf.read) {
        ntf.read = true;
        ntf.updatedAt = new Date().toISOString();
      }
    }
    return true;
  },

  async deleteNotification(id, orgId, userId) {
    if (isMongoConnected()) {
      const res = await Notification.findOneAndDelete({
        _id: id,
        orgId,
        $or: [{ userId }, { userId: null }],
      });
      return Boolean(res);
    }

    const ntf = memoryNotifications.get(id);
    if (!ntf || ntf.orgId !== orgId) return false;
    if (ntf.userId !== null && ntf.userId !== userId) return false;

    return memoryNotifications.delete(id);
  },

  // ── Pending Reminders Scanner ──────────────────────────────
  async checkPendingReminders() {
    const now = new Date();
    const triggered = [];

    if (isMongoConnected()) {
      // MongoDB: find activities with reminder due and not yet sent
      const duePending = await Activity.find({
        status: 'pending',
        reminderDate: { $lte: now },
        reminderSent: false,
      }).lean();

      for (const doc of duePending) {
        // Mark reminder sent
        await Activity.findByIdAndUpdate(doc._id, { reminderSent: true });

        const notif = await this.createNotification({
          orgId: doc.orgId,
          userId: doc.assignedTo,
          type: 'task_reminder',
          title: `Reminder: ${doc.title}`,
          message: `Your ${doc.type} "${doc.title}" is due soon.`,
          link: '#/tasks',
          entityType: doc.type,
          entityId: doc._id.toString(),
        });

        triggered.push({ activity: doc, notification: notif });
      }
      return triggered;
    }

    // In-memory fallback
    for (const act of memoryActivities.values()) {
      if (act.status !== 'pending') continue;

      // Check if reminderDate reached and not yet sent
      if (act.reminderDate && !act.reminderSent && new Date(act.reminderDate) <= now) {
        act.reminderSent = true;
        act.updatedAt = now.toISOString();

        const notif = await this.createNotification({
          orgId: act.orgId,
          userId: act.assignedTo,
          type: 'task_reminder',
          title: `Reminder: ${act.title}`,
          message: `Your ${act.type} "${act.title}" is due soon.`,
          link: '#/tasks',
          entityType: act.type,
          entityId: act.id,
        });

        triggered.push({ activity: act, notification: notif });
      }
    }

    return triggered;
  },

  // ── AUDIT LOGS ──────────────────────────────────────────────
  async createAuditLog(data) {
    const id = `audit-${uuidv4().slice(0, 8)}`;
    const logItem = {
      id,
      orgId: data.orgId,
      userId: data.userId || 'system',
      userName: data.userName || 'System',
      userRole: data.userRole || 'user',
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId ? String(data.entityId) : '',
      entityName: data.entityName || '',
      details: data.details || {},
      ipAddress: data.ipAddress || '',
      createdAt: data.createdAt || new Date().toISOString(),
    };

    if (isMongoConnected()) {
      try {
        const doc = await AuditLog.create(logItem);
        return doc.toObject();
      } catch (err) {
        console.error('Mongo audit log error:', err);
      }
    }

    memoryAuditLogs.set(id, logItem);
    return logItem;
  },

  async getAuditLogs(options = {}) {
    const { orgId, entityType, action, entityId, limit = 50, page = 1 } = options;

    if (isMongoConnected()) {
      const query = { orgId };
      if (entityType) query.entityType = entityType;
      if (action) query.action = action;
      if (entityId) query.entityId = entityId;

      const total = await AuditLog.countDocuments(query);
      const items = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      return { total, page, limit, items: items.map(i => ({ ...i, id: i.id || i._id?.toString() })) };
    }

    let logs = Array.from(memoryAuditLogs.values()).filter(l => l.orgId === orgId);
    if (entityType) logs = logs.filter(l => l.entityType === entityType);
    if (action) logs = logs.filter(l => l.action === action);
    if (entityId) logs = logs.filter(l => l.entityId === entityId);

    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = logs.length;
    const items = logs.slice((page - 1) * limit, page * limit);
    return { total, page, limit, items };
  },

  // ── EMAILS ──────────────────────────────────────────────────
  async createEmail(data) {
    const id = `email-${uuidv4().slice(0, 8)}`;
    const emailItem = {
      id,
      orgId: data.orgId,
      senderId: data.senderId,
      senderName: data.senderName || '',
      senderEmail: data.senderEmail,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName || '',
      entityType: data.entityType || 'lead',
      entityId: data.entityId ? String(data.entityId) : null,
      entityName: data.entityName || '',
      subject: data.subject,
      body: data.body,
      templateId: data.templateId || null,
      status: data.status || 'sent',
      failureReason: data.failureReason || null,
      sentAt: data.sentAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMongoConnected()) {
      try {
        const doc = await Email.create(emailItem);
        return doc.toObject();
      } catch (err) {
        console.error('Mongo createEmail error:', err);
      }
    }

    memoryEmails.set(id, emailItem);
    return emailItem;
  },

  async getEmails(options = {}) {
    const { orgId, entityType, entityId, limit = 50, page = 1 } = options;

    if (isMongoConnected()) {
      const query = { orgId };
      if (entityType) query.entityType = entityType;
      if (entityId) query.entityId = entityId;

      const total = await Email.countDocuments(query);
      const items = await Email.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      return { total, page, limit, items: items.map(i => ({ ...i, id: i.id || i._id?.toString() })) };
    }

    let emails = Array.from(memoryEmails.values()).filter(e => e.orgId === orgId);
    if (entityType) emails = emails.filter(e => e.entityType === entityType);
    if (entityId) emails = emails.filter(e => e.entityId === entityId);

    emails.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = emails.length;
    const items = emails.slice((page - 1) * limit, page * limit);
    return { total, page, limit, items };
  },

  async getEmailById(id, orgId) {
    if (isMongoConnected()) {
      const item = await Email.findOne({ _id: id, orgId }).lean();
      if (item) return { ...item, id: item._id.toString() };
    }
    const mem = memoryEmails.get(id);
    return (mem && mem.orgId === orgId) ? mem : null;
  },

  // ── ATTACHMENTS ─────────────────────────────────────────────
  async createAttachment(data) {
    const id = `att-${uuidv4().slice(0, 8)}`;
    const attItem = {
      id,
      orgId: data.orgId,
      uploadedBy: data.uploadedBy || { userId: 'unknown', name: 'Unknown', role: 'user' },
      entityType: data.entityType,
      entityId: data.entityId ? String(data.entityId) : '',
      fileName: data.fileName,
      fileSize: data.fileSize || 0,
      mimeType: data.mimeType || 'application/octet-stream',
      filePath: data.filePath || '',
      fileData: data.fileData || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMongoConnected()) {
      try {
        const doc = await Attachment.create(attItem);
        return doc.toObject();
      } catch (err) {
        console.error('Mongo createAttachment error:', err);
      }
    }

    memoryAttachments.set(id, attItem);
    return attItem;
  },

  async getAttachments(options = {}) {
    const { orgId, entityType, entityId } = options;

    if (isMongoConnected()) {
      const query = { orgId };
      if (entityType) query.entityType = entityType;
      if (entityId) query.entityId = entityId;

      const items = await Attachment.find(query).sort({ createdAt: -1 }).lean();
      return items.map(i => {
        const { fileData, ...meta } = i;
        return { ...meta, id: i.id || i._id?.toString() };
      });
    }

    let atts = Array.from(memoryAttachments.values()).filter(a => a.orgId === orgId);
    if (entityType) atts = atts.filter(a => a.entityType === entityType);
    if (entityId) atts = atts.filter(a => a.entityId === entityId);

    atts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return atts.map(({ fileData, ...meta }) => meta);
  },

  async getAttachmentById(id, orgId) {
    if (isMongoConnected()) {
      const item = await Attachment.findOne({ _id: id, orgId }).lean();
      if (item) return { ...item, id: item._id.toString() };
    }
    const mem = memoryAttachments.get(id);
    return (mem && mem.orgId === orgId) ? mem : null;
  },

  async deleteAttachment(id, orgId) {
    if (isMongoConnected()) {
      const res = await Attachment.deleteOne({ _id: id, orgId });
      return res.deletedCount > 0;
    }
    const mem = memoryAttachments.get(id);
    if (mem && mem.orgId === orgId) {
      return memoryAttachments.delete(id);
    }
    return false;
  },
};

