/**
 * Font Sync Service
 * Handles synchronization of fonts across devices using localStorage
 * In dev mode, simulates cloud storage with a shared localStorage key per user
 */

const DEV_MODE = true;

class SyncService {
  constructor() {
    this.syncKey = 'fontcap-cloud-storage'; // Simulated cloud storage
    this.lastSyncKey = 'fontcap-last-sync';
  }

  /**
   * Get the user's email to create a unique sync key
   */
  getUserEmail() {
    return 'dev@example.com'; // In dev mode, all devices share the same user
  }

  /**
   * Get cloud storage key for current user
   */
  getCloudKey() {
    return `${this.syncKey}-${this.getUserEmail()}`;
  }

  /**
   * Upload fonts to cloud (localStorage in dev mode)
   */
  uploadToCloud(fonts) {
    const cloudKey = this.getCloudKey();
    const existingCloud = this.getCloudFonts();

    // Merge with existing cloud fonts, avoiding duplicates by hash
    const cloudMap = new Map(existingCloud.map(f => [f.file_hash, f]));

    fonts.forEach(font => {
      if (!cloudMap.has(font.file_hash)) {
        cloudMap.set(font.file_hash, {
          ...font,
          uploaded_to_cloud: new Date().toISOString(),
        });
      }
    });

    const mergedFonts = Array.from(cloudMap.values());
    localStorage.setItem(cloudKey, JSON.stringify(mergedFonts));

    return {
      success: true,
      uploaded: fonts.length,
      total: mergedFonts.length,
    };
  }

  /**
   * Get all fonts from cloud storage
   */
  getCloudFonts() {
    const cloudKey = this.getCloudKey();
    const cloudData = localStorage.getItem(cloudKey);
    return cloudData ? JSON.parse(cloudData) : [];
  }

  /**
   * Download fonts from cloud that are not on current device
   */
  downloadFromCloud(currentDeviceFonts) {
    const cloudFonts = this.getCloudFonts();
    const currentHashes = new Set(currentDeviceFonts.map(f => f.file_hash));

    // Find fonts in cloud that are not on current device
    const fontsToDownload = cloudFonts.filter(f => !currentHashes.has(f.file_hash));

    return {
      success: true,
      fonts: fontsToDownload,
      newFonts: fontsToDownload.length,
    };
  }

  /**
   * Perform full sync: upload local fonts and download missing fonts
   */
  async performSync(currentDeviceFonts, currentDeviceId) {
    try {
      // Upload current device fonts to cloud
      const uploadResult = this.uploadToCloud(currentDeviceFonts);

      // Download fonts from cloud that aren't on this device
      const downloadResult = this.downloadFromCloud(currentDeviceFonts);

      // Mark fonts with sync metadata
      const syncedFonts = downloadResult.fonts.map(font => ({
        ...font,
        id: Date.now() + Math.random(), // New ID for local storage
        synced_from_cloud: true,
        synced_at: new Date().toISOString(),
        available_on_device: false, // Font is in cloud but not installed locally
      }));

      // Update last sync time
      localStorage.setItem(this.lastSyncKey, new Date().toISOString());

      return {
        success: true,
        uploaded: uploadResult.uploaded,
        downloaded: downloadResult.newFonts,
        syncedFonts,
        totalCloudFonts: uploadResult.total,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Sync error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncTime() {
    const lastSync = localStorage.getItem(this.lastSyncKey);
    return lastSync ? new Date(lastSync) : null;
  }

  /**
   * Get sync statistics
   */
  getSyncStats(currentDeviceFonts) {
    const cloudFonts = this.getCloudFonts();
    const currentHashes = new Set(currentDeviceFonts.map(f => f.file_hash));
    const cloudHashes = new Set(cloudFonts.map(f => f.file_hash));

    const onlyLocal = currentDeviceFonts.filter(f => !cloudHashes.has(f.file_hash)).length;
    const onlyCloud = cloudFonts.filter(f => !currentHashes.has(f.file_hash)).length;
    const synced = currentDeviceFonts.filter(f => cloudHashes.has(f.file_hash)).length;

    return {
      totalLocal: currentDeviceFonts.length,
      totalCloud: cloudFonts.length,
      synced,
      onlyLocal,
      onlyCloud,
      needsSync: onlyLocal > 0 || onlyCloud > 0,
    };
  }

  /**
   * Clear all cloud data (for testing)
   */
  clearCloud() {
    const cloudKey = this.getCloudKey();
    localStorage.removeItem(cloudKey);
    localStorage.removeItem(this.lastSyncKey);
  }

  /**
   * Simulate device sync by copying fonts between device storage keys
   */
  simulateDeviceLogin(deviceName) {
    // This simulates logging in on a different device
    // In real implementation, this would be handled by backend
    const currentDeviceFonts = localStorage.getItem('dev-fonts');
    const deviceKey = `dev-fonts-${deviceName}`;

    if (currentDeviceFonts) {
      // Copy current fonts to new device
      localStorage.setItem(deviceKey, currentDeviceFonts);
    }

    return {
      success: true,
      deviceName,
      message: `Simulated login on ${deviceName}`,
    };
  }
}

export default new SyncService();
