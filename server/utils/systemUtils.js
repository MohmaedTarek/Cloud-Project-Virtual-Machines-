const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');
const config = require('../config/config');

/**
 * Check if a port is free
 * @param {number} port - The port to check
 * @returns {Promise<boolean>} - True if port is free, false otherwise
 */
const isPortFree = (port) => {
    return new Promise((resolve) => {
        const server = require('net').createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
};

/**
 * Calculate size in bytes from a value and unit
 * @param {number} value - The numeric value
 * @param {string} unit - The unit (K, M, G)
 * @returns {number} - Size in bytes
 */
const calculateSizeInBytes = (value, unit) => {
    const multipliers = {
        'K': 1024,
        'M': 1024 * 1024,
        'G': 1024 * 1024 * 1024
    };
    return value * multipliers[unit];
};

/**
 * Format size in human-readable format
 * @param {number} sizeInBytes - Size in bytes
 * @returns {string} - Formatted size with units
 */
const formatSize = (sizeInBytes) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = sizeInBytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
};

/**
 * Check if QEMU is available in the system
 * @returns {Promise<boolean>} - True if QEMU is available, false otherwise
 */
const checkQemuAvailability = async () => {
    try {
        await new Promise((resolve, reject) => {
            exec(`"${config.QEMU_IMG}" --version`, (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve(stdout);
            });
        });
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Gets disk usage for a specific directory
 * @param {string} dirPath - The directory path to check
 * @returns {Promise<object>} - Object containing disk usage stats
 */
const getDiskUsage = (dirPath) => {
    return new Promise((resolve, reject) => {
        // Use different commands based on OS
        const cmd = process.platform === 'win32' 
            ? `powershell "Get-PSDrive ${path.parse(dirPath).root[0]} | Select-Object Used,Free"` 
            : `df -k "${dirPath}"`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            
            try {
                let total, free, used;
                
                if (process.platform === 'win32') {
                    // Parse PowerShell output
                    const lines = stdout.trim().split('\n');
                    if (lines.length >= 3) {
                        const parts = lines[2].trim().split(/\s+/);
                        used = parseInt(parts[0]);
                        free = parseInt(parts[1]);
                        total = used + free;
                    }
                } else {
                    // Parse df output
                    const lines = stdout.trim().split('\n');
                    if (lines.length >= 2) {
                        const parts = lines[1].trim().split(/\s+/);
                        total = parseInt(parts[1]) * 1024;
                        used = parseInt(parts[2]) * 1024;
                        free = parseInt(parts[3]) * 1024;
                    }
                }
                
                if (total && free !== undefined && used !== undefined) {
                    resolve({
                        total: formatSize(total),
                        free: formatSize(free),
                        used: formatSize(used),
                        percentFree: ((free / total) * 100).toFixed(2),
                        percentUsed: ((used / total) * 100).toFixed(2)
                    });
                } else {
                    reject(new Error('Could not parse disk usage information'));
                }
            } catch (parseError) {
                reject(parseError);
            }
        });
    });
};

/**
 * Gets system memory usage
 * @returns {object} - Object containing memory usage stats
 */
const getMemoryUsage = () => {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return {
        total: formatSize(totalMemory),
        free: formatSize(freeMemory),
        used: formatSize(usedMemory),
        percentFree: ((freeMemory / totalMemory) * 100).toFixed(2),
        percentUsed: ((usedMemory / totalMemory) * 100).toFixed(2)
    };
};

/**
 * Gets CPU usage
 * @returns {Promise<object>} - Object containing CPU usage stats
 */
const getCpuUsage = () => {
    return new Promise((resolve) => {
        const cpus = os.cpus();
        const cpuCount = cpus.length;
        
        // This is a simple approximation, not super accurate
        // For more accurate CPU usage, you would need to sample multiple times
        const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
        const totalTick = cpus.reduce((acc, cpu) => 
            acc + Object.values(cpu.times).reduce((sum, time) => sum + time, 0), 0);
        
        const usage = 100 - (totalIdle / totalTick * 100);
        
        setTimeout(() => {
            resolve({
                total: cpuCount,
                usage: usage.toFixed(2)
            });
        }, 1000); // Wait 1 second for a more accurate reading
    });
};

// Ensure a directory exists
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

module.exports = {
    isPortFree,
    calculateSizeInBytes,
    formatSize,
    checkQemuAvailability,
    getDiskUsage,
    getMemoryUsage,
    getCpuUsage,
    ensureDirectoryExists
};
