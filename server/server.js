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

// Cleanup before shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    await VMController.cleanOrphanedProcesses();
    process.exit(0);
});

// Start the server
server.listen(config.PORT, async () => {
    console.log(`Server running on port ${config.PORT}`);
    
    // Clean up any orphaned processes on startup
    await VMController.cleanOrphanedProcesses();
    VMController.clearVncPorts();
    
    // Check QEMU availability
    const qemuAvailable = await checkQemuAvailability();
    if (!qemuAvailable) {
        console.warn('⚠️ QEMU tools not found. Disk and VM operations may fail.');
        console.warn('Make sure QEMU is installed and the bin directory is in your PATH environment variable.');
    }
    
    // Log important paths
    console.log(`Disk directory: ${config.DISK_DIR}`);
    console.log(`ISO path: ${config.ISO_PATH}`);
    
    // Periodically check system resources and alert if low
    setInterval(() => {
        SystemResourcesController.checkSystemResources(io);
    }, config.RESOURCE_CHECK_INTERVAL);
    
    // Initial resource check
    try {
        await SystemResourcesController.checkSystemResources(io);
        console.log("Initial system resource check completed");
    } catch (err) {
        console.error("Error during initial system resource check:", err);
    }
});
