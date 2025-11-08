const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendDir = path.resolve(__dirname, '..', '..', 'backend');
const serverPy = path.join(backendDir, 'server.py');
const requirementsTxt = path.join(backendDir, 'requirements.txt');

if (!fs.existsSync(serverPy)) {
  console.error('backend/server.py not found');
  process.exit(1);
}

function checkPython() {
  const pythonCommands = ['python3', 'python'];
  
  for (const cmd of pythonCommands) {
    try {
      const version = execSync(`${cmd} --version`, { encoding: 'utf8' });
      console.log(`Found ${version.trim()}`);
      return cmd;
    } catch (e) {
      // Try next command
    }
  }
  
  return null;
}

console.log('Checking Python installation...');
const pythonCmd = checkPython();

if (!pythonCmd) {
  console.error('Python not found. Please install Python 3.8 or higher.');
  console.error('Download from: https://www.python.org/downloads/');
  process.exit(1);
}

if (fs.existsSync(requirementsTxt)) {
  console.log('Installing Python dependencies...');
  try {
    execSync(`${pythonCmd} -m pip install -r "${requirementsTxt}"`, { 
      stdio: 'inherit',
      cwd: backendDir 
    });
    console.log('✓ Backend dependencies installed');
  } catch (e) {
    console.error('Failed to install Python dependencies.');
    console.error('Try manually running: pip install -r backend/requirements.txt');
    process.exit(1);
  }
} else {
  console.log('✓ Backend ready (no requirements.txt found)');
}
