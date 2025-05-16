import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useDockerStatus } from './DockerStatusContext';

const API_URL = 'http://localhost:5000/api';

const BuildDockerImage = () => {
    const [dockerfiles, setDockerfiles] = useState([]);
    const [selectedDockerfile, setSelectedDockerfile] = useState('');
    const [imageName, setImageName] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingDockerfiles, setFetchingDockerfiles] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [output, setOutput] = useState('');
    const { available } = useDockerStatus();

    // Fetch available Dockerfiles
    useEffect(() => {
        const fetchDockerfiles = async () => {
            setFetchingDockerfiles(true);
            try {
                const response = await axios.get(`${API_URL}/docker/dockerfiles`);
                setDockerfiles(response.data.dockerfiles || []);

                // If there are Dockerfiles, select the first one by default
                if (response.data.dockerfiles && response.data.dockerfiles.length > 0) {
                    setSelectedDockerfile(response.data.dockerfiles[0]);
                }
            } catch (err) {
                console.error('Error fetching Dockerfiles:', err);
                setError('Failed to load Dockerfiles. Please try again later.');
            } finally {
                setFetchingDockerfiles(false);
            }
        };

        fetchDockerfiles();
    }, []);

    const handleRefreshDockerfiles = async () => {
        setFetchingDockerfiles(true);
        setError(null);

        try {
            const response = await axios.get(`${API_URL}/docker/dockerfiles`);
            setDockerfiles(response.data.dockerfiles || []);

            // If there are Dockerfiles, select the first one by default
            if (response.data.dockerfiles && response.data.dockerfiles.length > 0) {
                setSelectedDockerfile(response.data.dockerfiles[0]);
            } else {
                setSelectedDockerfile('');
            }
        } catch (err) {
            console.error('Error refreshing Dockerfiles:', err);
            setError('Failed to refresh Dockerfiles list');
        } finally {
            setFetchingDockerfiles(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        setOutput('');

        try {
            const response = await axios.post(`${API_URL}/docker/build`, {
                dockerfileName: selectedDockerfile,
                imageName
            });

            setSuccess(`Docker image ${response.data.imageName} built successfully`);
            if (response.data.output) {
                setOutput(response.data.output);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error building Docker image');
            if (err.response?.data?.details) {
                setOutput(err.response.data.details);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">Build Docker Image</h5>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Dockerfile</Form.Label>
                        <div className="d-flex align-items-center">
                            <Form.Select
                                value={selectedDockerfile}
                                onChange={(e) => setSelectedDockerfile(e.target.value)}
                                disabled={fetchingDockerfiles || !available || dockerfiles.length === 0}
                                required
                                className="me-2"
                            >
                                {dockerfiles.length === 0 ? (
                                    <option value="">No Dockerfiles available</option>
                                ) : (
                                    dockerfiles.map((file, index) => (
                                        <option key={index} value={file}>{file}</option>
                                    ))
                                )}
                            </Form.Select>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={handleRefreshDockerfiles}
                                disabled={fetchingDockerfiles || !available}
                            >
                                {fetchingDockerfiles ? (
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
                        </div>
                        <Form.Text className="text-muted">
                            Select a Dockerfile from the DockerFiles folder.
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Image Name</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Enter image name and tag (e.g., myapp:latest)"
                            value={imageName}
                            onChange={(e) => setImageName(e.target.value)}
                            required
                            disabled={!available}
                        />
                        <Form.Text className="text-muted">
                            Format: name:tag (e.g., nginx:1.19)
                        </Form.Text>
                    </Form.Group>

                    <Button
                        type="submit"
                        variant="primary"
                        disabled={loading || !available || !selectedDockerfile}
                    >
                        {loading ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Building...
                            </>
                        ) : (
                            'Build Image'
                        )}
                    </Button>
                </Form>

                {output && (
                    <div className="mt-4">
                        <h6>Build Output:</h6>
                        <pre className="border p-3 bg-light" style={{ maxHeight: '300px', overflow: 'auto' }}>
                            {output}
                        </pre>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default BuildDockerImage; 