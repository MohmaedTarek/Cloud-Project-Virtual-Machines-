import React, { useState, useEffect } from 'react';
import { Card, Alert, ProgressBar } from 'react-bootstrap';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';
let socket;

const SystemResources = () => {
  const [resources, setResources] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    socket = io('http://localhost:5000');
    
    // Listen for resource updates
    socket.on('system-resources', (data) => {
      setResources(data);
      setLoading(false);
    });
    
    // Listen for warnings
    socket.on('system-warnings', (data) => {
      setWarnings(data.warnings || []);
    });
    
    // Initial fetch of resources
    fetchResources();
    
    // Cleanup on component unmount
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const fetchResources = async () => {
    try {
      const response = await axios.get(`${API_URL}/system-resources`);
      setResources(response.data);
      setError(null);
    } catch (error) {
      setError('Failed to fetch system resources');
      console.error('Error fetching system resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressVariant = (percent) => {
    const value = 100 - parseFloat(percent);
    if (value < 10) return 'danger';
    if (value < 25) return 'warning';
    return 'success';
  };
  if (loading) {
    return (
      <Card className="mb-4 resource-card">
        <Card.Header className="d-flex align-items-center">
          <i className="fas fa-microchip me-2"></i>
          <span>System Resources</span>
        </Card.Header>
        <Card.Body>
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading system resources...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-4 resource-card">
        <Card.Header className="d-flex align-items-center">
          <i className="fas fa-microchip me-2"></i>
          <span>System Resources</span>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4 resource-card">
      <Card.Header className="d-flex align-items-center">
        <i className="fas fa-microchip me-2"></i>
        <span>System Resources</span>
      </Card.Header>
      <Card.Body>
        {warnings.length > 0 && (
          <Alert variant="warning" className="mb-3">
            <div className="d-flex align-items-center mb-2">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <strong>Resource Warnings:</strong>
            </div>
            <ul className="mb-0 ps-3">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </Alert>
        )}
        
        {resources && (
          <div className="resource-metrics">
            <div className="mb-3 resource-metric">
              <div className="d-flex justify-content-between mb-1 align-items-center">
                <div>
                  <i className="fas fa-memory me-2 resource-icon"></i>
                  <strong>Memory:</strong>
                </div>
                <span className="resource-value">{resources.memory.free} free of {resources.memory.total}</span>
              </div>
              <ProgressBar 
                variant={getProgressVariant(resources.memory.percentFree)}
                now={parseFloat(resources.memory.percentFree)} 
                label={`${resources.memory.percentFree}% Free`}
                className="custom-progress"
              />
            </div>
            
            <div className="mb-3 resource-metric">
              <div className="d-flex justify-content-between mb-1 align-items-center">
                <div>
                  <i className="fas fa-hdd me-2 resource-icon"></i>
                  <strong>Disk Space:</strong>
                </div>
                <span className="resource-value">{resources.disk.free} free of {resources.disk.total}</span>
              </div>
              <ProgressBar 
                variant={getProgressVariant(resources.disk.percentFree)}
                now={parseFloat(resources.disk.percentFree)} 
                label={`${resources.disk.percentFree}% Free`}
                className="custom-progress"
              />
            </div>
            
            {resources.cpu && (
              <div className="mb-0 resource-metric">
                <div className="d-flex justify-content-between mb-1 align-items-center">
                  <div>
                    <i className="fas fa-microchip me-2 resource-icon"></i>
                    <strong>CPU:</strong>
                  </div>
                  <span className="resource-value">{resources.cpu.total} cores available</span>
                </div>
                {resources.cpu.usage && (
                  <ProgressBar 
                    variant={parseFloat(resources.cpu.usage) > 85 ? 'danger' : 
                              parseFloat(resources.cpu.usage) > 60 ? 'warning' : 'success'}
                    now={parseFloat(resources.cpu.usage)} 
                    label={`${resources.cpu.usage}% Used`}
                    className="custom-progress"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default SystemResources;
