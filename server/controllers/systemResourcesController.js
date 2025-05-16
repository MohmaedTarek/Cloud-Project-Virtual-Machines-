const SystemResources = require('../models/systemResourcesModel');

/**
 * Controller for system resource operations
 */
class SystemResourcesController {
    /**
     * Get all system resources
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */    static async getSystemResources(req, res) {
        try {
            const resources = await SystemResources.getSystemResources();
            res.json(resources);
        } catch (error) {
            console.error('Error getting system resources:', error);
            res.status(500).json({
                error: 'Failed to get system resources',
                details: error.message
            });
        }
    }

    /**
     * Check system resources and emit warnings if necessary
     * @param {Object} io - Socket.IO instance for sending notifications
     */
    static async checkSystemResources(io) {
        try {
            const resources = await SystemResources.getSystemResources();
            
            // Emit resource status to clients
            if (io) {
                io.emit('system-resources', resources);
            }
            
            // Check for warnings
            const warnings = await SystemResources.checkSystemWarnings();
            if (warnings.length > 0 && io) {
                io.emit('system-warnings', { warnings });
            }
            
            return { resources, warnings };
        } catch (error) {
            console.error('Error checking system resources:', error);
            return { error: error.message };
        }
    }
}

module.exports = SystemResourcesController;
