require('dotenv').config();

const required = [
  'MONGODB_URI',
  'JWT_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: process.env.MONGODB_URI,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || 'onboardiq-documents',

  RESEND_API_KEY: process.env.RESEND_API_KEY,
  FROM_EMAIL: process.env.FROM_EMAIL || 'onboarding@onboardiq.com',

  EXTRACTION_PROVIDER: process.env.EXTRACTION_PROVIDER || 'mock',

  CORE_BANKING_API_URL: process.env.CORE_BANKING_API_URL || 'http://localhost:5000/api/mock/core-banking',
  CORE_BANKING_API_KEY: process.env.CORE_BANKING_API_KEY || 'mock-key-12345',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '1048576', 10),
  ALLOWED_FILE_TYPES: (process.env.ALLOWED_FILE_TYPES || '.txt').split(','),

  ENABLE_CRON_JOBS: process.env.ENABLE_CRON_JOBS !== 'false',
};
