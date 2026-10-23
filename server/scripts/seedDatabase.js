/**
 * Seed Script - Developer 2 Critical Deliverable
 * 
 * Loads into MongoDB from dataset folder:
 * 1. Watchlists (Sanctions + PEP) from CSV files
 * 2. Configuration (rules thresholds from rules_config JSON)
 * 3. Existing Customers (for duplicate detection)
 * 4. Applications and Documents from sample data
 * 5. Extraction mock data for documents
 * 6. Seed users (applicant, officer, compliance officer for testing)
 * 
 * Usage: node scripts/seedDatabase.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const { parse } = require('papaparse');
const User = require('../src/models/User');
const Application = require('../src/models/Application');
const Document = require('../src/models/Document');
const Watchlist = require('../src/models/Watchlist');
const Configuration = require('../src/models/Configuration');
const ExistingCustomer = require('../src/models/ExistingCustomer');

const MONGODB_URI = process.env.MONGODB_URI;
const BCRYPT_ROUNDS = 10;
const DATASET_DIR = path.join(__dirname, '../../dataset');

// ─── Helper Functions ──────────────────────────────────────────────────────────

function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = parse(content, { header: true, skipEmptyLines: true });
  return result.data;
}

function parseJSONL(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.trim().split('\n').map(line => JSON.parse(line));
}

function formatDate(dateString) {
  if (!dateString) return null;
  return new Date(dateString);
}

// ─── Default Configuration ─────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  min_field_confidence: 0.80,
  min_age: 18,
  pan_pattern: '^[A-Z]{5}[0-9]{4}[A-Z]$',
  pan_holder_type_char: 'P',
  name_match_threshold: 0.90,
  name_reject_below: 0.75,
  watchlist_match_threshold: 0.90,
  watchlist_possible_threshold: 0.80,
  address_proof_max_age_days: 90,
  medium_risk_income: 2500000,
  name_title_tokens: ['MR', 'MRS', 'MS', 'MISS', 'DR', 'SHRI', 'SMT', 'KUMARI'],
  resubmission_sla_days: 7,
  checker_sla_hours: 24,
  rekyc_years: {
    HIGH: 2,
    MEDIUM: 8,
    LOW: 10
  },
  mandatory_documents: ['PAN_CARD', 'AADHAAR_CARD', 'ADDRESS_PROOF'],
  address_proof_types: ['ELECTRICITY_BILL', 'BANK_STATEMENT', 'DRIVING_LICENCE'],
};

// ─── Seed Functions ────────────────────────────────────────────────────────────

async function loadConfigFromFile() {
  // Try to load from dataset directory
  const configPath = path.join(DATASET_DIR, 'case_02_rules_config_V1.0.json');
  if (fs.existsSync(configPath)) {
    console.log('📂 Loading rules config from file:', configPath);
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
  }

  console.log('⚠️  No rules config file found, using defaults');
  return DEFAULT_CONFIG;
}

async function seedConfig(config) {
  console.log('⚙️  Seeding configuration...');
  
  // Clear existing config first
  await Configuration.deleteMany({});
  
  const ops = Object.entries(config).map(([key, value]) => {
    // Handle nested objects like rekyc_years
    let formattedValue = value;
    if (typeof value === 'object' && !Array.isArray(value)) {
      formattedValue = JSON.stringify(value);
    }
    
    return {
      updateOne: {
        filter: { config_key: key },
        update: { 
          config_key: key, 
          value: formattedValue, 
          description: `Rule threshold: ${key}`,
          updated_at: new Date()
        },
        upsert: true,
      },
    };
  });
  
  await Configuration.bulkWrite(ops);
  console.log(`✅ Seeded ${ops.length} config entries`);
}

async function seedWatchlists() {
  console.log('🔍 Seeding watchlists...');

  // Load from dataset CSV files
  const sanctionsPath = path.join(DATASET_DIR, 'case_02_sanctions_list_V1.0.csv');
  const pepPath = path.join(DATASET_DIR, 'case_02_pep_list_V1.0.csv');

  // Clear existing watchlists
  await Watchlist.deleteMany({});

  // Load sanctions
  if (fs.existsSync(sanctionsPath)) {
    const sanctions = parseCSV(sanctionsPath);
    if (sanctions && sanctions.length > 0) {
      const sanctionOps = sanctions.map(s => ({
        updateOne: {
          filter: { list_id: s.list_id },
          update: { 
            $set: { 
              list_type: 'SANCTIONS', 
              list_id: s.list_id, 
              name: s.name, 
              alias: s.alias || null, 
              nationality: s.nationality, 
              program: s.program || null 
            } 
          },
          upsert: true,
        },
      }));
      await Watchlist.bulkWrite(sanctionOps);
      console.log(`✅ Seeded ${sanctionOps.length} sanctions entries`);
    }
  }

  // Load PEPs
  if (fs.existsSync(pepPath)) {
    const peps = parseCSV(pepPath);
    if (peps && peps.length > 0) {
      const pepOps = peps.map(p => ({
        updateOne: {
          filter: { list_id: p.list_id },
          update: { 
            $set: { 
              list_type: 'PEP', 
              list_id: p.list_id, 
              name: p.name, 
              alias: null, 
              nationality: null, 
              position: p.position, 
              category: p.category 
            } 
          },
          upsert: true,
        },
      }));
      await Watchlist.bulkWrite(pepOps);
      console.log(`✅ Seeded ${pepOps.length} PEP entries`);
    }
  }
}

async function seedExistingCustomers() {
  console.log('👥 Seeding existing customers...');

  const csvPath = path.join(DATASET_DIR, 'case_02_existing_customers_V1.0.csv');

  // Clear existing customers
  await ExistingCustomer.deleteMany({});

  if (fs.existsSync(csvPath)) {
    const customers = parseCSV(csvPath);
    if (customers && customers.length > 0) {
      const ops = customers.map(c => ({
        updateOne: {
          filter: { customer_id: c.customer_id },
          update: { 
            $set: { 
              customer_id: c.customer_id, 
              full_name: c.full_name, 
              pan_number: c.pan_number, 
              dob: c.dob ? formatDate(c.dob) : null 
            } 
          },
          upsert: true,
        },
      }));
      await ExistingCustomer.bulkWrite(ops);
      console.log(`✅ Seeded ${ops.length} existing customers`);
    }
  }
}

async function seedUsers() {
  console.log('👤 Seeding test users...');

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

  // Clear existing users
  await User.deleteMany({});

  for (const u of SEED_USERS) {
    const password_hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    await User.create({ ...u, password_hash });
    console.log(`  ✅ Created user: ${u.email} (${u.role})`);
  }
}

async function seedOccupations() {
  console.log('💼 Seeding occupations...');
  
  const csvPath = path.join(DATASET_DIR, 'case_02_occupations_V1.0.csv');
  
  if (fs.existsSync(csvPath)) {
    const occupations = parseCSV(csvPath);
    if (occupations && occupations.length > 0) {
      // Store occupations as config entries for reference
      const ops = occupations.map((occ, idx) => ({
        updateOne: {
          filter: { config_key: `occupation_${occ.occupation_code}` },
          update: {
            $set: {
              config_key: `occupation_${occ.occupation_code}`,
              value: JSON.stringify(occ),
              description: `Occupation: ${occ.description}`,
              updated_at: new Date()
            }
          },
          upsert: true,
        },
      }));
      await Configuration.bulkWrite(ops);
      console.log(`✅ Seeded ${ops.length} occupations`);
    }
  }
}

// ─── Application and Document Seeding ──────────────────────────────────────────

async function seedApplicationsAndDocuments() {
  console.log('📄 Seeding applications and documents...');
  
  // Load sample applications
  const applicationsPath = path.join(DATASET_DIR, 'case_02_applications_sample_V1.0.csv');
  const documentsPath = path.join(DATASET_DIR, 'case_02_documents_sample_V1.0.csv');
  const documentTextPath = path.join(DATASET_DIR, 'case_02_document_text_sample_V1.0.jsonl');
  const extractionMockPath = path.join(DATASET_DIR, 'case_02_extraction_mock_sample_V1.0.csv');

  // Clear existing applications and documents
  await Application.deleteMany({});
  await Document.deleteMany({});

  if (!fs.existsSync(applicationsPath)) {
    console.log('⚠️  Applications CSV not found, skipping application seeding');
    return;
  }

  // Load applications
  const applications = parseCSV(applicationsPath);
  if (!applications || applications.length === 0) {
    console.log('⚠️  No applications found, skipping');
    return;
  }

  console.log(`📋 Found ${applications.length} applications`);

  // Create a map of application_id to application data
  const appMap = new Map();
  const appOps = applications.map(app => ({
    updateOne: {
      filter: { application_id: app.application_id },
      update: {
        $set: {
          application_id: app.application_id,
          application_date: formatDate(app.application_date),
          full_name: app.full_name,
          dob: formatDate(app.dob),
          gender: app.gender,
          pan_number: app.pan_number,
          aadhaar_last4: app.aadhaar_last4,
          mobile: app.mobile,
          email: app.email,
          address: app.address,
          city: app.city,
          state: app.state,
          pincode: app.pincode,
          occupation_code: app.occupation_code,
          annual_income: parseInt(app.annual_income, 10) || 0,
          status: 'SUBMITTED',
          submitted_at: formatDate(app.application_date),
        }
      },
      upsert: true,
    },
  }));

  await Application.bulkWrite(appOps);
  console.log(`✅ Seeded ${appOps.length} applications`);

  // Create users for each application applicant
  console.log('👤 Creating applicant users...');
  const applicantUsers = applications.map((app, idx) => ({
    user_id: `APPLICANT_${app.application_id}`,
    email: app.email,
    password: 'password123',
    full_name: app.full_name,
    role: 'APPLICANT',
  }));

  for (const u of applicantUsers) {
    try {
      const existing = await User.findOne({ email: u.email });
      if (!existing) {
        const password_hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
        await User.create({ ...u, password_hash });
      }
    } catch (err) {
      // Continue if user creation fails (might already exist)
    }
  }

  // Load documents
  if (fs.existsSync(documentsPath)) {
    const documents = parseCSV(documentsPath);
    if (documents && documents.length > 0) {
      const docOps = documents.map(doc => ({
        updateOne: {
          filter: { doc_id: doc.doc_id },
          update: {
            $set: {
              doc_id: doc.doc_id,
              application_id: doc.application_id,
              file_name: doc.file_name,
              declared_doc_type: doc.declared_doc_type,
              uploaded_at: new Date(),
            }
          },
          upsert: true,
        },
      }));
      await Document.bulkWrite(docOps);
      console.log(`✅ Seeded ${docOps.length} document records`);
    }
  }

  // Load document text content from JSONL
  if (fs.existsSync(documentTextPath)) {
    const docTexts = parseJSONL(documentTextPath);
    if (docTexts && docTexts.length > 0) {
      console.log(`📝 Loading ${docTexts.length} document text entries...`);
      
      // Note: Document text is stored in JSONL but not in DB model currently
      // This can be used for extraction testing or logging
    }
  }

  // Load extraction mock data
  if (fs.existsSync(extractionMockPath)) {
    const extractionData = parseCSV(extractionMockPath);
    if (extractionData && extractionData.length > 0) {
      console.log(`📊 Loading ${extractionData.length} extraction mock entries...`);
      
      // Group extraction data by doc_id
      const extractionByDoc = new Map();
      for (const row of extractionData) {
        if (!extractionByDoc.has(row.doc_id)) {
          extractionByDoc.set(row.doc_id, []);
        }
        extractionByDoc.get(row.doc_id).push({
          field_name: row.field_name,
          value: row.value,
          confidence: parseFloat(row.confidence) || 0.5,
          source: 'EXTRACTION',
        });
      }

      // Update documents with extraction data
      for (const [docId, fields] of extractionByDoc) {
        await Document.updateOne(
          { doc_id: docId },
          { $set: { extracted_fields: fields, processed_at: new Date() } }
        );
      }
      
      console.log(`✅ Updated ${extractionByDoc.size} documents with extraction data`);
    }
  }

  console.log('✅ Applications and documents seeding completed');
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

  // Seed in order of dependencies
  await seedUsers();
  await seedConfig(await loadConfigFromFile());
  await seedOccupations();
  await seedWatchlists();
  await seedExistingCustomers();
  await seedApplicationsAndDocuments();

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Test credentials:');
  const SEED_USERS = [
    { role: 'APPLICANT', email: 'applicant@test.com', password: 'password123' },
    { role: 'KYC_OFFICER', email: 'officer@test.com', password: 'password123' },
    { role: 'COMPLIANCE_OFFICER', email: 'compliance@test.com', password: 'password123' },
  ];
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
