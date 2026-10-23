/**
 * Batch Routes
 * Exposes POST /api/batch/process
 */

const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');

// Batch process files and generate decisions_output.csv
router.post('/process', batchController.processBatchApplications);

module.exports = router;
