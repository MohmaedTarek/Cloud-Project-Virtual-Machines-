const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// Set the DockerFiles directory path (relative to the project root)
const DOCKERFILES_DIR = path.join(__dirname, '../../DockerFiles');

// Ensure DockerFiles directory exists
if (!fs.existsSync(DOCKERFILES_DIR)) {
    fs.mkdirSync(DOCKERFILES_DIR, { recursive: true });
}

// Helper function to check if Docker is available
async function isDockerAvailable() {
    try {
        await execPromise('docker info');
        return true;
    } catch (error) {
        console.log('Docker availability check failed:', error.message);
        return false;
    }
}

// Create a Dockerfile
exports.createDockerfile = async (req, res) => {
    try {
        const { fileName, content } = req.body;

        if (!fileName || !content) {
            return res.status(400).json({ error: 'Dockerfile name and content are required' });
        }

        // Create the full file path within the DockerFiles directory
        const filePath = path.join(DOCKERFILES_DIR, fileName);

        // Write the Dockerfile
        fs.writeFileSync(filePath, content);

        res.status(201).json({
            success: true,
            message: 'Dockerfile created successfully',
            path: filePath
        });
    } catch (error) {
        console.error('Error creating Dockerfile:', error);
        res.status(500).json({ error: 'Failed to create Dockerfile', details: error.message });
    }
};

// Get list of available Dockerfiles
exports.listDockerfiles = async (req, res) => {
    try {
        const files = fs.readdirSync(DOCKERFILES_DIR);

        // Filter out directories and hidden files
        const dockerfiles = files.filter(file => {
            const filePath = path.join(DOCKERFILES_DIR, file);
            return fs.statSync(filePath).isFile() && !file.startsWith('.');
        });

        res.status(200).json({
            dockerfiles,
            directory: DOCKERFILES_DIR
        });
    } catch (error) {
        console.error('Error listing Dockerfiles:', error);
        res.status(500).json({ error: 'Failed to list Dockerfiles', details: error.message });
    }
};

// Build a Docker image
exports.buildImage = async (req, res) => {
    try {
        // Check if Docker is available
        const dockerAvailable = await isDockerAvailable();
        if (!dockerAvailable) {
            return res.status(503).json({
                error: 'Docker is not available',
                details: 'Docker Desktop may not be installed or running. Please start Docker Desktop and try again.'
            });
        }

        const { dockerfileName, imageName } = req.body;

        if (!dockerfileName || !imageName) {
            return res.status(400).json({ error: 'Dockerfile name and image name are required' });
        }

        // Create the full file path
        const dockerfilePath = path.join(DOCKERFILES_DIR, dockerfileName);

        // Check if Dockerfile exists
        if (!fs.existsSync(dockerfilePath)) {
            return res.status(404).json({ error: 'Dockerfile not found' });
        }


        const { stdout, stderr } = await execPromise(
            `docker buildx build -t ${imageName} -f "${dockerfilePath}" "${DOCKERFILES_DIR}"`
        );

        res.status(200).json({
            success: true,
            message: 'Docker image built successfully',
            imageName,
            output: stdout,
            error: stderr
        });
    } catch (error) {
        console.error('Error building Docker image:', error);
        res.status(500).json({
            error: 'Failed to build Docker image',
            details: error.message,
            suggestion: 'Make sure Docker Desktop is running and accessible'
        });
    }
};

// List Docker images
exports.listImages = async (req, res) => {
    try {
        // Check if Docker is available
        const dockerAvailable = await isDockerAvailable();
        if (!dockerAvailable) {
            return res.status(503).json({
                error: 'Docker is not available',
                details: 'Docker Desktop may not be installed or running. Please start Docker Desktop and try again.'
            });
        }

        const { stdout } = await execPromise('docker images --format "{{.Repository}}:{{.Tag}}|{{.ID}}|{{.Size}}|{{.CreatedSince}}"');

        const images = stdout.trim().split('\n').filter(Boolean).map(line => {
            const [repoTag, id, size, created] = line.split('|');
            const [repository, tag] = repoTag.split(':');

            return {
                repository,
                tag: tag || 'latest',
                id,
                size,
                created
            };
        });

        res.status(200).json({ images });
    } catch (error) {
        console.error('Error listing Docker images:', error);
        res.status(500).json({
            error: 'Failed to list Docker images',
            details: error.message,
            suggestion: 'Make sure Docker Desktop is running and accessible'
        });
    }
};

// Delete Docker image
exports.deleteImage = async (req, res) => {
    try {
        // Check if Docker is available
        const dockerAvailable = await isDockerAvailable();
        if (!dockerAvailable) {
            return res.status(503).json({
                error: 'Docker is not available',
                details: 'Docker Desktop may not be installed or running. Please start Docker Desktop and try again.'
            });
        }

        const { imageId } = req.params;

        if (!imageId) {
            return res.status(400).json({
                error: 'Image ID is required',
                details: 'Please provide a valid image ID or name'
            });
        }

        // Execute the docker rmi command
        const { stdout, stderr } = await execPromise(`docker rmi ${imageId} -f`);

        res.status(200).json({
            success: true,
            message: `Image ${imageId} deleted successfully`,
            output: stdout,
            error: stderr
        });
    } catch (error) {
        console.error('Error deleting Docker image:', error);
        res.status(500).json({
            error: 'Failed to delete Docker image',
            details: error.message,
            suggestion: 'Make sure Docker Desktop is running and the image exists'
        });
    }
};

// Search Docker images (local)
exports.searchImages = async (req, res) => {
    try {
        // Check if Docker is available
        const dockerAvailable = await isDockerAvailable();
        if (!dockerAvailable) {
            return res.status(503).json({
                error: 'Docker is not available',
                details: 'Docker Desktop may not be installed or running. Please start Docker Desktop and try again.'
            });
        }

        const { term } = req.query;

        if (!term) {
            return res.status(400).json({
                error: 'Search term is required',
                details: 'Please provide a search term'
            });
        }

        const { stdout } = await execPromise('docker images --format "{{.Repository}}:{{.Tag}}|{{.ID}}|{{.Size}}|{{.CreatedSince}}"');

        const allImages = stdout.trim().split('\n').filter(Boolean).map(line => {
            const [repoTag, id, size, created] = line.split('|');
            const [repository, tag] = repoTag.split(':');

            return {
                repository,
                tag: tag || 'latest',
                id,
                size,
                created,
                fullName: `${repository}:${tag || 'latest'}`
            };
        });

        // Filter images based on search term
        const filteredImages = allImages.filter(image =>
            image.repository.toLowerCase().includes(term.toLowerCase()) ||
            image.tag.toLowerCase().includes(term.toLowerCase()) ||
            image.fullName.toLowerCase().includes(term.toLowerCase())
        );

        res.status(200).json({
            images: filteredImages,
            count: filteredImages.length,
            searchTerm: term
        });
    } catch (error) {
        console.error('Error searching Docker images:', error);
        res.status(500).json({
            error: 'Failed to search Docker images',
            details: error.message,
            suggestion: 'Make sure Docker Desktop is running and accessible'
        });
    }
};

// Search DockerHub for images
exports.searchDockerHub = async (req, res) => {
    try {
        // Check if Docker is available
        const dockerAvailable = await isDockerAvailable();
        if (!dockerAvailable) {
            return res.status(503).json({
                error: 'Docker is not available',
                details: 'Docker Desktop may not be installed or running. Please start Docker Desktop and try again.'
            });
        }

        const { term } = req.query;

        if (!term) {
            return res.status(400).json({
                error: 'Search term is required',
                details: 'Please provide a search term'
            });
        }

        // Execute the docker search command without format to avoid template parsing errors
        const { stdout, stderr } = await execPromise(`docker search ${term}`);

        if (stderr) {
            return res.status(500).json({
                error: 'Error searching DockerHub',
                details: stderr
            });
        }

        // Parse the standard output format of docker search
        // Skip the header line and parse the rest
        const lines = stdout.trim().split('\n');
        const results = [];

        // Skip the header line (first line)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // The default output format is NAME, DESCRIPTION, STARS, OFFICIAL, AUTOMATED
            // Columns are separated by whitespace but need careful parsing due to descriptions containing spaces
            const nameEnd = line.indexOf(' ');
            const name = line.substring(0, nameEnd).trim();

            // Extract the rest of the line
            const rest = line.substring(nameEnd).trim();

            // Check if it's an official image
            const isOfficial = rest.includes('[OK]');

            // Get the description (everything between name and stars)
            let descEnd = rest.lastIndexOf(' ');
            let starsStr = rest.substring(descEnd).trim();

            // If we don't have a valid number at the end, adjust
            while (descEnd > 0 && isNaN(parseInt(starsStr))) {
                descEnd = rest.lastIndexOf(' ', descEnd - 1);
                starsStr = rest.substring(descEnd).trim();
            }

            const description = isOfficial
                ? rest.substring(0, descEnd).replace('[OK]', '').trim()
                : rest.substring(0, descEnd).trim();

            // Parse stars
            const stars = parseInt(starsStr) || 0;

            // Check if automated
            const automated = rest.includes('[OK]') ? false : rest.endsWith('[OK]');

            results.push({
                name,
                description,
                stars,
                official: isOfficial,
                automated
            });
        }

        res.status(200).json({
            results,
            count: results.length,
            searchTerm: term
        });
    } catch (error) {
        console.error('Error searching DockerHub:', error);
        res.status(500).json({
            error: 'Failed to search DockerHub',
            details: error.message,
            suggestion: 'Make sure Docker Desktop is running and you have internet connectivity'
        });
    }
};

// Pull image from DockerHub
exports.pullImage = async (req, res) => {
    try {
        // Check if Docker is available
        const dockerAvailable = await isDockerAvailable();
        if (!dockerAvailable) {
            return res.status(503).json({
                error: 'Docker is not available',
                details: 'Docker Desktop may not be installed or running. Please start Docker Desktop and try again.'
            });
        }

        const { imageName } = req.body;

        if (!imageName) {
            return res.status(400).json({
                error: 'Image name is required',
                details: 'Please provide a valid image name (e.g., nginx, ubuntu:latest)'
            });
        }

        // Start progress response
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Transfer-Encoding': 'chunked'
        });

        // Execute docker pull command
        const child = exec(`docker pull ${imageName}`, (error, stdout, stderr) => {
            if (error) {
                res.write(JSON.stringify({
                    success: false,
                    error: error.message,
                    details: stderr
                }));
                res.end();
                return;
            }

            res.write(JSON.stringify({
                success: true,
                message: `Successfully pulled image ${imageName}`,
                output: stdout
            }));
            res.end();
        });

        // Stream progress to client
        child.stdout.on('data', (data) => {
            res.write(JSON.stringify({ progress: data.toString() }));
        });

        child.stderr.on('data', (data) => {
            // Docker pull progress is often sent to stderr
            res.write(JSON.stringify({ progress: data.toString() }));
        });

    } catch (error) {
        console.error('Error pulling Docker image:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Failed to pull Docker image',
                details: error.message,
                suggestion: 'Make sure Docker Desktop is running and you have internet connectivity'
            });
        } else {
            res.write(JSON.stringify({
                success: false,
                error: 'Failed to pull Docker image',
                details: error.message
            }));
            res.end();
        }
    }
};

// List running containers
exports.listContainers = async (req, res) => {
    try {
        // Check if Docker is available
        const dockerAvailable = await isDockerAvailable();
        if (!dockerAvailable) {
            return res.status(503).json({
                error: 'Docker is not available',
                details: 'Docker Desktop may not be installed or running. Please start Docker Desktop and try again.'
            });
        }

        const { stdout } = await execPromise(
            'docker ps --format "{{.ID}}|{{.Image}}|{{.Status}}|{{.Names}}|{{.Ports}}"'
        );

        const containers = stdout.trim().split('\n').filter(Boolean).map(line => {
            const [id, image, status, names, ports] = line.split('|');

            return {
                id,
                image,
                status,
                names,
                ports
            };
        });

        res.status(200).json({ containers });
    } catch (error) {
        console.error('Error listing Docker containers:', error);
        res.status(500).json({
            error: 'Failed to list Docker containers',
            details: error.message,
            suggestion: 'Make sure Docker Desktop is running and accessible'
        });
    }
};

// Run a Docker container
exports.runContainer = async (req, res) => {
    try {
        // Check if Docker is available
        const dockerAvailable = await isDockerAvailable();
        if (!dockerAvailable) {
            return res.status(503).json({
                error: 'Docker is not available',
                details: 'Docker Desktop may not be installed or running. Please start Docker Desktop and try again.'
            });
        }

        const { imageName, containerName, hostPort, containerPort } = req.body;

        if (!imageName || !hostPort || !containerPort) {
            return res.status(400).json({
                error: 'Required parameters missing',
                details: 'Image name, host port, and container port are required'
            });
        }

        // Build the docker run command
        let command = `docker run -d -p ${hostPort}:${containerPort}`;

        // Add container name if provided
        if (containerName) {
            command += ` --name ${containerName}`;
        }

        // Add image name at the end
        command += ` ${imageName}`;

        // Execute the docker run command
        const { stdout, stderr } = await execPromise(command);

        const containerId = stdout.trim();

        res.status(200).json({
            success: true,
            message: 'Docker container started successfully',
            containerId,
            details: {
                image: imageName,
                name: containerName || 'unnamed',
                ports: `${hostPort}:${containerPort}`
            },
            error: stderr
        });
    } catch (error) {
        console.error('Error running Docker container:', error);
        res.status(500).json({
            error: 'Failed to run Docker container',
            details: error.message,
            suggestion: 'Make sure Docker Desktop is running and the image exists'
        });
    }
};

// Docker status endpoint
exports.getDockerStatus = async (req, res) => {
    try {
        const dockerAvailable = await isDockerAvailable();

        if (dockerAvailable) {
            res.status(200).json({
                available: true,
                message: 'Docker is running and available'
            });
        } else {
            res.status(200).json({
                available: false,
                message: 'Docker is not available. Docker Desktop may not be installed or running.',
                suggestion: 'Please install Docker Desktop or start it if already installed.'
            });
        }
    } catch (error) {
        console.error('Error checking Docker status:', error);
        res.status(500).json({
            error: 'Failed to check Docker status',
            details: error.message
        });
    }
};

////////////////////MOHAMEDS PARTS////////////////////



// Stop a Docker container
exports.stopContainer = async (req, res) => {
    try {
        // Check if Docker is available
        const dockerAvailable = await isDockerAvailable();
        if (!dockerAvailable) {
            return res.status(503).json({
                error: 'Docker is not available',
                details: 'Docker Desktop may not be installed or running. Please start Docker Desktop and try again.'
            });
        }

        const { containerId } = req.body;

        if (!containerId) {
            return res.status(400).json({
                error: 'Container ID is required',
                details: 'Please provide a valid container ID or name'
            });
        }

        // Execute the docker stop command
        const { stdout, stderr } = await execPromise(`docker stop ${containerId}`);

        res.status(200).json({
            success: true,
            message: `Container ${containerId} stopped successfully`,
            output: stdout,
            error: stderr
        });
    } catch (error) {
        console.error('Error stopping Docker container:', error);
        res.status(500).json({
            error: 'Failed to stop Docker container',
            details: error.message,
            suggestion: 'Make sure Docker Desktop is running and the container exists'
        });
    }
}; 