const { app, BrowserWindow, ipcMain, Tray, Menu, Notification } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const crypto = require('crypto');
const fontScanner = require('./services/fontScanner');
const fileWatcher = require('./services/fileWatcher');
const fontInstaller = require('./services/fontInstaller');
const FontUploader = require('./services/fontUploader');

const fontUploader = new FontUploader();

// Get or create a stable device ID
// Uses multiple fallback locations to ensure stability across app updates
async function getStableDeviceId() {
  // Primary location: Application Support/FontCap (persists across app updates)
  const primaryDir = path.join(app.getPath('appData'), 'FontCap');
  const primaryFile = path.join(primaryDir, 'device-id.txt');

  // Legacy location: userData/config (for backwards compatibility)
  const legacyDir = path.join(app.getPath('userData'), 'config');
  const legacyFile = path.join(legacyDir, 'device-id.txt');

  // Try to read from primary location first
  try {
    const existingId = await fs.readFile(primaryFile, 'utf-8');
    const id = existingId.trim();
    if (id && id.length > 0) {
      return id;
    }
  } catch (error) {
    // Primary doesn't exist, check legacy
  }

  // Try legacy location
  try {
    const legacyId = await fs.readFile(legacyFile, 'utf-8');
    const id = legacyId.trim();
    if (id && id.length > 0) {
      // Migrate to primary location
      await fs.mkdir(primaryDir, { recursive: true });
      await fs.writeFile(primaryFile, id, 'utf-8');
      return id;
    }
  } catch (error) {
    // Legacy doesn't exist either
  }

  // Generate new ID based on hardware identifiers for better stability
  // Fallback to UUID if hardware info isn't available
  let newId;
  try {
    // Create a hash based on machine-specific info
    const machineInfo = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()[0]?.model || 'unknown'}`;
    newId = crypto.createHash('sha256').update(machineInfo).digest('hex').substring(0, 36);
    // Format as UUID-like string
    newId = `${newId.slice(0,8)}-${newId.slice(8,12)}-${newId.slice(12,16)}-${newId.slice(16,20)}-${newId.slice(20,32)}`;
  } catch (e) {
    newId = crypto.randomUUID();
  }

  // Save to primary location
  await fs.mkdir(primaryDir, { recursive: true });
  await fs.writeFile(primaryFile, newId, 'utf-8');

  return newId;
}

let mainWindow;
let tray;
let deepLinkUrl = null; // Store deep link URL if app wasn't ready

// Register custom protocol for deep linking (fontcap://)
// This allows email confirmation links to open the app directly
const PROTOCOL = 'fontcap';

if (process.defaultApp) {
  // Development: need to pass the script path
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  // Production: just register the protocol
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// Handle deep link URL
function handleDeepLink(url) {
  console.log('Deep link received:', url);

  if (!url || !url.startsWith(`${PROTOCOL}://`)) return;

  // Parse the URL to extract tokens
  // Format: fontcap://auth/callback#access_token=...&refresh_token=...&type=...
  try {
    const urlObj = new URL(url);
    const hash = urlObj.hash.substring(1); // Remove the #
    const params = new URLSearchParams(hash);

    const authData = {
      access_token: params.get('access_token'),
      refresh_token: params.get('refresh_token'),
      type: params.get('type'), // 'signup', 'recovery', 'magiclink'
      expires_in: params.get('expires_in'),
    };

    if (authData.access_token) {
      // If window exists, send the auth data
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('deep-link-auth', authData);
      } else {
        // Store for when window is ready
        deepLinkUrl = authData;
      }
    }
  } catch (error) {
    console.error('Error parsing deep link:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 360,
    minHeight: 500,
    maxWidth: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  // Use app.isPackaged to reliably detect production vs development
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In packaged app, load from dist folder
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading from:', indexPath);
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
    });
  }

  // Add error handling for page load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorCode, errorDescription);
  });

  // Log when page finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading');
  });

  // Log console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('Renderer:', message);
  });

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
  try {
    // Use properly sized tray icons (16x16 for standard, @2x handled automatically)
    const iconPath = app.isPackaged
      ? path.join(__dirname, '../build/trayIcon.png')
      : path.join(__dirname, '../public/trayIcon.png');

    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show FontCap', click: () => mainWindow.show() },
      { label: 'Scan for Fonts', click: () => handleScanFonts() },
      { type: 'separator' },
      { label: 'Quit', click: () => {
        app.isQuitting = true;
        app.quit();
      }}
    ]);

    tray.setToolTip('FontCap');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
  } catch (error) {
    console.log('Tray icon not loaded - continuing without system tray');
  }
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

ipcMain.handle('get-device-info', async () => {
  const stableId = await getStableDeviceId();
  return {
    deviceId: stableId,
    deviceName: os.hostname(),
    osType: os.platform(),
    osVersion: os.release(),
  };
});

// Upload fonts to R2 Storage via presigned URLs
ipcMain.handle('upload-fonts', async (event, { fonts, userId, authToken }) => {
  try {
    if (authToken) {
      fontUploader.setAuthToken(authToken);
    }
    const results = await fontUploader.uploadFonts(fonts, userId, (progress) => {
      mainWindow.webContents.send('upload-progress', progress);
    });
    return { success: true, ...results };
  } catch (error) {
    console.error('Font upload error:', error);
    return { success: false, error: error.message };
  }
});

// Download and install a font from Supabase Storage
ipcMain.handle('download-and-install-font', async (event, { fontId, fontName, downloadUrl }) => {
  try {
    // Create temp directory for download
    const tempDir = path.join(os.tmpdir(), 'fontcap-downloads');
    await fs.mkdir(tempDir, { recursive: true });

    const tempPath = path.join(tempDir, fontName);

    // Download font file from signed URL
    const downloadResult = await fontUploader.downloadFont(downloadUrl, tempPath);

    if (!downloadResult.success) {
      return downloadResult;
    }

    // Install font to system
    const installResult = await fontInstaller.installFont(tempPath, fontName);

    // Clean up temp file
    try {
      await fs.unlink(tempPath);
    } catch (cleanupError) {
      console.warn('Could not clean up temp file:', cleanupError.message);
    }

    if (installResult.success) {
      new Notification({
        title: 'Font Installed',
        body: `${fontName} has been installed successfully`,
      }).show();
    }

    return installResult;
  } catch (error) {
    console.error('Font download and install error:', error);
    return { success: false, error: error.message };
  }
});

// Check if font is installed
ipcMain.handle('is-font-installed', async (event, fontName) => {
  try {
    const isInstalled = await fontInstaller.isInstalled(fontName);
    return { success: true, isInstalled };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Batch check which fonts are already installed locally
ipcMain.handle('check-installed-fonts', async (event, fontNames) => {
  try {
    const results = {};
    for (const fontName of fontNames) {
      results[fontName] = await fontInstaller.isInstalled(fontName);
    }
    return { success: true, installed: results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get font install directory
ipcMain.handle('get-font-install-dir', () => {
  try {
    const installDir = fontInstaller.getInstallDirectory();
    return { success: true, installDir };
  } catch (error) {
    return { success: false, error: error.message };
  }
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

// macOS: Handle deep link when app is already running
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Windows/Linux: Handle deep link via second-instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    // Windows/Linux: deep link URL is in commandLine
    const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (url) handleDeepLink(url);
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Send any stored deep link auth data once window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    if (deepLinkUrl) {
      mainWindow.webContents.send('deep-link-auth', deepLinkUrl);
      deepLinkUrl = null;
    }
  });

  // macOS: Check if app was launched via deep link
  const launchUrl = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
  if (launchUrl) handleDeepLink(launchUrl);

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
