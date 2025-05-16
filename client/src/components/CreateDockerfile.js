import React, { useState } from 'react';
import { Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const CreateDockerfile = () => {
    const [fileName, setFileName] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Example Dockerfile templates
    const nodeTemplate = `FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;

    const pythonTemplate = `FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]`;

    const applyTemplate = (template) => {
        setContent(template);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await axios.post(`${API_URL}/docker/dockerfile`, {
                fileName,
                content
            });

            setSuccess(`Dockerfile "${fileName}" created successfully in the DockerFiles folder`);
            // Clear the form
            setFileName('');
            setContent('');
        } catch (err) {
            setError(err.response?.data?.error || 'Error creating Dockerfile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">Create Dockerfile</h5>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Dockerfile Name</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Enter Dockerfile name (e.g., node-dockerfile, python-app)"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            required
                        />
                        <Form.Text className="text-muted">
                            File will be saved in the DockerFiles folder.
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Dockerfile Content</Form.Label>
                        <div className="d-flex gap-2 mb-2">
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => applyTemplate(nodeTemplate)}
                            >
                                Node.js Template
                            </Button>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => applyTemplate(pythonTemplate)}
                            >
                                Python Template
                            </Button>
                        </div>
                        <Form.Control
                            as="textarea"
                            rows={10}
                            placeholder="Enter Dockerfile contents"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                    </Form.Group>

                    <Button type="submit" variant="primary" disabled={loading}>
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
                                Creating...
                            </>
                        ) : (
                            'Create Dockerfile'
                        )}
                    </Button>
                </Form>
            </Card.Body>
        </Card>
    );
};

export default CreateDockerfile; 