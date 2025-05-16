// This file adds a startup function to the server.js
// to periodically check system resources

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
    
    // Initial resource check
    try {
        await checkSystemResources();
        console.log("Initial system resource check completed");
    } catch (err) {
        console.error("Error during initial system resource check:", err);
    }
});
