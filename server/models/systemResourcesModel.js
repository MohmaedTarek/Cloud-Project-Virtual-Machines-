const os = require('os');
const fs = require('fs');
const config = require('../config/config');
const { formatSize, getDiskUsage, getMemoryUsage, getCpuUsage } = require('../utils/systemUtils');

class SystemResources {
    /**
     * Get comprehensive system resource information
     * @returns {Promise<Object>} System resource information
     */
    static async getSystemResources() {
        try {
            // Get memory information
            const memoryInfo = getMemoryUsage();
            
            // Get CPU information
            const cpuInfo = await getCpuUsage();
            
            // Get disk information
            const diskInfo = await getDiskUsage(config.DISK_DIR);
            
            return {
                memory: memoryInfo,
                cpu: cpuInfo,
                disk: diskInfo
            };
        } catch (error) {
            console.error('Error getting system resources:', error);
            throw error;
        }
    }

    /**
     * Check system resources and return warnings if any
     * @returns {Promise<Array>} List of warning messages
     */
    static async checkSystemWarnings() {
        try {
            const resources = await this.getSystemResources();
            
            const warnings = [];
            
            // Check memory usage
            if (parseFloat(resources.memory.percentFree) < config.WARNING_THRESHOLDS.MEMORY_USAGE) {
                warnings.push(`Low system memory: only ${resources.memory.percentFree}% available`);
            }
            
            // Check CPU usage
            if (parseFloat(resources.cpu.usage) > config.WARNING_THRESHOLDS.CPU_USAGE) {
                warnings.push(`High CPU usage: ${resources.cpu.usage}%`);
            }
            
            // Check disk usage
            if (parseFloat(resources.disk.percentFree) < config.WARNING_THRESHOLDS.DISK_USAGE) {
                warnings.push(`Low disk space: only ${resources.disk.percentFree}% available`);
            }
            
            return warnings;
        } catch (error) {
            console.error('Error checking system warnings:', error);
            return ['Error checking system resources'];
        }
    }
}

module.exports = SystemResources;
