/**
 * QEMU Path Configuration Helper
 * 
 * This script helps find and configure the correct path to QEMU executables.
 * It will search common installation locations and let you specify a custom path.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

// Common QEMU installation paths on Windows
const commonQemuPaths = [
    'C:\\Program Files\\qemu',
    'C:\\Program Files (x86)\\qemu',
    'C:\\qemu',
    'C:\\Program Files\\QEMU'
];

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Check if a path exists and contains qemu-img.exe
function checkPath(qemuPath) {
    const qemuImg = path.join(qemuPath, 'qemu-img.exe');
    return fs.existsSync(qemuImg);
}

// Try to run qemu-img from the specified path
function testQemuImg(qemuPath) {
    return new Promise((resolve) => {
        const qemuImg = path.join(qemuPath, 'qemu-img.exe');
        exec(`"${qemuImg}" --version`, (error, stdout) => {
            if (error) {
                resolve({ success: false, error });
            } else {
                resolve({ success: true, version: stdout.trim() });
            }
        });
    });
}

// Save the QEMU path to environment
function saveQemuPath(qemuPath) {
    // Create a .env file with the QEMU_DIR environment variable
    const envContent = `QEMU_DIR=${qemuPath.replace(/\\/g, '\\\\')}`;
    
    fs.writeFileSync(path.join(__dirname, '.env'), envContent);
    console.log(`\n✅ QEMU path saved to .env file: ${qemuPath}`);
    console.log('This path will be used by the server to locate QEMU executables.');
}

// Main function
async function main() {
    console.log('🔍 Checking for QEMU installation...\n');
    
    // First check if qemu-img is in PATH
    console.log('Checking if QEMU is in your system PATH...');
    let inPath = false;
    
    try {
        await new Promise((resolve) => {
            exec('qemu-img --version', (error, stdout) => {
                if (!error) {
                    console.log(`✅ QEMU found in PATH: ${stdout.trim()}`);
                    inPath = true;
                } else {
                    console.log('❌ QEMU not found in PATH.');
                }
                resolve();
            });
        });
    } catch (error) {
        console.log('❌ QEMU not found in PATH.');
    }
    
    if (inPath) {
        console.log('\nQEMU is already in your system PATH. You can run the server without any additional configuration.');
        rl.question('\nWould you still like to specify a custom QEMU path? (y/n): ', (answer) => {
            if (answer.toLowerCase() !== 'y') {
                console.log('\nUsing QEMU from system PATH.');
                rl.close();
                return;
            }
            checkCommonPaths();
        });
    } else {
        checkCommonPaths();
    }
}

// Check common QEMU installation paths
async function checkCommonPaths() {
    console.log('\nSearching common installation locations...');
    
    // Check if the QEMU installer is in the workspace
    const workspacePath = path.resolve(__dirname, '..');
    const installerPath = path.join(workspacePath, 'qemu-w64-setup-20250422.exe');
    
    if (fs.existsSync(installerPath)) {
        console.log(`\n📦 Found QEMU installer: ${installerPath}`);
        console.log('If QEMU is not installed, you can run this installer.');
    }
    
    // Check common installation paths
    let foundPaths = [];
    
    for (const qemuPath of commonQemuPaths) {
        if (checkPath(qemuPath)) {
            foundPaths.push(qemuPath);
            const testResult = await testQemuImg(qemuPath);
            
            if (testResult.success) {
                console.log(`✅ Found QEMU at: ${qemuPath} (${testResult.version})`);
            } else {
                console.log(`⚠️ Found QEMU files at ${qemuPath}, but execution failed.`);
            }
        }
    }
    
    if (foundPaths.length === 0) {
        console.log('❌ QEMU not found in common installation locations.');
    }
    
    // Prompt user for path selection or custom path
    promptForPath(foundPaths);
}

// Prompt user to select or enter a QEMU path
function promptForPath(foundPaths) {
    if (foundPaths.length > 0) {
        console.log('\nSelect a QEMU installation path:');
        foundPaths.forEach((path, index) => {
            console.log(`${index + 1}. ${path}`);
        });
        console.log(`${foundPaths.length + 1}. Enter custom path`);
        console.log(`${foundPaths.length + 2}. Install QEMU first`);
        
        rl.question('\nEnter selection number: ', async (answer) => {
            const selection = parseInt(answer);
            
            if (selection >= 1 && selection <= foundPaths.length) {
                const selectedPath = foundPaths[selection - 1];
                const testResult = await testQemuImg(selectedPath);
                
                if (testResult.success) {
                    saveQemuPath(selectedPath);
                } else {
                    console.log(`⚠️ QEMU found at ${selectedPath}, but execution failed.`);
                    console.log('Error:', testResult.error);
                    console.log('Please select another path or ensure QEMU is correctly installed.');
                    promptForPath(foundPaths);
                    return;
                }
            } else if (selection === foundPaths.length + 1) {
                promptForCustomPath();
            } else {
                console.log('\nPlease install QEMU and run this script again.');
                console.log('You can use the QEMU installer found in your workspace or download it from:');
                console.log('https://www.qemu.org/download/');
                console.log('\nDuring installation, make sure to select the option to add QEMU to your system PATH.');
            }
            
            rl.close();
        });
    } else {
        console.log('\nOptions:');
        console.log('1. Enter custom path');
        console.log('2. Install QEMU first');
        
        rl.question('\nEnter selection number: ', (answer) => {
            if (answer === '1') {
                promptForCustomPath();
            } else {
                console.log('\nPlease install QEMU and run this script again.');
                console.log('You can use the QEMU installer found in your workspace or download it from:');
                console.log('https://www.qemu.org/download/');
                console.log('\nDuring installation, make sure to select the option to add QEMU to your system PATH.');
                rl.close();
            }
        });
    }
}

// Prompt for a custom QEMU path
function promptForCustomPath() {
    rl.question('\nEnter the full path to your QEMU installation directory: ', async (qemuPath) => {
        if (!fs.existsSync(qemuPath)) {
            console.log(`❌ Directory does not exist: ${qemuPath}`);
            promptForCustomPath();
            return;
        }
        
        const qemuImg = path.join(qemuPath, 'qemu-img.exe');
        
        if (!fs.existsSync(qemuImg)) {
            console.log(`❌ QEMU not found at: ${qemuPath}`);
            console.log(`Could not find ${qemuImg}`);
            promptForCustomPath();
            return;
        }
        
        const testResult = await testQemuImg(qemuPath);
        
        if (testResult.success) {
            console.log(`✅ QEMU found at ${qemuPath}: ${testResult.version}`);
            saveQemuPath(qemuPath);
        } else {
            console.log(`⚠️ Found QEMU at ${qemuPath}, but execution failed.`);
            console.log('Error:', testResult.error);
            console.log('Please check your QEMU installation.');
            promptForCustomPath();
            return;
        }
        
        rl.close();
    });
}

// Run the main function
main();

// Add handler for readline close event
rl.on('close', () => {
    console.log('\nQEMU path configuration complete.');
    console.log('You can now start the server with: node start.js');
    process.exit(0);
});
