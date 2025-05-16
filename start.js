const concurrently = require('concurrently');
const path = require('path');

// Define paths
const serverPath = path.join(__dirname, 'server');
const clientPath = path.join(__dirname, 'client');

// Run both client and server
const { result } = concurrently([
  { 
    command: 'npm start', 
    name: 'server', 
    cwd: serverPath, 
    prefixColor: 'blue',
    env: { PORT: '5000' }
  },
  { 
    command: 'npm start', 
    name: 'client', 
    cwd: clientPath, 
    prefixColor: 'green',
    env: { PORT: '3000' }
  }
], {
  prefix: 'name',
  killOthers: ['failure', 'success'],
  restartTries: 3
});

result.then(
  () => console.log('All processes exited with code 0'),
  (error) => console.error('One or more processes failed', error)
);
