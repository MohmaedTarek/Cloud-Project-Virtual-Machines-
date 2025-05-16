const express = require('express');
const router = express.Router();
const SystemResourcesController = require('../controllers/systemResourcesController');

// Get system resources
router.get('/', SystemResourcesController.getSystemResources);

module.exports = router;
