/**
 * Server Entrypoint
 */

const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 OnboardIQ Server running on port ${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;
