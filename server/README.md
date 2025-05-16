# VM Manager Server - MVC Architecture

This is the server-side component of the VM Manager application, restructured following the Model-View-Controller (MVC) architectural pattern.

## Directory Structure

```
server/
  ├── app.js              # Express application setup
  ├── server.js           # Server initialization and startup
  ├── config/             # Configuration files
  │   └── config.js       # Main configuration
  ├── controllers/        # Controllers for handling business logic
  │   ├── diskController.js
  │   ├── vmController.js
  │   └── systemResourcesController.js
  ├── models/             # Data models
  │   ├── diskModel.js
  │   ├── vmModel.js
  │   └── systemResourcesModel.js
  ├── routes/             # API routes
  │   ├── diskRoutes.js
  │   ├── vmRoutes.js
  │   └── systemResourcesRoutes.js
  └── utils/              # Utility functions
      └── systemUtils.js  # Helper functions for system operations
```

## How to Switch to the New MVC Implementation

1. Backup the old server.js file (rename it to server.js.old)
2. Copy server_new.js to server.js
3. Make sure all dependencies are installed:
```bash
npm install
```
4. Start the server:
```bash
node server.js
```

## Features

- **Disk Management**: Create, list, and delete virtual disk images
- **VM Management**: Start and stop virtual machines
- **System Resource Monitoring**: Track CPU, memory, and disk usage

## API Endpoints

### Disk Operations
- `GET /api/disks`: Get all disks
- `GET /api/disks/:name`: Get information about a specific disk
- `POST /api/disks`: Create a new disk
- `DELETE /api/disks/:name`: Delete a disk

### VM Operations
- `GET /api/vms`: Get all running VMs
- `GET /api/vms/:id`: Get a specific VM
- `POST /api/vms`: Create and start a new VM
- `DELETE /api/vms/:id`: Stop a running VM

### System Resources
- `GET /api/system-resources`: Get system resource information

## Real-time Features

The server uses Socket.IO for real-time communication with clients:

- `vm-started`: Emitted when a new VM is started
- `vm-stopped`: Emitted when a VM is stopped
- `system-resources`: Regular updates on system resource usage
- `system-warnings`: Warnings about low resources

## Dependencies

- Express.js: Web framework
- Socket.IO: Real-time communication
- QEMU: For managing virtual machines

## MVC Implementation Benefits

1. **Separation of Concerns**: Clear separation between data models, business logic, and routing
2. **Code Organization**: Improved file structure makes the codebase easier to navigate
3. **Maintainability**: Easier to update and extend individual components
4. **Testability**: Components can be tested in isolation
5. **Scalability**: Makes it easier to add new features and functionality
