import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const DeleteDisk = ({ disks, onDiskDeleted, onRefreshDisks }) => {
  const [selectedDisk, setSelectedDisk] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Update selected disk when disks prop changes
  useEffect(() => {
    if (disks && disks.length > 0) {
      setSelectedDisk(disks[0]);
    } else {
      setSelectedDisk('');
    }
  }, [disks]);

  const handleDelete = async () => {
    // Reset messages
    setError(null);
    setSuccess(null);
    
    // Validate input
    if (!selectedDisk) {
      setError('Please select a disk');
      return;
    }
    
    setLoading(true);
      try {
      const response = await axios.delete(`${API_URL}/disks/${selectedDisk}`);
      setSuccess(response.data.message);
      
      // Notify parent component to refresh disk list
      if (onDiskDeleted) {
        onDiskDeleted();
      }
    } catch (error) {
      // Get detailed error message if available
      const errorMsg = error.response?.data?.error || 'Failed to delete disk';
      const errorDetails = error.response?.data?.details || '';
      const fullErrorMsg = errorDetails ? `${errorMsg}: ${errorDetails}` : errorMsg;
      
      setError(fullErrorMsg);
      console.error('Error deleting disk:', error.response?.data || error);
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
        <i className="fas fa-trash-alt me-2"></i>
        <span>Delete Virtual Disk</span>
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
        
        <Form className="animated-form">
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
            <div className="d-flex gap-2">
            <Button 
              variant="danger" 
              onClick={handleDelete} 
              disabled={loading || disks.length === 0}
              className="btn-modern"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Deleting...
                </>
              ) : (
                <>
                  <i className="fas fa-trash-alt me-2"></i>
                  Delete Disk
                </>
              )}
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={handleRefresh}
              className="refresh-button"
            >
              <i className="fas fa-sync-alt me-2"></i>
              Refresh Disks
            </Button>
          </div>
          
          {disks.length > 0 && (
            <Alert variant="warning" className="mt-3 d-flex">
              <i className="fas fa-exclamation-triangle me-2 align-self-start mt-1"></i>
              <div>
                <strong>Warning:</strong> Deleting a disk is permanent and cannot be undone.
                Make sure the disk is not in use by any VMs before deleting.
              </div>
            </Alert>
          )}
        </Form>
      </Card.Body>
    </Card>
  );
};

export default DeleteDisk;
