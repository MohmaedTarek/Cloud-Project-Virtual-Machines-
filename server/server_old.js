const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const config = require('./config/config');
const VMController = require('./controllers/vmController');
const SystemResourcesController = require('./controllers/systemResourcesController');
const { checkQemuAvailability } = require('./utils/systemUtils');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
    cors: {
        origin: config.CORS_ORIGIN,
        methods: ["GET", "POST"]
    }
});

// Set Socket.IO instance in vmRoutes
const { setSocketIO } = require('./routes/vmRoutes');
setSocketIO(io);

// Ensure disk_images directory exists
if (!fs.existsSync(DISK_DIR)) {
    fs.mkdirSync(DISK_DIR, { recursive: true });
}

// Helper function to check if port is free
function isPortFree(port) {
    return new Promise((resolve) => {
        const server = require('net').createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
}

// Helper function to calculate size in bytes
function calculateSizeInBytes(value, unit) {
    const multipliers = {
        'K': 1024,
        'M': 1024 * 1024,
        'G': 1024 * 1024 * 1024
    };
    return value * multipliers[unit];
}

// Helper function to format size in human-readable format
function formatSize(sizeInBytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = sizeInBytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Get next available VNC port
async function getNextVncPort() {
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

// Clean up orphaned processes
function cleanOrphanedProcesses() {
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

// API Routes

// Get all disks
app.get('/api/disks', (req, res) => {
    fs.readdir(DISK_DIR, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to list disks', details: err.message });
        }
        const disks = files.filter(file => fs.statSync(path.join(DISK_DIR, file)).isFile());
        res.json({ disks });
    });
});

// Create disk
app.post('/api/disks', (req, res) => {
    const { format, size, name } = req.body;
    
    if (!format || !size || !name) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Validate disk format
    const validFormats = ["qcow2", "raw", "vdi", "vmdk", "vhdx"];
    if (!validFormats.includes(format)) {
        return res.status(400).json({ error: 'Invalid disk format' });
    }
    
    // Validate disk size format
    const sizeRegex = /^(\d+)(G|M|K)$/i;
    if (!sizeRegex.test(size)) {
        return res.status(400).json({ error: 'Invalid disk size format. Use format like 10G, 1024M, or 2048K' });
    }
    
    // Extract the numeric value and unit from size
    const [, sizeValue, unit] = size.match(sizeRegex);
    if (parseInt(sizeValue) <= 0) {
        return res.status(400).json({ error: 'Disk size must be positive' });
    }
    
    // Check disk size limit based on available space
    try {
        const diskSizeInBytes = calculateSizeInBytes(parseInt(sizeValue), unit.toUpperCase());
        const stats = fs.statfsSync(DISK_DIR);
        const freeSpace = stats.bavail * stats.bsize;
        
        if (diskSizeInBytes > freeSpace * 0.95) { // Leave 5% margin
            return res.status(400).json({ 
                error: 'Disk size exceeds available space', 
                details: `Free space: ${formatSize(freeSpace)}, Requested: ${size}`
            });
        }
    } catch (err) {
        console.error(`Error checking disk space: ${err.message}`);
        // Continue even if disk space check fails
    }
    
    // Validate disk name
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(name)) {
        return res.status(400).json({ error: 'Invalid disk name. Use only letters, numbers, hyphens, underscores, and periods.' });
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
    
    // Check if disk already exists
    const diskPath = path.join(DISK_DIR, diskName);
    if (fs.existsSync(diskPath)) {
        return res.status(400).json({ error: `Disk with name ${diskName} already exists` });
    }
    
    // Ensure disk_images directory exists
    if (!fs.existsSync(DISK_DIR)) {
        try {
            fs.mkdirSync(DISK_DIR, { recursive: true });
            console.log(`Created disk directory: ${DISK_DIR}`);
        } catch (err) {
            console.error(`Error creating disk directory: ${err.message}`);
            return res.status(500).json({ error: 'Failed to create disk directory', details: err.message });
        }
    }
    // Use the full path to qemu-img
    const command = `"${QEMU_IMG}" create -f ${format} "${diskPath}" ${size}`;
    
    console.log(`Executing command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error creating disk: ${error.message}`);
            console.error(`Command stderr: ${stderr}`);
            return res.status(500).json({ 
                error: 'Failed to create disk', 
                details: error.message,
                stderr: stderr,
                command: command
            });
        }
        
        // Verify the file was actually created
        if (fs.existsSync(diskPath)) {
            console.log(`Successfully created disk at: ${diskPath}`);
            res.json({ message: `Disk ${diskName} created successfully`, diskName });
        } else {
            console.error(`Disk file was not created at: ${diskPath}`);
            res.status(500).json({ 
                error: 'Failed to create disk', 
                details: 'Command executed without error but file was not created',
                command: command
            });
        }
    });
});

// Delete disk
app.delete('/api/disks/:name', (req, res) => {
    const diskName = req.params.name;
    const diskPath = path.join(DISK_DIR, diskName);
    
    if (!fs.existsSync(diskPath)) {
        return res.status(404).json({ error: `Disk ${diskName} not found` });
    }
    
    // Check if the disk is in use by any running VM
    const runningVMs = Object.values(vmProcesses);
    const inUseVM = runningVMs.find(vm => vm.disk === diskName);
    
    if (inUseVM) {
        return res.status(400).json({ 
            error: 'Cannot delete disk that is in use',
            details: `Disk ${diskName} is currently in use by a running VM. Please stop the VM first.`
        });
    }
    
    try {
        // Check if file is accessible and writable
        fs.accessSync(diskPath, fs.constants.W_OK);
        
        // Delete the file
        fs.unlinkSync(diskPath);
        res.json({ message: `Disk ${diskName} deleted successfully` });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to delete disk', 
            details: error.message
        });
    }
});

// Create and start VM
app.post('/api/vms', async (req, res) => {
    const { disk, numCpus, memory } = req.body;
    
    if (!disk || !numCpus || !memory) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Validate disk existence
    const diskPath = path.join(DISK_DIR, disk);
    if (!fs.existsSync(diskPath)) {
        return res.status(404).json({ error: `Disk ${disk} not found` });
    }
    
    // Validate number of CPUs
    const cpuCount = parseInt(numCpus);
    if (isNaN(cpuCount) || cpuCount <= 0) {
        return res.status(400).json({ error: 'Number of CPUs must be a positive integer' });
    }
      // Get system info to determine max CPU count
    let maxCpuCount = 32; // Default fallback
    try {
        // Use globally imported os module
        maxCpuCount = os.cpus().length * 2; // Allow up to 2x physical cores
    } catch (err) {
        console.error(`Error getting CPU info: ${err.message}`);
    }
    
    if (cpuCount > maxCpuCount) {
        return res.status(400).json({ 
            error: 'CPU count exceeds system limit', 
            details: `Maximum recommended CPUs for this system: ${maxCpuCount}` 
        });
    }
    
    // Validate memory format
    const memRegex = /^(\d+)(G|M)$/i;
    if (!memRegex.test(memory)) {
        return res.status(400).json({ error: 'Memory must be in format like 512M or 2G' });
    }
    
    // Extract numeric value and unit from memory
    const [, memValue, memUnit] = memory.match(memRegex);
    if (parseInt(memValue) <= 0) {
        return res.status(400).json({ error: 'Memory size must be positive' });
    }
    
    // Convert memory to MB for comparison
    const memInMB = memUnit.toUpperCase() === 'G' 
      ? parseInt(memValue) * 1024 
      : parseInt(memValue);
      // Get system info to determine available memory
    let availableMemMB = 65536; // Default fallback (64GB)
    try {
        // Use globally imported os module
        const totalMemBytes = os.totalmem();
        const availableMemBytes = os.freemem();
        
        // Use 80% of total memory as the absolute max
        const maxMemBytes = totalMemBytes * 0.8;
        availableMemMB = Math.floor(Math.min(availableMemBytes, maxMemBytes) / (1024 * 1024));
        
        if (memInMB > availableMemMB) {
            return res.status(400).json({ 
                error: 'Memory size exceeds available system memory',
                details: `Available memory: ${Math.floor(availableMemMB)}MB, Requested: ${memInMB}MB`
            });
        }
    } catch (err) {
        console.error(`Error checking system memory: ${err.message}`);
        
        // Fallback to a generic limit check if system check fails
        if (memInMB > 65536) { // 64GB in MB
            return res.status(400).json({ error: 'Memory size exceeds maximum limit of 64GB' });
        }
    }
    
    try {
        // Build the arguments for QEMU
        // No longer using VNC, we'll display in a window instead
        const args = [
            "-cpu", "qemu64",
            "-smp", numCpus,
            "-m", memory,
            "-hda", diskPath,
            "-cdrom", ISO_PATH,
            "-boot", "d",
            // Display options for GUI
            "-display", "sdl",  // SDL window for display
            "-name", `VM-${disk}` // Set a name for the window
        ];
        
        console.log(`Starting VM with command: "${QEMU_SYSTEM}" ${args.join(' ')}`);
          // Use the full path to qemu-system-x86_64, but don't detach
        // so the VM window stays visible
        const vmProcess = spawn(QEMU_SYSTEM, args, { 
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
                io.emit('vm-stopped', { vmId });
                console.log(`Removed VM ${vmId} from running VMs list`);
            }
        });
          // No need to unref() as we want the process to be connected to parent
        
        res.json({ 
            message: `VM started successfully in a new window.`,
            vmId,
            disk
        });
        
        // Notify clients about the new VM
        io.emit('vm-started', { 
            vmId,
            disk,
            numCpus,
            memory
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to start VM', details: error.message });
    }
});

// Stop VM
app.delete('/api/vms/:id', (req, res) => {
    const vmId = req.params.id;
    const vm = vmProcesses[vmId];
    
    if (!vm) {
        return res.status(404).json({ error: 'VM not found' });
    }
    
    try {
        if (process.platform === 'win32') {
            // On Windows, we need to use taskkill because Node's process.kill() doesn't always work
            exec(`taskkill /F /PID ${vm.process.pid}`, (error) => {
                if (error) {
                    console.error(`Failed to kill process: ${error}`);
                }
            });
        } else {
            vm.process.kill('SIGTERM');
        }
          // No need to track VNC ports anymore since we're using direct window display
        
        // Remove VM from process list
        delete vmProcesses[vmId];
        
        res.json({ message: `VM stopped successfully` });
        
        // Notify clients
        io.emit('vm-stopped', { vmId });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to stop VM', details: error.message });
    }
});

// Get all running VMs
app.get('/api/vms', (req, res) => {
    const vms = Object.entries(vmProcesses).map(([id, vm]) => ({
        id,
        disk: vm.disk,
        numCpus: vm.numCpus,
        memory: vm.memory
    }));
    
    res.json({ vms });
});

// Socket.io event handlers
io.on('connection', (socket) => {
    console.log('Client connected');
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Cleanup before shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    await cleanOrphanedProcesses();
    
    // Clean up any VMs we started
    Object.values(vmProcesses).forEach(vm => {
        try {
            vm.process.kill('SIGTERM');
        } catch (error) {
            console.error(`Error stopping VM: ${error}`);
        }
    });
    
    process.exit(0);
});

// Check if qemu-img is installed
function checkQemuAvailability() {
    return new Promise((resolve, reject) => {
        // Try to check if QEMU exists at the specified path
        fs.access(QEMU_IMG, fs.constants.F_OK, (err) => {
            if (err) {
                console.error(`⚠️ QEMU not found at ${QEMU_IMG}`);
                console.error('Trying to access qemu-img via PATH...');
                
                // If not found at the specified path, try via PATH
                exec('qemu-img --version', (error, stdout, stderr) => {
                    if (error) {
                        console.error('⚠️ qemu-img command not found. Make sure QEMU is installed and in the system PATH.');
                        console.error(`Error: ${error.message}`);
                        resolve(false);
                    } else {
                        console.log(`✅ Found QEMU via PATH: ${stdout.trim()}`);
                        resolve(true);
                    }
                });
            } else {
                // If found at the specified path, verify it works
                exec(`"${QEMU_IMG}" --version`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`⚠️ QEMU found at ${QEMU_IMG}, but execution failed.`);
                        console.error(`Error: ${error.message}`);
                        resolve(false);
                    } else {
                        console.log(`✅ Found QEMU at ${QEMU_IMG}: ${stdout.trim()}`);
                        resolve(true);
                    }
                });
            }
        });
    });
}

// Function to check system resources
async function checkSystemResources() {
    try {
        // Use the globally imported os module
        const availableMemBytes = os.freemem();
        const totalMemBytes = os.totalmem();
        const cpuCount = os.cpus().length;
        
        // Check disk space
        const stats = fs.statfsSync(DISK_DIR);
        const freeSpace = stats.bavail * stats.bsize;
        const totalSpace = stats.blocks * stats.bsize;
        
        // Get CPU usage (approximation)
        const cpuUsage = await getCpuUsage();
        
        // Calculate percentages
        const memPercentFree = (availableMemBytes / totalMemBytes) * 100;
        const diskPercentFree = (freeSpace / totalSpace) * 100;
        
        // Prepare resource status
        const resourceStatus = {
            memory: {
                total: formatSize(totalMemBytes),
                free: formatSize(availableMemBytes),
                percentFree: memPercentFree.toFixed(2)
            },
            cpu: {
                total: cpuCount,
                usage: cpuUsage.toFixed(2)
            },
            disk: {
                total: formatSize(totalSpace),
                free: formatSize(freeSpace),
                percentFree: diskPercentFree.toFixed(2)
            }
        };
        
        // Emit resource status to clients
        io.emit('system-resources', resourceStatus);
        
        // Check for low resources and emit warnings
        let warnings = [];
        if (memPercentFree < 15) {
            warnings.push(`Low system memory: only ${memPercentFree.toFixed(2)}% available`);
        }
        if (diskPercentFree < 10) {
            warnings.push(`Low disk space: only ${diskPercentFree.toFixed(2)}% available`);
        }
        if (cpuUsage > 85) {
            warnings.push(`High CPU usage: ${cpuUsage.toFixed(2)}%`);
        }
        
        if (warnings.length > 0) {
            io.emit('system-warnings', { warnings });
        }
    } catch (err) {
        console.error(`Error checking system resources: ${err.message}`);
    }
}

// Helper function to estimate CPU usage
function getCpuUsage() {
    return new Promise((resolve) => {
        const startMeasure = os.cpus().map(cpu => ({
            idle: cpu.times.idle,
            total: Object.values(cpu.times).reduce((acc, tv) => acc + tv, 0)
        }));
        
        setTimeout(() => {
            const endMeasure = os.cpus().map(cpu => ({
                idle: cpu.times.idle,
                total: Object.values(cpu.times).reduce((acc, tv) => acc + tv, 0)
            }));
            
            const idleDifferences = [];
            const totalDifferences = [];
            
            for (let i = 0; i < startMeasure.length; i++) {
                const idleDifference = endMeasure[i].idle - startMeasure[i].idle;
                const totalDifference = endMeasure[i].total - startMeasure[i].total;
                
                idleDifferences.push(idleDifference);
                totalDifferences.push(totalDifference);
            }
            
            const idleAvg = idleDifferences.reduce((acc, idle) => acc + idle, 0) / idleDifferences.length;
            const totalAvg = totalDifferences.reduce((acc, total) => acc + total, 0) / totalDifferences.length;
            
            const cpuUsage = 100 - (idleAvg / totalAvg * 100);
            resolve(cpuUsage);
        }, 100);
    });
}

// Add a new API endpoint to get system resources
app.get('/api/system-resources', async (req, res) => {
    try {
        // Use the globally imported os module
        const availableMemBytes = os.freemem();
        const totalMemBytes = os.totalmem();
        const cpuCount = os.cpus().length;
        
        // Check disk space
        const stats = fs.statfsSync(DISK_DIR);
        const freeSpace = stats.bavail * stats.bsize;
        const totalSpace = stats.blocks * stats.bsize;
        
        res.json({
            memory: {
                total: formatSize(totalMemBytes),
                free: formatSize(availableMemBytes),
                percentFree: ((availableMemBytes / totalMemBytes) * 100).toFixed(2)
            },
            cpu: {
                total: cpuCount
            },
            disk: {
                total: formatSize(totalSpace),
                free: formatSize(freeSpace),
                percentFree: ((freeSpace / totalSpace) * 100).toFixed(2)
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get system resources', details: err.message });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    
    // Clean up any orphaned processes on startup
    await cleanOrphanedProcesses();
    usedVncPorts.length = 0; // Clear the list
    
    // Check QEMU availability
    const qemuAvailable = await checkQemuAvailability();
    if (!qemuAvailable) {
        console.warn('⚠️ QEMU tools not found. Disk and VM operations may fail.');
        console.warn('Make sure QEMU is installed and the bin directory is in your PATH environment variable.');
    }
    
    // Log important paths
    console.log(`Disk directory: ${DISK_DIR}`);
    console.log(`ISO path: ${ISO_PATH}`);
    
    // Periodically check system resources and alert if low
    setInterval(checkSystemResources, 60000); // Check every minute
});
