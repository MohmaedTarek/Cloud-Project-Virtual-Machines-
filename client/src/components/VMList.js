import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Alert, Badge } from 'react-bootstrap';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';
let socket;

const VMList = () => {
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    socket = io('http://localhost:5000');
    
    // Listen for VM events
    socket.on('vm-started', (data) => {
      fetchVMs();
    });
    
    socket.on('vm-stopped', (data) => {
      fetchVMs();
    });
    
    // Fetch VMs on component mount
    fetchVMs();
    
    // Cleanup on component unmount
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const fetchVMs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/vms`);
      setVms(response.data.vms || []);
      setError(null);
    } catch (error) {
      setError('Failed to fetch VMs');
      console.error('Error fetching VMs:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleStopVM = async (vmId) => {
    setError(null);
    setSuccess(null);
    
    try {
      const response = await axios.delete(`${API_URL}/vms/${vmId}`);
      setSuccess(response.data.message);
      
      // Remove VM from local state
      setVms(vms.filter(vm => vm.id !== vmId));
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to stop VM');
      console.error('Error stopping VM:', error);
    }
  };

  return (
    <Card className="mb-4 vm-list-card">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <i className="fas fa-server me-2"></i>
          <h5 className="mb-0">Running Virtual Machines</h5>
        </div>
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={fetchVMs}
          disabled={loading}
          className="refresh-button"
        >
          <i className={`fas fa-sync-alt me-1 ${loading ? 'fa-spin' : ''}`}></i>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success">
            <i className="fas fa-check-circle me-2"></i>
            {success}
          </Alert>
        )}
          {vms.length === 0 ? (
          <Alert variant="info" className="d-flex align-items-center">
            <i className="fas fa-info-circle me-2"></i>
            <span>No virtual machines are currently running.</span>
          </Alert>
        ) : (
          <div className="table-responsive vm-table-container">
            <Table hover responsive className="vm-table">
              <thead>
                <tr>
                  <th><i className="fas fa-fingerprint me-2"></i>VM ID</th>
                  <th><i className="fas fa-hdd me-2"></i>Disk</th>
                  <th><i className="fas fa-microchip me-2"></i>CPUs</th>
                  <th><i className="fas fa-memory me-2"></i>Memory</th>
                  <th><i className="fas fa-cogs me-2"></i>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vms.map((vm) => (
                  <tr key={vm.id} className="vm-row">
                    <td>
                      <span className="vm-id-badge">
                        {vm.id.substring(0, 8)}...
                      </span>
                    </td>
                    <td>{vm.disk}</td>
                    <td>
                      <Badge bg="info" className="cpu-badge">
                        {vm.numCpus} Core{vm.numCpus > 1 ? 's' : ''}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg="primary" className="memory-badge">
                        {vm.memory}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={() => handleStopVM(vm.id)}
                          title="Stop this VM"
                          className="stop-vm-btn"
                        >
                          <i className="fas fa-stop-circle me-1"></i>
                          Stop VM
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default VMList;
