const mongoose = require('mongoose');
const { MONGODB_URI, NODE_ENV } = require('./env');
const logger = require('../utils/logger');

const options = {
  serverSelectionTimeoutMS: 5000,
};

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, options);
    logger.info(`MongoDB connected: ${MONGODB_URI}`);
  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed');
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  logger.error({ err }, 'MongoDB connection error');
});

module.exports = { connectDB };
