import React from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';
import { useDockerStatus } from './DockerStatusContext';

const DockerStatusAlert = () => {
    const { available, loading, message, suggestion, refreshStatus } = useDockerStatus();

    if (loading) {
        return (
            <Alert variant="info">
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Checking Docker status...
            </Alert>
        );
    }

    if (available === false) {
        return (
            <Alert variant="warning">
                <Alert.Heading>Docker Not Available</Alert.Heading>
                <p>{message}</p>
                {suggestion && <p><strong>Suggestion:</strong> {suggestion}</p>}
                <hr />
                <div className="d-flex justify-content-end">
                    <Button variant="outline-warning" size="sm" onClick={refreshStatus}>
                        Check Again
                    </Button>
                </div>
            </Alert>
        );
    }

    if (available === true) {
        return null; // No need to show anything if Docker is available
    }

    return null;
};

export default DockerStatusAlert; 