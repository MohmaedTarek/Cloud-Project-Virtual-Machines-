import React, { useState } from 'react';
import { Card, Form, Button, Alert, Table, Spinner, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import { useDockerStatus } from './DockerStatusContext';

const API_URL = 'http://localhost:5000/api';

const SearchDockerImages = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);
    const { available } = useDockerStatus();

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) {
            setError('Please enter a search term');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(`${API_URL}/docker/images/search`, {
                params: { term: searchTerm }
            });

            setSearchResults(response.data.images || []);
            setSearched(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Error searching for Docker images');
            console.error('Error searching Docker images:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="shadow-sm mb-4">
            <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">Search Local Docker Images</h5>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}

                <Form onSubmit={handleSearch} className="mb-4">
                    <Form.Group className="mb-3">
                        <Form.Label>Search for Docker Images</Form.Label>
                        <InputGroup>
                            <Form.Control
                                type="text"
                                placeholder="Enter image name or tag (e.g., nginx, ubuntu:latest)"
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
                            Search for images by name or tag on your local Docker installation
                        </Form.Text>
                    </Form.Group>
                </Form>

                {searched && !loading && searchResults.length === 0 && (
                    <Alert variant="info">
                        No Docker images found matching "{searchTerm}". Try a different search term.
                    </Alert>
                )}

                {searchResults.length > 0 && (
                    <>
                        <h6>Search Results ({searchResults.length} images found)</h6>
                        <div className="table-responsive">
                            <Table striped bordered hover>
                                <thead>
                                    <tr>
                                        <th>Repository</th>
                                        <th>Tag</th>
                                        <th>Image ID</th>
                                        <th>Size</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {searchResults.map(image => (
                                        <tr key={image.id}>
                                            <td>{image.repository}</td>
                                            <td>{image.tag}</td>
                                            <td>
                                                <code>{image.id.substring(0, 12)}</code>
                                            </td>
                                            <td>{image.size}</td>
                                            <td>{image.created}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </>
                )}
            </Card.Body>
        </Card>
    );
};

export default SearchDockerImages; 