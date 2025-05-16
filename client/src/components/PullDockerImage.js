import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import { useDockerStatus } from './DockerStatusContext';

const API_URL = 'http://localhost:5000/api';

const PullDockerImage = () => {
    const [imageName, setImageName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [progress, setProgress] = useState('');
    const { available } = useDockerStatus();
    const progressRef = useRef(null);

    // Check if there's an image name in localStorage (from SearchDockerHub)
    useEffect(() => {
        const savedImageName = localStorage.getItem('dockerImageToPull');
        if (savedImageName) {
            setImageName(savedImageName);
            // Clear the stored image name to avoid reusing it unexpectedly
            localStorage.removeItem('dockerImageToPull');
        }
    }, []);

    // Auto-scroll to the bottom of the progress output
    useEffect(() => {
        if (progressRef.current) {
            progressRef.current.scrollTop = progressRef.current.scrollHeight;
        }
    }, [progress]);

    const handlePull = async (e) => {
        e.preventDefault();
        if (!imageName.trim()) {
            setError('Please enter an image name');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);
        setProgress('');

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
                                    setSuccess(data.message);
                                } else if (data.success === false) {
                                    setError(data.error);
                                }
                            } catch (parseErr) {
                                // Ignore parse errors for incomplete JSON
                            }
                        }

                        if (allProgress) {
                            setProgress(prev => prev + allProgress);
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            };

            xhr.onload = () => {
                setLoading(false);
                if (xhr.status !== 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        setError(response.error || 'Failed to pull Docker image');
                    } catch (e) {
                        setError('Failed to pull Docker image');
                    }
                }
            };

            xhr.onerror = () => {
                setLoading(false);
                setError('Network error occurred while pulling the image');
            };

            // Send the request
            xhr.send(JSON.stringify({ imageName }));
        } catch (err) {
            setLoading(false);
            setError(err.message || 'An unexpected error occurred');
        }
    };

    return (
        <Card className="shadow-sm mb-4">
            <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">Pull Docker Image</h5>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Form onSubmit={handlePull} className="mb-4">
                    <Form.Group className="mb-3">
                        <Form.Label>Image Name</Form.Label>
                        <InputGroup>
                            <Form.Control
                                type="text"
                                placeholder="Enter image name (e.g., nginx:latest, ubuntu:20.04)"
                                value={imageName}
                                onChange={(e) => setImageName(e.target.value)}
                                disabled={loading || !available}
                                required
                            />
                            <Button
                                type="submit"
                                disabled={loading || !available || !imageName.trim()}
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
                                        Pulling...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-download me-1"></i>
                                        Pull Image
                                    </>
                                )}
                            </Button>
                        </InputGroup>
                        <Form.Text className="text-muted">
                            Pull an image from DockerHub. Internet connection required.
                        </Form.Text>
                    </Form.Group>
                </Form>

                {progress && (
                    <div className="mt-4">
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
                            {progress}
                        </pre>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default PullDockerImage; 