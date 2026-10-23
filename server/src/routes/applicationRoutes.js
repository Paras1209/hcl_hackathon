/**
 * Application Routes
 * Wires HTTP URLs to applicationController.
 */

const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');

// Submit new application
router.post('/', applicationController.submitApplication);

// Retrieve application by ID
router.get('/:id', applicationController.getApplicationById);

module.exports = router;
