import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import axios from 'axios';
import { useDockerStatus } from './DockerStatusContext';

const API_URL = 'http://localhost:5000/api';

const DockerImagesList = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { available } = useDockerStatus();
    const [showModal, setShowModal] = useState(false);
    const [runningContainer, setRunningContainer] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [containerConfig, setContainerConfig] = useState({
        containerName: '',
        hostPort: '4080',
        containerPort: '3000'
    });
    const [runError, setRunError] = useState(null);
    const [runSuccess, setRunSuccess] = useState(null);

    const fetchImages = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(`${API_URL}/docker/images`);
            setImages(response.data.images || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Error fetching Docker images');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (available === true) {
            fetchImages();
        }
    }, [available]);

    const handleRunClick = (image) => {
        setSelectedImage(image);
        setContainerConfig({
            containerName: `${image.repository}-container`,
            hostPort: '4080',
            containerPort: '3000'
        });
        setRunError(null);
        setRunSuccess(null);
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setRunError(null);
        setRunSuccess(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setContainerConfig({
            ...containerConfig,
            [name]: value
        });
    };

    const runContainer = async () => {
        setRunningContainer(true);
        setRunError(null);
        setRunSuccess(null);

        try {
            const response = await axios.post(`${API_URL}/docker/run`, {
                imageName: `${selectedImage.repository}:${selectedImage.tag}`,
                containerName: containerConfig.containerName,
                hostPort: containerConfig.hostPort,
                containerPort: containerConfig.containerPort
            });

            setRunSuccess({
                message: 'Container started successfully!',
                containerId: response.data.containerId,
                details: response.data.details
            });

            // Fetch the updated containers list
            // This assumes you have a way to refresh the containers list in another component
            // You might want to implement a context or other state management for this
        } catch (err) {
            setRunError(err.response?.data?.error || 'Error running container');
        } finally {
            setRunningContainer(false);
        }
    };

    return (
        <>
            <Card className="shadow-sm">
                <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Docker Images</h5>
                    <Button
                        variant="light"
                        size="sm"
                        onClick={fetchImages}
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

                    {loading && !images.length ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </Spinner>
                        </div>
                    ) : images.length === 0 && available === true ? (
                        <Alert variant="info">No Docker images found</Alert>
                    ) : (
                        <div className="table-responsive">
                            <Table striped hover>
                                <thead>
                                    <tr>
                                        <th>Repository</th>
                                        <th>Tag</th>
                                        <th>Image ID</th>
                                        <th>Size</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {images.map((image, index) => (
                                        <tr key={index}>
                                            <td>{image.repository}</td>
                                            <td>{image.tag}</td>
                                            <td>{image.id}</td>
                                            <td>{image.size}</td>
                                            <td>{image.created}</td>
                                            <td>
                                                <Button 
                                                    variant="primary" 
                                                    size="sm" 
                                                    onClick={() => handleRunClick(image)}
                                                >
                                                    Run Container
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Run Container Modal */}
            <Modal show={showModal} onHide={handleModalClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Run Container</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedImage && (
                        <div className="mb-3">
                            <p>
                                <strong>Image:</strong> {selectedImage.repository}:{selectedImage.tag}
                            </p>
                        </div>
                    )}

                    {runError && (
                        <Alert variant="danger" className="mb-3">
                            {runError}
                        </Alert>
                    )}

                    {runSuccess && (
                        <Alert variant="success" className="mb-3">
                            {runSuccess.message}
                            <hr />
                            <p className="mb-0"><strong>Container ID:</strong> {runSuccess.containerId}</p>
                            <p className="mb-0"><strong>Ports:</strong> {runSuccess.details.ports}</p>
                        </Alert>
                    )}

                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Container Name (optional)</Form.Label>
                            <Form.Control
                                type="text"
                                name="containerName"
                                value={containerConfig.containerName}
                                onChange={handleInputChange}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Host Port</Form.Label>
                            <Form.Control
                                type="text"
                                name="hostPort"
                                value={containerConfig.hostPort}
                                onChange={handleInputChange}
                                required
                            />
                            <Form.Text className="text-muted">
                                External port on your host machine (must be different from 3000 and 5000)
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Container Port</Form.Label>
                            <Form.Control
                                type="text"
                                name="containerPort"
                                value={containerConfig.containerPort}
                                onChange={handleInputChange}
                                required
                            />
                            <Form.Text className="text-muted">
                                Internal port inside the container (usually 3000 for Node.js apps)
                            </Form.Text>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleModalClose}>
                        Close
                    </Button>
                    <Button
                        variant="primary"
                        onClick={runContainer}
                        disabled={runningContainer || !containerConfig.hostPort || !containerConfig.containerPort}
                    >
                        {runningContainer ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Running...
                            </>
                        ) : (
                            'Run Container'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default DockerImagesList; 