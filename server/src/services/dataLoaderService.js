/**
 * Data Loader Service
 * Loads watchlists and existing customers from database or CSV files
 * Provides a single source of truth for application evaluation
 */

const path = require('path');
const fs = require('fs');
const { parse } = require('papaparse');

const DATASET_DIR = path.join(__dirname, '../../../dataset');

// Cache for CSV data to avoid re-reading files on every request
let csvCache = {
  sanctions: null,
  pep: null,
  existingCustomers: null,
  lastLoaded: null,
};

/**
 * Parse CSV file
 */
function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = parse(content, { header: true, skipEmptyLines: true });
  return result.data;
}

/**
 * Load watchlists and existing customers from CSV files (fallback)
 */
function loadFromCSV() {
  // Cache CSV data for 5 minutes
  if (csvCache.lastLoaded && Date.now() - csvCache.lastLoaded < 5 * 60 * 1000) {
    return {
      sanctions: csvCache.sanctions,
      pep: csvCache.pep,
      existingCustomers: csvCache.existingCustomers,
    };
  }

  console.log('Loading watchlists and existing customers from CSV files...');

  // Load sanctions
  const sanctionsPath = path.join(DATASET_DIR, 'case_02_sanctions_list_V1.0.csv');
  const sanctionsData = parseCSV(sanctionsPath) || [];
  csvCache.sanctions = sanctionsData.map(s => ({
    list_id: s.list_id,
    name: s.name,
    alias: s.alias || '',
    dob: s.dob || '',
    nationality: s.nationality || '',
    program: s.program || '',
  }));

  // Load PEP
  const pepPath = path.join(DATASET_DIR, 'case_02_pep_list_V1.0.csv');
  const pepData = parseCSV(pepPath) || [];
  csvCache.pep = pepData.map(p => ({
    pep_id: p.pep_id,
    name: p.name,
    dob: p.dob || '',
    position: p.position || '',
    category: p.category || '',
  }));

  // Load existing customers
  const existingCustomersPath = path.join(DATASET_DIR, 'case_02_existing_customers_V1.0.csv');
  const existingCustomersData = parseCSV(existingCustomersPath) || [];
  csvCache.existingCustomers = existingCustomersData.map(c => ({
    customer_id: c.customer_id,
    full_name: c.full_name,
    pan_number: c.pan_number,
    dob: c.dob || '',
  }));

  csvCache.lastLoaded = Date.now();

  console.log(`Loaded from CSV: ${csvCache.sanctions.length} sanctions, ${csvCache.pep.length} PEP entries, ${csvCache.existingCustomers.length} existing customers`);

  return {
    sanctions: csvCache.sanctions,
    pep: csvCache.pep,
    existingCustomers: csvCache.existingCustomers,
  };
}

/**
 * Load watchlists and existing customers from database or CSV fallback
 * This is the main function to use in controllers
 */
async function loadWatchlistsAndCustomers() {
  try {
    // Try to load from database first
    const Watchlist = require('../models/Watchlist');
    const ExistingCustomer = require('../models/ExistingCustomer');
    const mongoose = require('mongoose');

    // Check if database is connected
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      console.warn('Database not connected, falling back to CSV files');
      return loadFromCSV();
    }

    // Load sanctions list
    const sanctionsList = await Watchlist.find({ list_type: 'SANCTIONS' }).lean();
    const sanctions = sanctionsList.map(s => ({
      list_id: s.list_id,
      name: s.name,
      alias: s.alias || '',
      dob: s.dob ? new Date(s.dob).toISOString().split('T')[0] : '',
      nationality: s.nationality || '',
      program: s.program || '',
    }));

    // Load PEP list
    const pepList = await Watchlist.find({ list_type: 'PEP' }).lean();
    const pep = pepList.map(p => ({
      pep_id: p.list_id,
      name: p.name,
      dob: p.dob ? new Date(p.dob).toISOString().split('T')[0] : '',
      position: p.position || '',
      category: p.category || '',
    }));

    // Load existing customers
    const existingCustList = await ExistingCustomer.find().lean();
    const existingCustomers = existingCustList.map(c => ({
      customer_id: c.customer_id,
      full_name: c.full_name,
      pan_number: c.pan_number,
      dob: c.dob ? new Date(c.dob).toISOString().split('T')[0] : '',
    }));

    console.log(`Loaded from database: ${sanctions.length} sanctions, ${pep.length} PEP entries, ${existingCustomers.length} existing customers`);

    // If database returns empty results, fallback to CSV
    if (sanctions.length === 0 && pep.length === 0 && existingCustomers.length === 0) {
      console.warn('Database returned no data, falling back to CSV files');
      return loadFromCSV();
    }

    return { sanctions, pep, existingCustomers };
  } catch (err) {
    console.warn('Error loading from database, falling back to CSV files:', err.message);
    return loadFromCSV();
  }
}

module.exports = {
  loadWatchlistsAndCustomers,
  loadFromCSV,
};
