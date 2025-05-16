const express = require('express');
const router = express.Router();
const VMController = require('../controllers/vmController');

// Store the Socket.IO instance to use in controller methods
let io;

/**
 * Set the Socket.IO instance for this router
 * @param {Object} socketIO - Socket.IO instance
 */
const setSocketIO = (socketIO) => {
    io = socketIO;
};

// Get all VMs
router.get('/', VMController.getAllVMs);

// Get specific VM
router.get('/:id', VMController.getVM);

// Create and start VM
router.post('/', (req, res) => {
    VMController.startVM(req, res, io);
});

// Stop VM
router.delete('/:id', VMController.stopVM);

module.exports = { 
    router,
    setSocketIO
};
