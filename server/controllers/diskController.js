const Disk = require('../models/diskModel');

/**
 * Controller for disk operations
 */
class DiskController {
    /**
     * Get all disk images
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getAllDisks(req, res) {
        try {
            const disks = await Disk.getAllDisks();
            res.json({ disks });
        } catch (error) {
            console.error('Error listing disks:', error);
            res.status(500).json({ 
                error: 'Failed to list disks', 
                details: error.message 
            });
        }
    }

    /**
     * Get information about a specific disk
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getDiskInfo(req, res) {
        const diskName = req.params.name;
        
        try {
            const diskInfo = await Disk.getDiskInfo(diskName);
            res.json({ disk: diskInfo });
        } catch (error) {
            console.error(`Error getting disk info for ${diskName}:`, error);
            
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                error: 'Failed to get disk info',
                details: error.message
            });
        }
    }

    /**
     * Create a new disk
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async createDisk(req, res) {
        const { format, size, name } = req.body;
        
        if (!format || !size || !name) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        try {
            const result = await Disk.createDisk({ format, size, name });
            res.json({
                message: result.message,
                diskName: result.name
            });
        } catch (error) {
            console.error('Error creating disk:', error);
            
            // Determine appropriate status code
            let statusCode = 500;
            if (error.message.includes('already exists') || 
                error.message.includes('Invalid')) {
                statusCode = 400;
            }
            
            res.status(statusCode).json({
                error: 'Failed to create disk',
                details: error.message
            });
        }
    }

    /**
     * Delete a disk
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async deleteDisk(req, res) {
        const diskName = req.params.name;
        
        try {
            const result = await Disk.deleteDisk(diskName);
            res.json({ message: result.message });
        } catch (error) {
            console.error(`Error deleting disk ${diskName}:`, error);
            
            // Determine appropriate status code
            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('in use')) {
                statusCode = 400;
            }
            
            res.status(statusCode).json({
                error: 'Failed to delete disk',
                details: error.message
            });
        }
    }
}

module.exports = DiskController;
