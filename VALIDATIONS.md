# VM Manager Validation and Resource Monitoring

This update adds comprehensive validation and system resource monitoring to the VM Manager application. These features help prevent errors and ensure the optimal use of system resources.

## New Features

### 1. Input Validation

- **Disk Creation**
  - Validates disk size format (e.g., 10G, 1024M)
  - Ensures disk size is positive
  - Validates disk name format (alphanumeric with hyphens, underscores, and periods)
  - Prevents creation of disk sizes larger than available space

- **VM Creation**
  - Validates CPU count (must be positive and reasonable for your system)
  - Validates memory format (e.g., 512M, 2G)
  - Ensures memory size is positive and within system capabilities
  - Prevents allocation of more resources than the system can handle

### 2. System Resource Monitoring

- **Real-time Resource Display**
  - Shows current memory usage and availability
  - Shows disk space usage and availability
  - Shows CPU information

- **Resource Warning System**
  - Alerts when system memory is running low (<15% free)
  - Alerts when disk space is running low (<10% free)
  - Alerts when CPU usage is high (>85%)

### 3. Enhanced User Interface

- **Improved Input Fields**
  - Numeric spinners with min/max values for CPU count
  - Combined number field and unit dropdown for memory and disk size
  - Helper text with recommended values

- **Visual Feedback**
  - Progress bars for resource usage
  - Color-coded indicators (green, yellow, red) based on resource availability

## How to Use

1. The System Resources panel at the top of the application displays current resource status
2. When creating disks or VMs, enter valid sizes that fit within your system capabilities
3. Pay attention to warning messages that indicate potential resource issues
4. Use the improved input fields to easily select appropriate values

## Technical Details

- Resource monitoring occurs every 60 seconds in the background
- Disk space checks use the Node.js `fs.statfsSync()` function
- Memory and CPU checks use the Node.js `os` module
- All validations occur on both client and server sides for maximum protection
