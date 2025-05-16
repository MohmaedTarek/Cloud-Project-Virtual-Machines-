const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const config = require('./config/config');
const { ensureDirectoryExists } = require('./utils/systemUtils');

// Import routes
const diskRoutes = require('./routes/diskRoutes');
const vmRoutes = require('./routes/vmRoutes').router;
const systemResourcesRoutes = require('./routes/systemResourcesRoutes');
const dockerRoutes = require('./routes/dockerRoutes');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Ensure required directories exist
ensureDirectoryExists(config.DISK_DIR);

// API Routes
app.use('/api/disks', diskRoutes);
app.use('/api/vms', vmRoutes);
app.use('/api/system-resources', systemResourcesRoutes);
app.use('/api/docker', dockerRoutes);

// Root route for API status
app.get('/api', (req, res) => {
    res.json({
        message: 'VM Manager API is running',
        version: '1.0.0'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        details: err.message
    });
});

module.exports = app;
