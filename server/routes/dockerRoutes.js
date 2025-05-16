const express = require('express');
const router = express.Router();
const dockerController = require('../controllers/dockerController');

// Get Docker status
router.get('/status', dockerController.getDockerStatus);

// Create a Dockerfile
router.post('/dockerfile', dockerController.createDockerfile);

// List available Dockerfiles
router.get('/dockerfiles', dockerController.listDockerfiles);

// Build a Docker image
router.post('/build', dockerController.buildImage);

// List Docker images
router.get('/images', dockerController.listImages);

// List Docker containers
router.get('/containers', dockerController.listContainers);

// Run a Docker container
router.post('/run', dockerController.runContainer);

module.exports = router; 