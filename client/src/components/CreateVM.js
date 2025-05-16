import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const CreateVM = ({ disks, onVMCreated, onRefreshDisks }) => {
  const [selectedDisk, setSelectedDisk] = useState('');
  const [numCpus, setNumCpus] = useState('1');
  const [memory, setMemory] = useState('512M');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [vncInfo, setVncInfo] = useState(null);

  // Update selected disk when disks prop changes
  useEffect(() => {
    if (disks && disks.length > 0) {
      setSelectedDisk(disks[0]);
    } else {
      setSelectedDisk('');
    }
  }, [disks]);
  const handleCreateVM = async (e) => {
    e.preventDefault();
    
    // Reset messages
    setError(null);
    setSuccess(null);
    setVncInfo(null);
    
    // Validate input
    if (!selectedDisk) {
      setError('Please select a disk');
      return;
    }
    
    if (!numCpus || !memory) {
      setError('Please fill in all fields');
      return;
    }
    
    // Validate number of CPUs
    const cpuCount = parseInt(numCpus);
    if (isNaN(cpuCount) || cpuCount <= 0) {
      setError('Number of CPUs must be a positive integer');
      return;
    }
    
    // Usually a reasonable max is the number of CPU cores available
    // For simplicity we'll use 32 as a high-end limit
    if (cpuCount > 32) {
      setError('Number of CPUs cannot exceed 32');
      return;
    }
    
    // Validate memory format
    const memRegex = /^(\d+)(G|M)$/i;
    if (!memRegex.test(memory)) {
      setError('Memory must be in format like 512M or 2G');
      return;
    }
    
    // Extract numeric value and unit from memory
    const [, memValue, memUnit] = memory.match(memRegex);
    if (parseInt(memValue) <= 0) {
      setError('Memory size must be positive');
      return;
    }
    
    // Set a reasonable upper limit for memory (e.g., 64GB)
    const memInMB = memUnit.toUpperCase() === 'G' 
      ? parseInt(memValue) * 1024 
      : parseInt(memValue);
    
    if (memInMB > 65536) { // 64GB in MB
      setError('Memory size cannot exceed 64GB');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/vms`, {
        disk: selectedDisk,
        numCpus,
        memory
      });
        setSuccess(response.data.message);
      setVncInfo({
        vmId: response.data.vmId,
        disk: response.data.disk
      });
      
      // Notify parent component
      if (onVMCreated) {
        onVMCreated(response.data);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create VM');
      console.error('Error creating VM:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (onRefreshDisks) {
      onRefreshDisks();
    }
  };
  return (
    <Card className="mb-4 form-card">
      <Card.Header className="d-flex align-items-center">
        <i className="fas fa-play-circle me-2"></i>
        <span>Create Virtual Machine</span>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" className="d-flex align-items-center">
            <i className="fas fa-exclamation-circle me-2"></i>
            <span>{error}</span>
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" className="d-flex align-items-center">
            <i className="fas fa-check-circle me-2"></i>
            <span>{success}</span>
          </Alert>
        )}
        
        {vncInfo && (
          <Alert variant="info" className="vm-info-alert">
            <div className="d-flex align-items-center mb-2">
              <i className="fas fa-info-circle me-2"></i>
              <strong>VM created successfully!</strong>
            </div>
            <div>A window should have opened with your virtual machine.</div>
            <div className="mt-2">
              <span className="fw-bold">VM ID:</span> 
              <code className="ms-2 vm-code">{vncInfo.vmId}</code>
            </div>
            <div>
              <span className="fw-bold">Disk:</span> 
              <code className="ms-2 vm-code">{vncInfo.disk}</code>
            </div>
          </Alert>
        )}
          <Form onSubmit={handleCreateVM} className="animated-form">
          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <i className="fas fa-hdd me-2 text-primary"></i>
              Select Disk
            </Form.Label>
            <Form.Select 
              value={selectedDisk} 
              onChange={(e) => setSelectedDisk(e.target.value)}
              disabled={disks.length === 0}
              className="form-control-modern"
            >
              {disks.length === 0 ? (
                <option value="">No disks available</option>
              ) : (
                disks.map(disk => (
                  <option key={disk} value={disk}>{disk}</option>
                ))
              )}
            </Form.Select>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <i className="fas fa-microchip me-2 text-primary"></i>
              Number of CPUs
            </Form.Label>
            <Form.Control 
              type="number" 
              min="1"
              max="32"
              value={numCpus} 
              onChange={(e) => setNumCpus(e.target.value)} 
              placeholder="Enter number of CPUs"
              className="form-control-modern"
            />
            <Form.Text className="text-muted mt-1 ps-1">
              <i className="fas fa-info-circle me-1"></i>
              Recommended range: 1-8 CPUs
            </Form.Text>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <i className="fas fa-memory me-2 text-primary"></i>
              Memory
            </Form.Label>
            <div className="d-flex">
              <Form.Control 
                type="number"
                min="1"
                className="me-2 form-control-modern"
                value={memory.replace(/[^0-9]/g, '')} 
                onChange={(e) => {
                  const value = e.target.value;
                  const unit = memory.match(/[GM]$/i)?.[0] || 'M';
                  setMemory(`${value}${unit}`);
                }} 
                placeholder="Enter memory size"
              />
              <Form.Select 
                style={{ width: '80px' }}
                value={memory.match(/[GM]$/i)?.[0] || 'M'}
                onChange={(e) => {
                  const value = memory.replace(/[GM]$/i, '');
                  setMemory(`${value}${e.target.value}`);
                }}
                className="form-control-modern"
              >
                <option value="M">MB</option>
                <option value="G">GB</option>
              </Form.Select>
            </div>
            <Form.Text className="text-muted mt-1 ps-1">
              <i className="fas fa-info-circle me-1"></i>
              Recommended: 512MB-4GB, depending on your system resources
            </Form.Text>
          </Form.Group>
          
          <div className="d-flex gap-2">
            <Button 
              variant="primary" 
              type="submit" 
              disabled={loading || disks.length === 0}
              className="btn-modern"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fas fa-play-circle me-2"></i>
                  Start VM
                </>
              )}
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={handleRefresh}
              type="button"
              className="refresh-button"
            >
              <i className="fas fa-sync-alt me-2"></i>
              Refresh Disks
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default CreateVM;
