const { app, BrowserWindow } = require('electron');
try {
require('electron-reload')(__dirname);
} catch (e) {
  // electron-reload ist im Build nicht vorhanden – ignorieren
}
const path = require('path');
const remoteMain = require('@electron/remote/main');
remoteMain.initialize();

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'app-icon.svg'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  });
  remoteMain.enable(win.webContents);
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 