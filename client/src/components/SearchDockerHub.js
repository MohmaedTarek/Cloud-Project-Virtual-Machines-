import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Alert, Table, Spinner, InputGroup, Badge, Modal } from 'react-bootstrap';
import axios from 'axios';
import { useDockerStatus } from './DockerStatusContext';

const API_URL = 'http://localhost:5000/api';

const SearchDockerHub = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);
    const { available } = useDockerStatus();

    // Add states for pull functionality
    const [showPullModal, setShowPullModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState('');
    const [pullProgress, setPullProgress] = useState('');
    const [isPulling, setIsPulling] = useState(false);
    const [pullSuccess, setPullSuccess] = useState(null);
    const [pullError, setPullError] = useState(null);
    const progressRef = useRef(null);

    // Auto-scroll to the bottom of the progress output
    useEffect(() => {
        if (progressRef.current) {
            progressRef.current.scrollTop = progressRef.current.scrollHeight;
        }
    }, [pullProgress]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) {
            setError('Please enter a search term');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(`${API_URL}/docker/dockerhub/search`, {
                params: { term: searchTerm }
            });

            setSearchResults(response.data.results || []);
            setSearched(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Error searching DockerHub');
            console.error('Error searching DockerHub:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePullImage = (imageName) => {
        setSelectedImage(imageName);
        setPullProgress('');
        setPullSuccess(null);
        setPullError(null);
        setShowPullModal(true);
    };

    const handlePullModalClose = () => {
        if (!isPulling) {
            setShowPullModal(false);
        }
    };

    const startPullImage = async () => {
        if (!selectedImage) return;

        setIsPulling(true);
        setPullProgress('');
        setPullError(null);
        setPullSuccess(null);

        try {
            // Create a new XMLHttpRequest to handle streaming response
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_URL}/docker/dockerhub/pull`, true);
            xhr.setRequestHeader('Content-Type', 'application/json');

            // Handle progress events
            xhr.onprogress = (event) => {
                const responseText = xhr.responseText;
                if (responseText) {
                    try {
                        // The response might contain multiple JSON objects
                        // Split by line and process each
                        const parts = responseText.split('}').filter(part => part.trim());
                        let allProgress = '';

                        for (let i = 0; i < parts.length; i++) {
                            try {
                                // Add the missing closing brace
                                const jsonStr = parts[i] + (parts[i].endsWith('}') ? '' : '}');
                                const data = JSON.parse(jsonStr);

                                if (data.progress) {
                                    allProgress += data.progress;
                                }

                                if (data.success === true) {
                                    setPullSuccess(data.message);
                                } else if (data.success === false) {
                                    setPullError(data.error);
                                }
                            } catch (parseErr) {
                                // Ignore parse errors for incomplete JSON
                            }
                        }

                        if (allProgress) {
                            setPullProgress(prev => prev + allProgress);
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            };

            xhr.onload = () => {
                setIsPulling(false);
                if (xhr.status !== 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        setPullError(response.error || 'Failed to pull Docker image');
                    } catch (e) {
                        setPullError('Failed to pull Docker image');
                    }
                }
            };

            xhr.onerror = () => {
                setIsPulling(false);
                setPullError('Network error occurred while pulling the image');
            };

            // Send the request
            xhr.send(JSON.stringify({ imageName: selectedImage }));
        } catch (err) {
            setIsPulling(false);
            setPullError(err.message || 'An unexpected error occurred');
        }
    };

    return (
        <>
            <Card className="shadow-sm mb-4">
                <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">Search DockerHub</h5>
                </Card.Header>
                <Card.Body>
                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={handleSearch} className="mb-4">
                        <Form.Group className="mb-3">
                            <Form.Label>Search DockerHub for Images</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type="text"
                                    placeholder="Enter image name (e.g., nginx, ubuntu, mysql)"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    disabled={!available || loading}
                                    required
                                />
                                <Button
                                    type="submit"
                                    disabled={loading || !available || !searchTerm.trim()}
                                    variant="primary"
                                >
                                    {loading ? (
                                        <>
                                            <Spinner
                                                as="span"
                                                animation="border"
                                                size="sm"
                                                role="status"
                                                aria-hidden="true"
                                                className="me-1"
                                            />
                                            Searching...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-search me-1"></i>
                                            Search
                                        </>
                                    )}
                                </Button>
                            </InputGroup>
                            <Form.Text className="text-muted">
                                Search for images on DockerHub. Internet connection required.
                            </Form.Text>
                        </Form.Group>
                    </Form>

                    {searched && !loading && searchResults.length === 0 && (
                        <Alert variant="info">
                            No Docker images found matching "{searchTerm}" on DockerHub. Try a different search term.
                        </Alert>
                    )}

                    {searchResults.length > 0 && (
                        <>
                            <h6>Search Results ({searchResults.length} images found)</h6>
                            <div className="table-responsive">
                                <Table striped bordered hover>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Description</th>
                                            <th>Stars</th>
                                            <th>Official</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {searchResults.map((image, index) => (
                                            <tr key={index}>
                                                <td>{image.name}</td>
                                                <td>
                                                    {image.description.length > 100
                                                        ? `${image.description.substring(0, 97)}...`
                                                        : image.description}
                                                </td>
                                                <td>{image.stars.toLocaleString()}</td>
                                                <td>
                                                    {image.official ? (
                                                        <Badge bg="success">Official</Badge>
                                                    ) : (
                                                        <Badge bg="secondary">Community</Badge>
                                                    )}
                                                </td>
                                                <td>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => handlePullImage(image.name)}
                                                    >
                                                        <i className="fas fa-download me-1"></i>
                                                        Pull
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </>
                    )}
                </Card.Body>
            </Card>

            {/* Pull Image Modal */}
            <Modal show={showPullModal} onHide={handlePullModalClose} size="lg">
                <Modal.Header closeButton={!isPulling}>
                    <Modal.Title>Pull Docker Image</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {pullError && <Alert variant="danger">{pullError}</Alert>}
                    {pullSuccess && <Alert variant="success">{pullSuccess}</Alert>}

                    <p><strong>Image:</strong> {selectedImage}</p>

                    {!isPulling && !pullSuccess ? (
                        <div className="d-flex justify-content-end">
                            <Button variant="secondary" className="me-2" onClick={handlePullModalClose}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={startPullImage}>
                                Start Pull
                            </Button>
                        </div>
                    ) : null}

                    {isPulling && (
                        <div className="text-center mb-3">
                            <Spinner animation="border" />
                            <p className="mt-2">Pulling image... This may take a while.</p>
                        </div>
                    )}

                    {pullProgress && (
                        <div className="mt-3">
                            <h6>Pull Progress:</h6>
                            <pre
                                className="border p-3 bg-light"
                                style={{
                                    height: '300px',
                                    overflow: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all'
                                }}
                                ref={progressRef}
                            >
                                {pullProgress}
                            </pre>
                        </div>
                    )}
                </Modal.Body>
                {!isPulling && pullSuccess && (
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handlePullModalClose}>
                            Close
                        </Button>
                    </Modal.Footer>
                )}
            </Modal>
        </>
    );
};

export default SearchDockerHub; 