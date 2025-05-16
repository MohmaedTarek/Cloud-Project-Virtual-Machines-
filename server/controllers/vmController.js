const VM = require('../models/vmModel');
const path = require('path');
const config = require('../config/config');

/**
 * Controller for virtual machine operations
 */
class VMController {
    /**
     * Get all running VMs
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getAllVMs(req, res) {
        try {
            const vms = VM.getAllVMs();
            res.json({ vms });
        } catch (error) {
            console.error('Error listing VMs:', error);
            res.status(500).json({
                error: 'Failed to list VMs',
                details: error.message
            });
        }
    }

    /**
     * Get a specific VM
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getVM(req, res) {
        const vmId = req.params.id;
        
        try {
            const vm = VM.getVM(vmId);
            
            if (!vm) {
                return res.status(404).json({ error: 'VM not found' });
            }
            
            res.json({ vm });
        } catch (error) {
            console.error(`Error getting VM ${vmId}:`, error);
            res.status(500).json({
                error: 'Failed to get VM info',
                details: error.message
            });
        }
    }

    /**
     * Start a new VM
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Object} io - Socket.IO instance for sending notifications
     */
    static async startVM(req, res, io) {
        const { disk, numCpus, memory } = req.body;
        
        if (!disk || !numCpus || !memory) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        try {
            const result = await VM.startVM({ disk, numCpus, memory }, io);
            
            // Notify clients about the new VM
            if (io) {
                io.emit('vm-started', {
                    vmId: result.vmId,
                    disk,
                    numCpus,
                    memory
                });
            }
            
            res.json({
                message: result.message,
                vmId: result.vmId,
                disk: result.disk
            });
        } catch (error) {
            console.error('Error starting VM:', error);
            
            // Determine appropriate status code
            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('Invalid') || 
                       error.message.includes('exceeds')) {
                statusCode = 400;
            }
            
            res.status(statusCode).json({
                error: 'Failed to start VM',
                details: error.message
            });
        }
    }

    /**
     * Stop a running VM
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async stopVM(req, res) {
        const vmId = req.params.id;
        
        try {
            const result = await VM.stopVM(vmId);
            res.json({ message: result.message });
        } catch (error) {
            console.error(`Error stopping VM ${vmId}:`, error);
            
            // Determine appropriate status code
            const statusCode = error.message.includes('not found') ? 404 : 500;
            
            res.status(statusCode).json({
                error: 'Failed to stop VM',
                details: error.message
            });
        }
    }

    /**
     * Clean up orphaned processes
     * Should be called on server start
     */
    static async cleanOrphanedProcesses() {
        try {
            await VM.cleanOrphanedProcesses();
            console.log('Cleaned up orphaned VM processes');
        } catch (error) {
            console.error('Error cleaning up orphaned processes:', error);
        }
    }

    /**
     * Clear the list of used VNC ports
     * Should be called on server start
     */
    static clearVncPorts() {
        VM.clearVncPorts();
        console.log('Cleared VNC ports list');
    }
}

module.exports = VMController;
