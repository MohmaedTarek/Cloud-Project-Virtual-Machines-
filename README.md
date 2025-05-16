# Virtual Machine Manager

This project is a full-stack web application for managing virtual machines. It provides a modern React.js frontend with a Node.js/Express backend to create, run, and delete virtual machines using QEMU.

## Features

- Create virtual disks with various formats (QCOW2, RAW, VDI, VMDK, VHDX)
- Delete virtual disks
- Create and run virtual machines with custom CPU and memory configurations
- Stop running virtual machines
- Real-time updates with Socket.IO

## Prerequisites

- Node.js (v14+) and npm
- QEMU installed and available in PATH
- VNC Viewer (to connect to the running VMs)

## Project Structure

- `client/`: React.js frontend
- `server/`: Node.js/Express backend
- `disk_images/`: Directory for storing virtual disk images
- `iso/`: Directory containing ISO files for installation

## Setup and Installation

1. Install dependencies for the server:
   ```
   cd server
   npm install
   ```

2. Install dependencies for the client:
   ```
   cd client
   npm install
   ```

3. Install root dependencies:
   ```
   npm install
   ```

## Running the Application

You can run both the backend and frontend simultaneously:

```
npm start
```

Or run them separately:

- Server: `npm run server` (runs on port 5000)
- Client: `npm run client` (runs on port 3000)

## Connecting to VMs

After starting a VM, use a VNC viewer to connect to `localhost:<port>` where `<port>` is the VNC port displayed in the application (typically 5901, 5902, etc.).

## Technologies Used

- **Frontend**: React.js, React Bootstrap, Axios, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO
- **Virtualization**: QEMU

## License

MIT
