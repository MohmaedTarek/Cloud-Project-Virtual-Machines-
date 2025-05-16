import React, { useState, useEffect } from 'react';
import { Card, Table, Alert, Button, Badge, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useDockerStatus } from './DockerStatusContext';

const API_URL = 'http://localhost:5000/api';

const DockerContainersList = () => {
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [stoppingContainers, setStoppingContainers] = useState({});
    const { available } = useDockerStatus();

    useEffect(() => {
        const fetchContainers = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(`${API_URL}/docker/containers`);
                setContainers(response.data.containers || []);
            } catch (err) {
                setError(err.response?.data?.error || 'Error fetching Docker containers');
                console.error('Error fetching containers:', err);
            } finally {
                setLoading(false);
            }
        };

        if (available) {
            fetchContainers();
        } else {
            setLoading(false);
        }
    }, [available, refreshKey]);

    const handleStopContainer = async (containerId) => {
        setStoppingContainers(prev => ({ ...prev, [containerId]: true }));
        try {
            await axios.post(`${API_URL}/docker/stop`, { containerId });
            // Refresh the list after stopping container
            setRefreshKey(prevKey => prevKey + 1);
        } catch (err) {
            setError(`Failed to stop container: ${err.response?.data?.error || err.message}`);
            console.error('Error stopping container:', err);
        } finally {
            setStoppingContainers(prev => ({ ...prev, [containerId]: false }));
        }
    };

    const handleRefresh = () => {
        setRefreshKey(prevKey => prevKey + 1);
    };

    const handleOpenContainer = (container) => {
        // Extract port mapping from the ports string
        const portsInfo = container.ports || '';
        const portMatch = portsInfo.match(/0.0.0.0:(\d+)->(\d+)/);

        if (portMatch && portMatch.length >= 2) {
            const hostPort = portMatch[1];
            window.open(`http://localhost:${hostPort}`, '_blank');
        } else {
            setError(`Cannot open container: No valid port mapping found for ${container.names}`);
        }
    };

    return (
        <Card className="shadow-sm mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white">
                <h5 className="mb-0">Running Docker Containers</h5>
                <Button variant="light" size="sm" onClick={handleRefresh} disabled={loading || !available}>
                    <i className="fas fa-sync-alt"></i>
                </Button>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}

                {loading ? (
                    <div className="text-center my-3">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2">Loading containers...</p>
                    </div>
                ) : !available ? (
                    <Alert variant="warning">
                        Docker is not available. Please start Docker Desktop to see containers.
                    </Alert>
                ) : containers.length === 0 ? (
                    <Alert variant="info">No running Docker containers found</Alert>
                ) : (
                    <div className="table-responsive">
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                    <th>Container ID</th>
                                    <th>Image</th>
                                    <th>Status</th>
                                    <th>Name</th>
                                    <th>Ports</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {containers.map(container => (
                                    <tr key={container.id}>
                                        <td>
                                            <code>{container.id.substring(0, 12)}</code>
                                        </td>
                                        <td>{container.image}</td>
                                        <td>
                                            <Badge bg={container.status.includes('Up') ? 'success' : 'warning'}>
                                                {container.status}
                                            </Badge>
                                        </td>
                                        <td>{container.names}</td>
                                        <td>{container.ports || 'None'}</td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                {container.status.includes('Up') && container.ports && (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => handleOpenContainer(container)}
                                                    >
                                                        <i className="fas fa-external-link-alt me-1"></i>
                                                        Open
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleStopContainer(container.id)}
                                                    disabled={stoppingContainers[container.id]}
                                                >
                                                    {stoppingContainers[container.id] ? (
                                                        <>
                                                            <Spinner
                                                                as="span"
                                                                animation="border"
                                                                size="sm"
                                                                role="status"
                                                                aria-hidden="true"
                                                                className="me-1"
                                                            />
                                                            Stopping...
                                                        </>
                                                    ) : (
                                                        'Stop'
                                                    )}
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

export default DockerContainersList; 