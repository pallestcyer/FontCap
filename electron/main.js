const { app, BrowserWindow, ipcMain, Tray, Menu, Notification } = require('electron');
const path = require('path');
const fontScanner = require('./services/fontScanner');
const fileWatcher = require('./services/fileWatcher');

let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/icon.png');
  
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Font Sync Pro', click: () => mainWindow.show() },
    { label: 'Scan for Fonts', click: () => handleScanFonts() },
    { type: 'separator' },
    { label: 'Quit', click: () => {
      app.isQuitting = true;
      app.quit();
    }}
  ]);

  tray.setToolTip('Font Sync Pro');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

ipcMain.handle('scan-fonts', async (event, directories) => {
  try {
    const fonts = await fontScanner.scanDirectories(directories);
    return { success: true, fonts };
  } catch (error) {
    console.error('Font scanning error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-system-font-directories', () => {
  return fontScanner.getSystemFontDirectories();
});

ipcMain.handle('calculate-file-hash', async (event, filePath) => {
  try {
    const hash = await fontScanner.calculateFileHash(filePath);
    return { success: true, hash };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-file-watcher', async (event, directories) => {
  try {
    fileWatcher.watch(directories, (eventType, fontPath, fontData) => {
      mainWindow.webContents.send('font-detected', { eventType, fontPath, fontData });
      
      if (eventType === 'add') {
        new Notification({
          title: 'New Font Detected',
          body: `${fontData.fontName} was added to your system`,
        }).show();
      }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-file-watcher', () => {
  fileWatcher.stop();
  return { success: true };
});

ipcMain.handle('get-device-info', () => {
  const os = require('os');
  return {
    deviceName: os.hostname(),
    osType: os.platform(),
    osVersion: os.release(),
  };
});

async function handleScanFonts() {
  try {
    const directories = fontScanner.getSystemFontDirectories();
    const fonts = await fontScanner.scanDirectories(directories);
    
    new Notification({
      title: 'Font Scan Complete',
      body: `Found ${fonts.length} fonts on your system`,
    }).show();
    
    mainWindow.webContents.send('scan-complete', { fonts });
  } catch (error) {
    console.error('Scan error:', error);
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  fileWatcher.stop();
});
