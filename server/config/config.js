const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Constants and configuration
const config = {
    PORT: process.env.PORT || 5000,
    DISK_DIR: path.join(__dirname, '..', '..', 'disk_images'),
    ISO_PATH: path.join(__dirname, '..', '..', 'iso', 'alpine-virt-3.21.3-x86.iso'),
    
    // QEMU paths - update these with your actual installation paths
    QEMU_DIR: process.env.QEMU_DIR || 'C:\\Program Files\\qemu',
    
    // CORS settings
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
    
    // Resource check interval in ms (default: 1 minute)
    RESOURCE_CHECK_INTERVAL: 60000,
    
    // Warning thresholds for system resources (in percentages)
    WARNING_THRESHOLDS: {
        CPU_USAGE: 80,
        MEMORY_USAGE: 80,
        DISK_USAGE: 85
    }
};

// Derived paths
config.QEMU_IMG = path.join(config.QEMU_DIR, 'qemu-img.exe');
config.QEMU_SYSTEM = path.join(config.QEMU_DIR, 'qemu-system-x86_64.exe');

module.exports = config;
