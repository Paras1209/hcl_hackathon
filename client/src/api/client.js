import axios from 'axios';
import {
  INITIAL_APPLICATIONS,
  INITIAL_DOCUMENTS,
  INITIAL_AUDIT_TRAIL,
  INITIAL_NOTIFICATIONS,
  INITIAL_RULES_CONFIG,
  INITIAL_WATCHLIST_SANCTIONS,
  INITIAL_WATCHLIST_PEP,
} from './mockData';
import { DEMO_USERS } from '../constants/roles';

// Configurable base URL with fallback to local backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('onboardiq_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const customError = {
      message: error.response?.data?.message || error.message || 'API request failed',
      status: error.response?.status || 500,
      details: error.response?.data?.details || null,
    };
    return Promise.reject(customError);
  }
);

// -------------------------------------------------------------
// CENTRAL MOCK DATA STORE (Client-side Demo Simulation)
// -------------------------------------------------------------

const STORAGE_KEYS = {
  APPLICATIONS: 'onboardiq_demo_applications',
  DOCUMENTS: 'onboardiq_demo_documents',
  AUDIT: 'onboardiq_demo_audit',
  NOTIFICATIONS: 'onboardiq_demo_notifications',
  RULES: 'onboardiq_demo_rules',
  SANCTIONS: 'onboardiq_demo_sanctions',
  PEP: 'onboardiq_demo_pep',
  CURRENT_USER: 'onboardiq_demo_user',
};

function loadStore(key, initialData) {
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn(`Error reading ${key} from sessionStorage`, e);
  }
  return initialData;
}

function saveStore(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Error saving ${key} to sessionStorage`, e);
  }
}

// In-memory runtime state backed by sessionStorage
let stateApplications = loadStore(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
let stateDocuments = loadStore(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
let stateAudit = loadStore(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_TRAIL);
let stateNotifications = loadStore(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
let stateRules = loadStore(STORAGE_KEYS.RULES, INITIAL_RULES_CONFIG);
let stateSanctions = loadStore(STORAGE_KEYS.SANCTIONS, INITIAL_WATCHLIST_SANCTIONS);
let statePep = loadStore(STORAGE_KEYS.PEP, INITIAL_WATCHLIST_PEP);

let currentUser = loadStore(STORAGE_KEYS.CURRENT_USER, DEMO_USERS.OFFICER);

export const mockDb = {
  getApplications: () => [...stateApplications],
  saveApplications: (apps) => {
    stateApplications = apps;
    saveStore(STORAGE_KEYS.APPLICATIONS, apps);
  },
  getDocuments: () => [...stateDocuments],
  saveDocuments: (docs) => {
    stateDocuments = docs;
    saveStore(STORAGE_KEYS.DOCUMENTS, docs);
  },
  getAudit: () => [...stateAudit],
  addAudit: (entry) => {
    const updated = [
      {
        id: `AUD_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        ...entry,
      },
      ...stateAudit,
    ];
    stateAudit = updated;
    saveStore(STORAGE_KEYS.AUDIT, updated);
  },
  getNotifications: () => [...stateNotifications],
  saveNotifications: (notifs) => {
    stateNotifications = notifs;
    saveStore(STORAGE_KEYS.NOTIFICATIONS, notifs);
  },
  addNotification: (notif) => {
    const updated = [
      {
        id: `NOTIF_${Date.now()}`,
        timestamp: new Date().toISOString(),
        read: false,
        ...notif,
      },
      ...stateNotifications,
    ];
    stateNotifications = updated;
    saveStore(STORAGE_KEYS.NOTIFICATIONS, updated);
  },
  getRules: () => ({ ...stateRules }),
  saveRules: (rules) => {
    stateRules = rules;
    saveStore(STORAGE_KEYS.RULES, rules);
  },
  getSanctions: () => [...stateSanctions],
  saveSanctions: (list) => {
    stateSanctions = list;
    saveStore(STORAGE_KEYS.SANCTIONS, list);
  },
  getPep: () => [...statePep],
  savePep: (list) => {
    statePep = list;
    saveStore(STORAGE_KEYS.PEP, list);
  },
  getCurrentUser: () => currentUser,
  setCurrentUser: (user) => {
    currentUser = user;
    saveStore(STORAGE_KEYS.CURRENT_USER, user);
  },
};

// Simulated network delay helper
export const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
