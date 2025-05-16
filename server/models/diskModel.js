const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const config = require('../config/config');
const { calculateSizeInBytes, formatSize } = require('../utils/systemUtils');

class Disk {
    /**
     * Get all disk images
     * @returns {Promise<Array>} List of disk images
     */
    static async getAllDisks() {
        return new Promise((resolve, reject) => {
            fs.readdir(config.DISK_DIR, (err, files) => {
                if (err) {
                    return reject(err);
                }
                const disks = files.filter(file => fs.statSync(path.join(config.DISK_DIR, file)).isFile());
                resolve(disks);
            });
        });
    }

    /**
     * Get information about a specific disk
     * @param {string} diskName - Name of the disk
     * @returns {Promise<Object>} Disk information
     */
    static async getDiskInfo(diskName) {
        return new Promise((resolve, reject) => {
            const diskPath = path.join(config.DISK_DIR, diskName);
            
            if (!fs.existsSync(diskPath)) {
                return reject(new Error('Disk not found'));
            }

            exec(`"${config.QEMU_IMG}" info "${diskPath}"`, (error, stdout) => {
                if (error) {
                    return reject(error);
                }
                
                // Parse the output
                const info = {};
                const lines = stdout.split('\n');
                lines.forEach(line => {
                    const parts = line.split(':').map(p => p.trim());
                    if (parts.length >= 2) {
                        info[parts[0].toLowerCase().replace(/ /g, '_')] = parts[1];
                    }
                });
                
                // Add file stats
                const stats = fs.statSync(diskPath);
                info.size_on_disk = formatSize(stats.size);
                info.created_at = stats.birthtime;
                info.last_modified = stats.mtime;
                
                resolve(info);
            });
        });
    }

    /**
     * Create a new disk image
     * @param {Object} diskData - Disk creation parameters
     * @param {string} diskData.name - Disk name
     * @param {string} diskData.format - Disk format
     * @param {string} diskData.size - Disk size with unit
     * @returns {Promise<Object>} Result of disk creation
     */
    static async createDisk(diskData) {
        const { format, size, name } = diskData;
        
        // Validate disk format
        const validFormats = ["qcow2", "raw", "vdi", "vmdk", "vhdx"];
        if (!validFormats.includes(format)) {
            throw new Error('Invalid disk format');
        }
        
        // Validate disk size format
        const sizeRegex = /^(\d+)(G|M|K)$/i;
        if (!sizeRegex.test(size)) {
            throw new Error('Invalid disk size format. Use format like 10G, 1024M, or 2048K');
        }
        
        // Extract the numeric value and unit from size
        const [, sizeValue, unit] = size.match(sizeRegex);
        if (parseInt(sizeValue) <= 0) {
            throw new Error('Disk size must be positive');
        }
        
        // Check disk size limit based on available space
        const diskSizeInBytes = calculateSizeInBytes(parseInt(sizeValue), unit.toUpperCase());
        const stats = fs.statfsSync(config.DISK_DIR);
        const freeSpace = stats.bavail * stats.bsize;
        
        if (diskSizeInBytes > freeSpace * 0.95) { // Leave 5% margin
            throw new Error(`Disk size exceeds available space. Free space: ${formatSize(freeSpace)}, Requested: ${size}`);
        }
        
        // Validate disk name
        if (!/^[a-zA-Z0-9_\-\.]+$/.test(name)) {
            throw new Error('Invalid disk name. Use only letters, numbers, hyphens, underscores, and periods.');
        }
        
        const extensions = {
            "qcow2": ".qcow2",
            "raw": ".raw",
            "vdi": ".vdi",
            "vmdk": ".vmdk",
            "vhdx": ".vhdx"
        };
        
        let diskName = name;
        if (!name.endsWith(extensions[format])) {
            diskName += extensions[format];
        }
        
        const diskPath = path.join(config.DISK_DIR, diskName);
        
        // Check if disk already exists
        if (fs.existsSync(diskPath)) {
            throw new Error(`Disk ${diskName} already exists`);
        }
        
        return new Promise((resolve, reject) => {
            exec(`"${config.QEMU_IMG}" create -f ${format} "${diskPath}" ${size}`, (error, stdout, stderr) => {
                if (error) {
                    return reject(error);
                }
                
                resolve({ 
                    name: diskName, 
                    path: diskPath, 
                    size, 
                    format,
                    message: `Disk ${diskName} created successfully`
                });
            });
        });
    }

    /**
     * Delete a disk image
     * @param {string} diskName - Name of the disk to delete
     * @returns {Promise<Object>} Result of disk deletion
     */
    static async deleteDisk(diskName) {
        const diskPath = path.join(config.DISK_DIR, diskName);
        
        if (!fs.existsSync(diskPath)) {
            throw new Error('Disk not found');
        }
        
        return new Promise((resolve, reject) => {
            fs.unlink(diskPath, (err) => {
                if (err) {
                    return reject(err);
                }
                
                resolve({ 
                    message: `Disk ${diskName} deleted successfully`
                });
            });
        });
    }
}

module.exports = Disk;
