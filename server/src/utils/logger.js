const pino = require('pino');
const { NODE_ENV } = require('../config/env');

const logger = pino(
  NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
        level: 'debug',
      }
    : { level: 'info' }
);

module.exports = logger;
