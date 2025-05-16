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
    const [deletingImages, setDeletingImages] = useState({});
    const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
    const [imageToDelete, setImageToDelete] = useState(null);

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
        // Generate a unique container name with timestamp to avoid conflicts
        const timestamp = new Date().getTime().toString().slice(-6); // Last 6 digits of timestamp
        setContainerConfig({
            containerName: `${image.repository}-${timestamp}`,
            hostPort: '4080',
            containerPort: '3000'
        });
        setRunError(null);
        setRunSuccess(null);
        setShowModal(true);
    };

    const handleDeleteClick = (image) => {
        setImageToDelete(image);
        setDeleteConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!imageToDelete) return;

        const imageId = imageToDelete.id;
        setDeletingImages(prev => ({ ...prev, [imageId]: true }));

        try {
            await axios.delete(`${API_URL}/docker/images/${imageId}`);
            // Remove the deleted image from the state
            setImages(images.filter(img => img.id !== imageId));
            setDeleteConfirmModal(false);
            setImageToDelete(null);
        } catch (err) {
            setError(err.response?.data?.error || `Failed to delete image: ${imageId}`);
        } finally {
            setDeletingImages(prev => ({ ...prev, [imageId]: false }));
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setRunError(null);
        setRunSuccess(null);
    };

    const handleDeleteModalClose = () => {
        setDeleteConfirmModal(false);
        setImageToDelete(null);
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
            // Check if error is related to container name conflict
            const errorMessage = err.response?.data?.details || err.message || 'Error running container';
            if (errorMessage.includes('is already in use')) {
                setRunError('Container name already in use. A unique name has been generated for you. Please try again.');
                // Generate a new unique name for next attempt
                const newTimestamp = new Date().getTime().toString().slice(-6);
                setContainerConfig(prev => ({
                    ...prev,
                    containerName: `${selectedImage.repository}-${newTimestamp}`
                }));
            } else if (errorMessage.includes('port is already allocated')) {
                setRunError('Port already in use. Please choose a different host port and try again.');
            } else {
                setRunError(err.response?.data?.error || errorMessage);
            }
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
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => handleRunClick(image)}
                                                    >
                                                        Run
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleDeleteClick(image)}
                                                        disabled={deletingImages[image.id]}
                                                    >
                                                        {deletingImages[image.id] ? (
                                                            <Spinner
                                                                as="span"
                                                                animation="border"
                                                                size="sm"
                                                                role="status"
                                                                aria-hidden="true"
                                                            />
                                                        ) : (
                                                            'Delete'
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
                            <div className="mt-3">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => window.open(`http://localhost:${containerConfig.hostPort}`, '_blank')}
                                >
                                    <i className="fas fa-external-link-alt me-1"></i>
                                    Open in Browser
                                </Button>
                                <small className="text-muted ms-2">
                                    Opens http://localhost:{containerConfig.hostPort}
                                </small>
                            </div>
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
                            <Form.Text className="text-muted">
                                A unique name for your container. Each container must have a unique name.
                            </Form.Text>
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

            {/* Delete Confirmation Modal */}
            <Modal show={deleteConfirmModal} onHide={handleDeleteModalClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Deletion</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {imageToDelete && (
                        <div>
                            <p>Are you sure you want to delete this image?</p>
                            <p><strong>Repository:</strong> {imageToDelete.repository}</p>
                            <p><strong>Tag:</strong> {imageToDelete.tag}</p>
                            <p><strong>ID:</strong> {imageToDelete.id}</p>
                            <Alert variant="warning">
                                This action cannot be undone. This will permanently delete the image.
                            </Alert>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleDeleteModalClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={confirmDelete}
                        disabled={deletingImages[imageToDelete?.id]}
                    >
                        {deletingImages[imageToDelete?.id] ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Deleting...
                            </>
                        ) : (
                            'Delete Image'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default DockerImagesList; 