const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess = null;

function startBackend() {
  const backendDir = path.resolve(__dirname, '..', '..', 'backend');
  const serverPy = path.join(backendDir, 'server.py');
  
  // Try python3 first, then python
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  
  try {
    backendProcess = spawn(pythonCmd, [serverPy], { 
      stdio: 'inherit',
      cwd: backendDir 
    });
    console.log('Started Python backend:', serverPy);
    
    backendProcess.on('error', (err) => {
      console.error('Failed to start backend:', err);
    });
    
    backendProcess.on('exit', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });
  } catch (e) {
    console.error('Failed to start backend. Make sure Python is installed.', e);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.resolve(__dirname, '..', '..', 'frontend', 'dist', 'index.html');
    win.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});
