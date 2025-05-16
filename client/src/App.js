import { useState, useEffect } from 'react';
import { Container, Row, Col, Nav, Tab, Navbar, Button } from 'react-bootstrap';
import axios from 'axios';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

// Import components
import CreateDisk from './components/CreateDisk';
import DeleteDisk from './components/DeleteDisk';
import CreateVM from './components/CreateVM';
import VMList from './components/VMList';
import SystemResources from './components/SystemResources';
import { ThemeProvider } from './components/ThemeContext';
import ThemeSwitcher from './components/ThemeSwitcher';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [disks, setDisks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch all disks on component mount
  useEffect(() => {
    fetchDisks();
  }, []);
  
  // Function to fetch all disks
  const fetchDisks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/disks`);
      setDisks(response.data.disks || []);
    } catch (error) {
      console.error('Error fetching disks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider>
      <div className="App">
        <Navbar expand="lg" className="navbar-themed">
          <Container>
            <Navbar.Brand className="d-flex align-items-center">
              <i className="fas fa-server me-2"></i>
              Virtual Machine Manager
            </Navbar.Brand>
            <div className="ms-auto">
              <ThemeSwitcher />
            </div>
          </Container>
        </Navbar>
        
        <Container className="mt-4">
          <Row>
            <Col>
              {/* System Resources Component at the top */}
              <SystemResources />
              
              <Tab.Container id="left-tabs" defaultActiveKey="createDisk">
                <Row>
                  <Col sm={3}>
                    <div className="nav-container">
                      <Nav variant="pills" className="flex-column">
                        <Nav.Item>
                          <Nav.Link eventKey="createDisk">
                            <i className="fas fa-plus-circle me-2"></i>
                            Create Disk
                          </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                          <Nav.Link eventKey="deleteDisk">
                            <i className="fas fa-trash-alt me-2"></i>
                            Delete Disk
                          </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                          <Nav.Link eventKey="createVM">
                            <i className="fas fa-play-circle me-2"></i>
                            Create VM
                          </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                          <Nav.Link eventKey="vmList">
                            <i className="fas fa-server me-2"></i>
                            Running VMs
                          </Nav.Link>
                        </Nav.Item>
                      </Nav>
                    </div>
                  </Col>
                <Col sm={9}>
                  <Tab.Content>
                    <Tab.Pane eventKey="createDisk">
                      <CreateDisk onDiskCreated={fetchDisks} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="deleteDisk">
                      <DeleteDisk disks={disks} onDiskDeleted={fetchDisks} onRefreshDisks={fetchDisks} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="createVM">
                      <CreateVM disks={disks} onRefreshDisks={fetchDisks} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="vmList">
                      <VMList />
                    </Tab.Pane>
                  </Tab.Content>
                </Col>
              </Row>
            </Tab.Container>
          </Col>
        </Row>
      </Container>
    </div>
    </ThemeProvider>
  );
}

export default App;
