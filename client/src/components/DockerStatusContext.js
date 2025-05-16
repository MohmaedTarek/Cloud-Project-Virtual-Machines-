import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create the context
const DockerStatusContext = createContext();

// Create a provider component
export const DockerStatusProvider = ({ children }) => {
    const [dockerStatus, setDockerStatus] = useState({
        available: null,
        loading: true,
        error: null,
        message: null,
        suggestion: null
    });

    const checkDockerStatus = async () => {
        setDockerStatus(prev => ({ ...prev, loading: true }));
        try {
            const response = await axios.get(`${API_URL}/docker/status`);
            setDockerStatus({
                available: response.data.available,
                loading: false,
                error: null,
                message: response.data.message,
                suggestion: response.data.suggestion || null
            });
        } catch (error) {
            setDockerStatus({
                available: false,
                loading: false,
                error: 'Failed to check Docker status',
                message: 'Could not connect to Docker service',
                suggestion: 'Please ensure Docker Desktop is installed and running'
            });
        }
    };

    // Check Docker status on mount
    useEffect(() => {
        checkDockerStatus();
    }, []);

    return (
        <DockerStatusContext.Provider value={{ ...dockerStatus, refreshStatus: checkDockerStatus }}>
            {children}
        </DockerStatusContext.Provider>
    );
};

// Custom hook to use the context
export const useDockerStatus = () => {
    const context = useContext(DockerStatusContext);
    if (context === undefined) {
        throw new Error('useDockerStatus must be used within a DockerStatusProvider');
    }
    return context;
};

export default DockerStatusContext; 