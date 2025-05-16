const express = require('express');
const router = express.Router();
const DiskController = require('../controllers/diskController');

// Get all disks
router.get('/', DiskController.getAllDisks);

// Get specific disk info
router.get('/:name', DiskController.getDiskInfo);

// Create a new disk
router.post('/', DiskController.createDisk);

// Delete a disk
router.delete('/:name', DiskController.deleteDisk);

module.exports = router;
