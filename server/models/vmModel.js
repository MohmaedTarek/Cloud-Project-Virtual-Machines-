const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config/config');
const { isPortFree, calculateSizeInBytes } = require('../utils/systemUtils');

// Store running VM processes 
const vmProcesses = {};
const usedVncPorts = [];

class VM {
    /**
     * Get all running virtual machines
     * @returns {Object} Dictionary of running VM processes
     */
    static getAllVMs() {
        return Object.entries(vmProcesses).map(([id, vm]) => ({
            id,
            disk: vm.disk,
            numCpus: vm.numCpus,
            memory: vm.memory
        }));
    }

    /**
     * Get a specific VM by ID
     * @param {string} vmId - ID of the VM
     * @returns {Object|null} VM information or null if not found
     */
    static getVM(vmId) {
        const vm = vmProcesses[vmId];
        if (!vm) return null;

        return {
            id: vmId,
            disk: vm.disk,
            numCpus: vm.numCpus,
            memory: vm.memory
        };
    }

    /**
     * Start a new virtual machine
     * @param {Object} vmData - VM creation parameters
     * @param {string} vmData.disk - Disk name
     * @param {number|string} vmData.numCpus - Number of CPUs
     * @param {string} vmData.memory - Memory size with unit
     * @returns {Promise<Object>} Result of VM creation
     */
    static async startVM(vmData, io) {
        const { disk, numCpus, memory } = vmData;
        
        // Validate disk exists
        const diskPath = path.join(config.DISK_DIR, disk);
        if (!fs.existsSync(diskPath)) {
            throw new Error(`Disk ${disk} not found`);
        }
        
        // Validate number of CPUs
        const cpuCount = parseInt(numCpus);
        if (isNaN(cpuCount) || cpuCount <= 0) {
            throw new Error('Number of CPUs must be a positive integer');
        }
        
        if (cpuCount > 32) { // Reasonable limit
            throw new Error('Number of CPUs cannot exceed 32');
        }
        
        // Validate memory format
        const memRegex = /^(\d+)(G|M)$/i;
        if (!memRegex.test(memory)) {
            throw new Error('Memory must be in format like 512M or 2G');
        }
        
        // Extract numeric value and unit from memory
        const [, memValue, memUnit] = memory.match(memRegex);
        if (parseInt(memValue) <= 0) {
            throw new Error('Memory size must be positive');
        }
        
        // Calculate memory in MB for validation
        const memInMB = memUnit.toUpperCase() === 'G' 
            ? parseInt(memValue) * 1024 
            : parseInt(memValue);
        
        // Check system memory to prevent over-allocation
        const availableMemBytes = os.freemem();
        const availableMemMB = availableMemBytes / (1024 * 1024);
        
        // Leave some headroom for the system (20%)
        const safeAvailableMB = availableMemMB * 0.8;
        if (memInMB > safeAvailableMB) {
            throw new Error(`Requested memory exceeds available system memory. Available: ${Math.floor(safeAvailableMB)}MB, Requested: ${memInMB}MB`);
        }
        
        // Build the arguments for QEMU
        const args = [
            "-cpu", "qemu64",
            "-smp", numCpus,
            "-m", memory,
            "-hda", diskPath,
            "-cdrom", config.ISO_PATH,
            "-boot", "d",
            // Display options for GUI
            "-display", "sdl",  // SDL window for display
            "-name", `VM-${disk}` // Set a name for the window
        ];
        
        console.log(`Starting VM with command: "${config.QEMU_SYSTEM}" ${args.join(' ')}`);
        
        // Use the full path to qemu-system-x86_64
        const vmProcess = spawn(config.QEMU_SYSTEM, args, { 
            windowsHide: false, // Show the window
            stdio: 'ignore'     // Don't redirect IO
        });
        
        const vmId = Date.now().toString();
        vmProcesses[vmId] = {
            process: vmProcess,
            disk,
            numCpus,
            memory
        };
        
        // Add event listener to detect when the VM process exits
        vmProcess.on('exit', (code, signal) => {
            console.log(`VM process ${vmId} exited with code ${code} and signal ${signal}`);
            
            // Remove VM from process list
            if (vmProcesses[vmId]) {
                delete vmProcesses[vmId];
                
                // Notify clients that the VM has stopped
                if (io) {
                    io.emit('vm-stopped', { vmId });
                }
                console.log(`Removed VM ${vmId} from running VMs list`);
            }
        });
        
        return {
            vmId,
            disk,
            numCpus,
            memory,
            message: 'VM started successfully in a new window.'
        };
    }

    /**
     * Stop a running virtual machine
     * @param {string} vmId - ID of the VM to stop
     * @returns {Object} Result of VM stopping
     */
    static async stopVM(vmId) {
        const vm = vmProcesses[vmId];
        if (!vm) {
            throw new Error('VM not found');
        }
        
        return new Promise((resolve, reject) => {
            try {
                if (process.platform === 'win32') {
                    // On Windows, we need to use taskkill because Node's process.kill() doesn't always work
                    exec(`taskkill /F /PID ${vm.process.pid}`, (error) => {
                        if (error) {
                            console.error(`Failed to kill process: ${error}`);
                            reject(error);
                            return;
                        }
                        
                        // Remove VM from process list
                        delete vmProcesses[vmId];
                        resolve({ message: 'VM stopped successfully' });
                    });
                } else {
                    vm.process.kill('SIGTERM');
                    
                    // Remove VM from process list
                    delete vmProcesses[vmId];
                    resolve({ message: 'VM stopped successfully' });
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Clean up orphaned QEMU processes
     * @returns {Promise<void>}
     */
    static async cleanOrphanedProcesses() {
        return new Promise((resolve, reject) => {
            if (process.platform === 'win32') {
                exec('tasklist /FI "IMAGENAME eq qemu-system-x86_64.exe" /FO CSV', (error, stdout) => {
                    if (error) {
                        console.error(`Error getting process list: ${error}`);
                        resolve();
                        return;
                    }
                    
                    if (stdout.includes('qemu-system-x86_64.exe')) {
                        exec('taskkill /F /IM qemu-system-x86_64.exe', (error) => {
                            if (error) {
                                console.error(`Error killing processes: ${error}`);
                            }
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            } else {
                exec("pkill -f qemu-system-x86_64", (error) => {
                    if (error && error.code !== 1) { // pkill returns 1 if no processes matched
                        console.error(`Error killing processes: ${error}`);
                    }
                    resolve();
                });
            }
        });
    }

    /**
     * Get next available VNC port
     * @returns {Promise<number>} Next available VNC port
     */
    static async getNextVncPort() {
        let port = 5901;
        while (usedVncPorts.includes(port) || !(await isPortFree(port))) {
            port++;
            if (port > 5950) {
                throw new Error("No available VNC ports found.");
            }
        }
        usedVncPorts.push(port);
        return port;
    }

    /**
     * Clear used VNC ports list
     */
    static clearVncPorts() {
        usedVncPorts.length = 0;
    }
}

module.exports = VM;
