const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scanFonts: (directories) => ipcRenderer.invoke('scan-fonts', directories),

  getSystemFontDirectories: () => ipcRenderer.invoke('get-system-font-directories'),

  calculateFileHash: (filePath) => ipcRenderer.invoke('calculate-file-hash', filePath),

  startFileWatcher: (directories) => ipcRenderer.invoke('start-file-watcher', directories),

  stopFileWatcher: () => ipcRenderer.invoke('stop-file-watcher'),

  getDeviceInfo: () => ipcRenderer.invoke('get-device-info'),

  // Font upload and download (R2 Storage via presigned URLs)
  uploadFonts: (fonts, userId, authToken) => ipcRenderer.invoke('upload-fonts', { fonts, userId, authToken }),

  downloadAndInstallFont: (params) => ipcRenderer.invoke('download-and-install-font', params),

  isFontInstalled: (fontName) => ipcRenderer.invoke('is-font-installed', fontName),

  // Batch check which fonts are already installed locally
  checkInstalledFonts: (fontNames) => ipcRenderer.invoke('check-installed-fonts', fontNames),

  getFontInstallDir: () => ipcRenderer.invoke('get-font-install-dir'),

  // Event listeners (with cleanup support)
  onFontDetected: (callback) => {
    ipcRenderer.removeAllListeners('font-detected');
    ipcRenderer.on('font-detected', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('font-detected');
  },

  onScanComplete: (callback) => {
    ipcRenderer.removeAllListeners('scan-complete');
    ipcRenderer.on('scan-complete', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('scan-complete');
  },

  onUploadProgress: (callback) => {
    ipcRenderer.removeAllListeners('upload-progress');
    ipcRenderer.on('upload-progress', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('upload-progress');
  },

  // Deep link auth callback (email confirmation, magic links, etc.)
  onDeepLinkAuth: (callback) => {
    ipcRenderer.removeAllListeners('deep-link-auth');
    ipcRenderer.on('deep-link-auth', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('deep-link-auth');
  },
});
