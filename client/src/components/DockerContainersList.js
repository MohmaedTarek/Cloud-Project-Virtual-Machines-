import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useDockerStatus } from './DockerStatusContext';

const API_URL = 'http://localhost:5000/api';

const DockerContainersList = () => {
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { available } = useDockerStatus();

    const fetchContainers = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(`${API_URL}/docker/containers`);
            setContainers(response.data.containers || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Error fetching Docker containers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (available === true) {
            fetchContainers();
        }
    }, [available]);

    return (
        <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Running Docker Containers</h5>
                <Button
                    variant="light"
                    size="sm"
                    onClick={fetchContainers}
                    disabled={loading || available !== true}
                >
                    {loading ? (
                        <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                        />
                    ) : (
                        <i className="fas fa-sync-alt"></i>
                    )}
                </Button>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}

                {loading && !containers.length ? (
                    <div className="text-center py-4">
                        <Spinner animation="border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                    </div>
                ) : containers.length === 0 && available === true ? (
                    <Alert variant="info">No running Docker containers found</Alert>
                ) : (
                    <div className="table-responsive">
                        <Table striped hover>
                            <thead>
                                <tr>
                                    <th>Container ID</th>
                                    <th>Image</th>
                                    <th>Status</th>
                                    <th>Name</th>
                                    <th>Ports</th>
                                </tr>
                            </thead>
                            <tbody>
                                {containers.map((container, index) => (
                                    <tr key={index}>
                                        <td>{container.id}</td>
                                        <td>{container.image}</td>
                                        <td>{container.status}</td>
                                        <td>{container.names}</td>
                                        <td>{container.ports}</td>
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