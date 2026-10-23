/**
 * Application Routes
 * Wires HTTP URLs to applicationController.
 */

const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const upload = require('../middleware/upload');

// Submit new application with document uploads
router.post('/', upload.array('documents', 10), applicationController.submitApplication);

// Retrieve application by ID
router.get('/:id', applicationController.getApplicationById);

module.exports = router;
