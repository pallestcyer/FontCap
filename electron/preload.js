const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scanFonts: (directories) => ipcRenderer.invoke('scan-fonts', directories),
  
  getSystemFontDirectories: () => ipcRenderer.invoke('get-system-font-directories'),
  
  calculateFileHash: (filePath) => ipcRenderer.invoke('calculate-file-hash', filePath),
  
  startFileWatcher: (directories) => ipcRenderer.invoke('start-file-watcher', directories),
  
  stopFileWatcher: () => ipcRenderer.invoke('stop-file-watcher'),
  
  getDeviceInfo: () => ipcRenderer.invoke('get-device-info'),
  
  onFontDetected: (callback) => {
    ipcRenderer.on('font-detected', (event, data) => callback(data));
  },
  
  onScanComplete: (callback) => {
    ipcRenderer.on('scan-complete', (event, data) => callback(data));
  },
});
