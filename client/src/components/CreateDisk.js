import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const CreateDisk = ({ onDiskCreated }) => {
  const [format, setFormat] = useState('qcow2');
  const [size, setSize] = useState('10G');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const diskFormats = [
    { value: 'qcow2', label: 'QCOW2' },
    { value: 'raw', label: 'Raw' },
    { value: 'vdi', label: 'VirtualBox VDI' },
    { value: 'vmdk', label: 'VMware VMDK' },
    { value: 'vhdx', label: 'Hyper-V VHDX' }
  ];
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset messages
    setError(null);
    setSuccess(null);
    
    // Validate input
    if (!format || !size || !name) {
      setError('Please fill in all fields');
      return;
    }
    
    // Validate disk size format
    const sizeRegex = /^(\d+)(G|M|K)$/i;
    if (!sizeRegex.test(size)) {
      setError('Disk size must be in format like 10G, 1024M, or 2048K');
      return;
    }
    
    // Extract the numeric value and unit from size
    const [, sizeValue, unit] = size.match(sizeRegex);
    if (parseInt(sizeValue) <= 0) {
      setError('Disk size must be a positive number');
      return;
    }
    
    // Ensure the disk name is valid
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(name)) {
      setError('Disk name can only contain letters, numbers, hyphens, underscores, and periods');
      return;
    }
    
    setLoading(true);
      try {
      const response = await axios.post(`${API_URL}/disks`, { format, size, name });
      setSuccess(response.data.message);
      setName(''); // Reset name field after successful creation
      
      // Notify parent component to refresh disk list
      if (onDiskCreated) {
        onDiskCreated();
      }
    } catch (error) {
      // Get detailed error message if available
      const errorMsg = error.response?.data?.error || 'Failed to create disk';
      const errorDetails = error.response?.data?.details || '';
      const fullErrorMsg = errorDetails ? `${errorMsg}: ${errorDetails}` : errorMsg;
      
      setError(fullErrorMsg);
      console.error('Error creating disk:', error.response?.data || error);
      
      // Log the command that was attempted if available
      if (error.response?.data?.command) {
        console.error('Failed command:', error.response.data.command);
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="mb-4 form-card">
      <Card.Header className="d-flex align-items-center">
        <i className="fas fa-plus-circle me-2"></i>
        <span>Create Virtual Disk</span>
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
        
        <Form onSubmit={handleSubmit} className="animated-form">
          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <i className="fas fa-file-code me-2 text-primary"></i>
              Disk Format
            </Form.Label>
            <Form.Select 
              value={format} 
              onChange={(e) => setFormat(e.target.value)}
              className="form-control-modern"
            >
              {diskFormats.map(format => (
                <option key={format.value} value={format.value}>{format.label}</option>
              ))}
            </Form.Select>
          </Form.Group>          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <i className="fas fa-hdd me-2 text-primary"></i>
              Disk Size
            </Form.Label>
            <div className="d-flex">
              <Form.Control 
                type="number"
                min="1"
                className="me-2 form-control-modern"
                value={size.replace(/[^0-9]/g, '')} 
                onChange={(e) => {
                  const value = e.target.value;
                  const unit = size.match(/[GMK]$/i)?.[0] || 'G';
                  setSize(`${value}${unit}`);
                }} 
                placeholder="Enter disk size"
              />
              <Form.Select 
                style={{ width: '80px' }}
                className="form-control-modern"
                value={size.match(/[GMK]$/i)?.[0] || 'G'}
                onChange={(e) => {
                  const value = size.replace(/[GMK]$/i, '');
                  setSize(`${value}${e.target.value}`);
                }}
              >
                <option value="G">GB</option>
                <option value="M">MB</option>
                <option value="K">KB</option>
              </Form.Select>
            </div>
            <Form.Text className="text-muted mt-1 ps-1">
              <i className="fas fa-info-circle me-1"></i>
              Recommended: 8GB-40GB for most VMs
            </Form.Text>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center">
              <i className="fas fa-tag me-2 text-primary"></i>
              Disk Name
            </Form.Label>
            <Form.Control 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Enter disk name"
              className="form-control-modern"
            />
          </Form.Group>
          
          <Button 
            variant="primary" 
            type="submit" 
            disabled={loading}
            className="btn-modern px-4"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating...
              </>
            ) : (
              <>
                <i className="fas fa-plus-circle me-2"></i>
                Create Disk
              </>
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default CreateDisk;
