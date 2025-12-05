const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scanFonts: (directories) => ipcRenderer.invoke('scan-fonts', directories),

  getSystemFontDirectories: () => ipcRenderer.invoke('get-system-font-directories'),

  calculateFileHash: (filePath) => ipcRenderer.invoke('calculate-file-hash', filePath),

  startFileWatcher: (directories) => ipcRenderer.invoke('start-file-watcher', directories),

  stopFileWatcher: () => ipcRenderer.invoke('stop-file-watcher'),

  getDeviceInfo: () => ipcRenderer.invoke('get-device-info'),

  // Font upload and download (Supabase Storage)
  uploadFonts: (fonts, userId) => ipcRenderer.invoke('upload-fonts', { fonts, userId }),

  downloadAndInstallFont: (params) => ipcRenderer.invoke('download-and-install-font', params),

  isFontInstalled: (fontName) => ipcRenderer.invoke('is-font-installed', fontName),

  // Batch check which fonts are already installed locally
  checkInstalledFonts: (fontNames) => ipcRenderer.invoke('check-installed-fonts', fontNames),

  getFontInstallDir: () => ipcRenderer.invoke('get-font-install-dir'),

  // Event listeners
  onFontDetected: (callback) => {
    ipcRenderer.on('font-detected', (event, data) => callback(data));
  },

  onScanComplete: (callback) => {
    ipcRenderer.on('scan-complete', (event, data) => callback(data));
  },

  onUploadProgress: (callback) => {
    ipcRenderer.on('upload-progress', (event, data) => callback(data));
  },
});
