/**
 * Seed Script - Developer 2 Critical Deliverable
 * 
 * Loads into MongoDB:
 * 1. Watchlists (Sanctions + PEP) from CSV files (if present), else mock data
 * 2. Configuration (rules thresholds from rules_config JSON)
 * 3. Existing Customers (for duplicate detection)
 * 4. Seed users (applicant, officer, compliance officer for testing)
 * 
 * Usage: node scripts/seedDatabase.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const User = require('../src/models/User');
const Watchlist = require('../src/models/Watchlist');
const Configuration = require('../src/models/Configuration');
const ExistingCustomer = require('../src/models/ExistingCustomer');
const { generateToken } = require('../src/utils/hash');

const MONGODB_URI = process.env.MONGODB_URI;
const BCRYPT_ROUNDS = 10;

// ─── Default rules config (loaded from JSON if available, else hardcoded defaults) ──

const DEFAULT_CONFIG = {
  min_field_confidence: 0.80,
  name_match_threshold: 0.80,
  high_risk_income_threshold: 2500000,
  watchlist_match_threshold: 0.85,
  pep_match_threshold: 0.90,
  sanctions_match_threshold: 0.85,
  rekyc_low_risk_years: 5,
  rekyc_medium_risk_years: 3,
  rekyc_high_risk_years: 1,
  resubmission_window_days: 7,
  max_documents_per_application: 10,
  title_prefixes: ['MR', 'MRS', 'MS', 'DR', 'SHRI', 'SHRIMATI'],
  high_risk_occupations: ['POLITICIAN', 'GOVERNMENT_OFFICIAL', 'ARMS_DEALER'],
};

// ─── Mock Sanctions Data (used if CSV not available) ──────────────────────────

const MOCK_SANCTIONS = [
  { list_id: 'SAN0001', name: 'RAHUL SHARMA', alias: 'R SHARMA', nationality: 'IND', program: 'OFAC' },
  { list_id: 'SAN0002', name: 'ARJUN MEHTA', alias: 'A MEHTA', nationality: 'IND', program: 'UN' },
  { list_id: 'SAN0003', name: 'VIKRAM PATEL', alias: null, nationality: 'IND', program: 'EU' },
  { list_id: 'SAN0004', name: 'SUNITA GUPTA', alias: 'S GUPTA', nationality: 'IND', program: 'OFAC' },
  { list_id: 'SAN0005', name: 'RAJESH MALHOTRA', alias: null, nationality: 'IND', program: 'FATF' },
];

// ─── Mock PEP Data ─────────────────────────────────────────────────────────────

const MOCK_PEPS = [
  { list_id: 'PEP0001', name: 'SURESH KUMAR', alias: null, nationality: 'IND', position: 'MINISTER', category: 'DOMESTIC' },
  { list_id: 'PEP0002', name: 'ANJALI SINGH', alias: 'A SINGH', nationality: 'IND', position: 'MP', category: 'DOMESTIC' },
  { list_id: 'PEP0003', name: 'MOHAN VERMA', alias: null, nationality: 'IND', position: 'BUREAUCRAT', category: 'DOMESTIC' },
  { list_id: 'PEP0004', name: 'PRIYA NAIR', alias: null, nationality: 'IND', position: 'JUDGE', category: 'DOMESTIC' },
  { list_id: 'PEP0005', name: 'AMIT TIWARI', alias: null, nationality: 'IND', position: 'POLICE_OFFICER', category: 'DOMESTIC' },
];

// ─── Mock Existing Customers ───────────────────────────────────────────────────

const MOCK_CUSTOMERS = [
  { customer_id: 'CUST001', full_name: 'RAMESH GUPTA', pan_number: 'ABCPG1234R', dob: new Date('1975-03-15') },
  { customer_id: 'CUST002', full_name: 'MEENA SHARMA', pan_number: 'DEFPS5678M', dob: new Date('1980-07-22') },
  { customer_id: 'CUST003', full_name: 'KRISHNA REDDY', pan_number: 'GHIPR9012K', dob: new Date('1990-11-30') },
];

// ─── Seed Users ────────────────────────────────────────────────────────────────

const SEED_USERS = [
  {
    user_id: 'USR_APPLICANT_01',
    email: 'applicant@test.com',
    password: 'password123',
    full_name: 'Test Applicant',
    role: 'APPLICANT',
  },
  {
    user_id: 'USR_OFFICER_01',
    email: 'officer@test.com',
    password: 'password123',
    full_name: 'Test KYC Officer',
    role: 'KYC_OFFICER',
  },
  {
    user_id: 'USR_OFFICER_02',
    email: 'officer2@test.com',
    password: 'password123',
    full_name: 'Test KYC Officer 2',
    role: 'KYC_OFFICER',
  },
  {
    user_id: 'USR_COMPLIANCE_01',
    email: 'compliance@test.com',
    password: 'password123',
    full_name: 'Test Compliance Officer',
    role: 'COMPLIANCE_OFFICER',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function loadConfigFromFile() {
  // Try to load from data directory
  const configPath = path.join(__dirname, '../src/data/rules_config.json');
  if (fs.existsSync(configPath)) {
    console.log('📂 Loading rules config from file:', configPath);
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  // Also try alternative filename
  const altPath = path.join(__dirname, '../src/data/case_02_rules_config_V1.0.json');
  if (fs.existsSync(altPath)) {
    console.log('📂 Loading rules config from file:', altPath);
    return JSON.parse(fs.readFileSync(altPath, 'utf-8'));
  }

  console.log('⚠️  No rules config file found, using defaults');
  return DEFAULT_CONFIG;
}

async function seedConfig(config) {
  console.log('⚙️  Seeding configuration...');
  const ops = Object.entries(config).map(([key, value]) => ({
    updateOne: {
      filter: { config_key: key },
      update: { $set: { config_key: key, value, description: `Rule threshold: ${key}` } },
      upsert: true,
    },
  }));
  await Configuration.bulkWrite(ops);
  console.log(`✅ Seeded ${ops.length} config entries`);
}

async function seedWatchlists() {
  console.log('🔍 Seeding watchlists...');

  // Try CSV files first
  let sanctions = MOCK_SANCTIONS;
  let peps = MOCK_PEPS;

  const sanctionsPath = path.join(__dirname, '../src/data/sanctions.csv');
  const pepPath = path.join(__dirname, '../src/data/pep.csv');

  if (fs.existsSync(sanctionsPath)) {
    console.log('📂 Loading sanctions from CSV...');
    // Simple CSV parse (header row assumed)
    const lines = fs.readFileSync(sanctionsPath, 'utf-8').trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    sanctions = lines.slice(1).map(line => {
      const vals = line.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h] = (vals[i] || '').trim());
      return obj;
    });
  }

  if (fs.existsSync(pepPath)) {
    console.log('📂 Loading PEPs from CSV...');
    const lines = fs.readFileSync(pepPath, 'utf-8').trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    peps = lines.slice(1).map(line => {
      const vals = line.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h] = (vals[i] || '').trim());
      return obj;
    });
  }

  // Upsert sanctions
  const sanctionOps = sanctions.map(s => ({
    updateOne: {
      filter: { list_id: s.list_id },
      update: { $set: { list_type: 'SANCTIONS', list_id: s.list_id, name: s.name, alias: s.alias || null, nationality: s.nationality, program: s.program || null } },
      upsert: true,
    },
  }));
  if (sanctionOps.length) await Watchlist.bulkWrite(sanctionOps);
  console.log(`✅ Seeded ${sanctionOps.length} sanctions entries`);

  // Upsert PEPs
  const pepOps = peps.map(p => ({
    updateOne: {
      filter: { list_id: p.list_id },
      update: { $set: { list_type: 'PEP', list_id: p.list_id, name: p.name, alias: p.alias || null, nationality: p.nationality, position: p.position || null, category: p.category || null } },
      upsert: true,
    },
  }));
  if (pepOps.length) await Watchlist.bulkWrite(pepOps);
  console.log(`✅ Seeded ${pepOps.length} PEP entries`);
}

async function seedExistingCustomers() {
  console.log('👥 Seeding existing customers...');

  let customers = MOCK_CUSTOMERS;

  const csvPath = path.join(__dirname, '../src/data/existing_customers.csv');
  if (fs.existsSync(csvPath)) {
    console.log('📂 Loading customers from CSV...');
    const lines = fs.readFileSync(csvPath, 'utf-8').trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    customers = lines.slice(1).map(line => {
      const vals = line.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h] = (vals[i] || '').trim());
      return obj;
    });
  }

  const ops = customers.map(c => ({
    updateOne: {
      filter: { customer_id: c.customer_id },
      update: { $set: { customer_id: c.customer_id, full_name: c.full_name, pan_number: c.pan_number, dob: c.dob ? new Date(c.dob) : null } },
      upsert: true,
    },
  }));
  if (ops.length) await ExistingCustomer.bulkWrite(ops);
  console.log(`✅ Seeded ${ops.length} existing customers`);
}

async function seedUsers() {
  console.log('👤 Seeding test users...');
  for (const u of SEED_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`  ↩️  User ${u.email} already exists, skipping`);
      continue;
    }
    const password_hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    await User.create({ ...u, password_hash });
    console.log(`  ✅ Created user: ${u.email} (${u.role})`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const config = await loadConfigFromFile();
  await seedConfig(config);
  await seedWatchlists();
  await seedExistingCustomers();
  await seedUsers();

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Test credentials:');
  SEED_USERS.forEach(u => {
    console.log(`  ${u.role}: ${u.email} / ${u.password}`);
  });

  await mongoose.disconnect();
  console.log('\n✅ Done. MongoDB disconnected.');
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
