import React, { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFontStore } from '../stores/fontStore';
import { useDeviceStore } from '../stores/deviceStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';

const FontCard = ({ font, onDownload, isDownloading, index }) => {
  // Calculate stagger class (cycles through 1-10)
  const staggerClass = `stagger-${(index % 10) + 1}`;

  return (
    <div className={`bg-white rounded-lg border border-neutral-200 p-3 card-hover animate-fade-in-up ${staggerClass}`}>
      <div className="flex justify-between items-start gap-2 mb-1">
        <h3 className="font-semibold text-sm text-black truncate flex-1" title={font.font_name}>
          {font.font_name}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${font.isSyncedToDevice ? 'bg-blue-500' : 'bg-neutral-300'}`}
            title={font.isSyncedToDevice ? 'Synced' : 'Not synced'}
          />
          {!font.isSyncedToDevice && (
            <button
              onClick={() => onDownload(font)}
              disabled={isDownloading}
              className="px-2 py-0.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-semibold rounded btn-press btn-download transition-colors"
              title={font.storage_path ? 'Download' : 'Unavailable'}
            >
              {isDownloading ? '...' : font.storage_path ? '↓' : '!'}
            </button>
          )}
        </div>
      </div>

      {/* Font preview - uses the actual font, no font classes */}
      <p
        className="text-lg text-neutral-700 truncate mb-2"
        style={{ fontFamily: `"${font.font_family || font.font_name}", sans-serif` }}
        title="The quick brown fox jumps over the lazy dog"
      >
        The quick brown fox jumps
      </p>

      <div className="flex items-center gap-2 text-xs text-neutral-500 font-serif">
        <span className="bg-neutral-100 px-1.5 py-0.5 rounded font-sans font-medium">{font.font_format}</span>
        <span>{(font.file_size / 1024).toFixed(0)}KB</span>
      </div>
    </div>
  );
};

const UploadZone = ({ onUpload }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'font/ttf': ['.ttf'],
      'font/otf': ['.otf'],
      'font/woff': ['.woff'],
      'font/woff2': ['.woff2'],
    },
    onDrop: onUpload,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-black bg-neutral-50' : 'border-neutral-300 hover:border-black'}`}
    >
      <input {...getInputProps()} />
      <p className="text-xs text-neutral-500 font-medium">
        {isDragActive ? 'Drop fonts here...' : 'Drop fonts or tap to browse'}
      </p>
    </div>
  );
};

export default function Dashboard() {
  const {
    fonts,
    loading,
    fetchFonts,
    uploadFont,
    getFilteredFonts,
    bulkRegisterFonts,
    performSync,
    updateSyncStats,
    syncStats,
    lastSync,
    syncing,
    searchQuery,
    setSearchQuery,
    syncFilter,
    setSyncFilter,
    downloadSingleFont,
    downloadingFontId,
    startOperation,
    updateOperationProgress,
    endOperation
  } = useFontStore();
  const { currentDevice, registerDevice } = useDeviceStore();
  const { addNotification } = useNotificationStore();
  const { user } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      await registerCurrentDevice();
      await fetchFonts();
    };
    initializeApp();
  }, []);

  useEffect(() => {
    if (window.electronAPI?.onUploadProgress) {
      window.electronAPI.onUploadProgress((data) => {
        updateOperationProgress(data.current, data.fontName);
      });
    }
  }, [updateOperationProgress]);

  const registerCurrentDevice = async () => {
    if (window.electronAPI) {
      const deviceInfo = await window.electronAPI.getDeviceInfo();

      const result = await registerDevice({
        deviceName: deviceInfo.deviceName,
        deviceId: deviceInfo.deviceId,
        osType: deviceInfo.osType,
        osVersion: deviceInfo.osVersion,
      });

      if (!result.success) {
        console.error('Device registration failed:', result.error);
        addNotification({
          type: 'error',
          message: `Device registration failed: ${result.error}`,
          duration: 5000,
        });
        return result;
      }

      // Only auto-sync on truly new devices, not every launch
      // This prevents re-downloading when device ID accidentally changes
      if (result.isNewDevice && result.device.sync_enabled) {
        const syncResult = await performSync(result.device.id);
        if (syncResult.success && syncResult.downloaded > 0) {
          addNotification({
            type: 'success',
            message: `Auto-synced ${syncResult.downloaded} fonts to new device`,
            duration: 4000,
          });
        }
      }

      return result;
    }
    return null;
  };

  const handleScanFonts = async () => {
    if (!window.electronAPI) {
      addNotification({
        type: 'warning',
        message: 'Font scanning only available in desktop app',
      });
      return;
    }

    setScanning(true);
    try {
      startOperation('scanning', 0, 'Finding fonts...');

      const directories = await window.electronAPI.getSystemFontDirectories();
      const result = await window.electronAPI.scanFonts(directories);

      if (result.success && result.fonts.length > 0) {
        const deviceInfo = await window.electronAPI.getDeviceInfo();
        const deviceResult = await registerDevice({
          deviceName: deviceInfo.deviceName,
          deviceId: deviceInfo.deviceId,
          osType: deviceInfo.osType,
          osVersion: deviceInfo.osVersion,
        });

        if (deviceResult.success) {
          const fontsToUpload = result.fonts.map(font => ({
            path: font.filePath,
            metadata: {
              fontName: font.fontName,
              fontFamily: font.fontFamily
            }
          }));

          startOperation('uploading', fontsToUpload.length, 'Uploading...');

          let uploadResult = { success: false, uploaded: 0, failed: 0, results: [] };
          try {
            uploadResult = await window.electronAPI.uploadFonts(fontsToUpload, user?.id);
          } catch (uploadError) {
            console.warn('Storage upload failed:', uploadError);
          }

          endOperation();

          const fontsWithStorage = result.fonts.map(font => {
            const uploadedFont = uploadResult.results?.find(r => r.fontPath === font.filePath && r.success);
            return {
              ...font,
              storagePath: uploadedFont?.storagePath || null
            };
          });

          const bulkResult = await bulkRegisterFonts(fontsWithStorage, deviceResult.device.id);

          if (bulkResult.success) {
            const device = deviceResult.device;
            const shouldAutoSync = device.sync_enabled !== false;

            let syncMessage = '';
            if (shouldAutoSync) {
              const syncResult = await performSync(device.id);
              if (syncResult.success) {
                syncMessage = ` | Synced: ${syncResult.downloaded}`;
              }
            }

            addNotification({
              type: 'success',
              message: `Found ${result.fonts.length} | New: ${bulkResult.data.registered}${syncMessage}`,
              duration: 5000,
            });
            await fetchFonts();
          } else {
            addNotification({
              type: 'error',
              message: `Error: ${bulkResult.error}`,
            });
          }
        }
      } else {
        endOperation();
        addNotification({
          type: 'info',
          message: 'No fonts found',
        });
      }
    } catch (error) {
      endOperation();
      addNotification({
        type: 'error',
        message: `Error: ${error.message}`,
      });
    }
    setScanning(false);
  };

  const handleUpload = async (files) => {
    setUploading(true);
    let successCount = 0;
    let errorMessages = [];

    for (const file of files) {
      const result = await uploadFont(file);
      if (result.success) {
        successCount++;
      } else {
        errorMessages.push(`${file.name}: ${result.error}`);
      }
    }

    // Refresh fonts list once after all uploads complete
    if (successCount > 0) {
      await fetchFonts();
    }

    setUploading(false);

    if (successCount > 0) {
      addNotification({
        type: 'success',
        message: `Uploaded ${successCount} font${successCount !== 1 ? 's' : ''} - tap Sync to install`,
        duration: 4000,
      });
    }
    if (errorMessages.length > 0) {
      addNotification({
        type: 'error',
        message: errorMessages.slice(0, 3).join(', ') + (errorMessages.length > 3 ? '...' : ''),
        duration: 5000,
      });
    }
  };

  const handleSync = async () => {
    if (!currentDevice) {
      const registerResult = await registerCurrentDevice();
      if (!registerResult) {
        addNotification({
          type: 'error',
          message: 'Unable to register device',
        });
        return;
      }
    }

    const deviceToUse = currentDevice || (await registerCurrentDevice());
    if (!deviceToUse) {
      addNotification({
        type: 'warning',
        message: 'Please wait for device registration',
      });
      return;
    }

    const result = await performSync(deviceToUse.id || deviceToUse.device?.id);

    if (result.success) {
      addNotification({
        type: 'success',
        message: `Downloaded: ${result.downloaded} | Skipped: ${result.skipped}`,
        duration: 4000,
      });
    } else {
      addNotification({
        type: 'error',
        message: `Sync failed: ${result.error}`,
      });
    }
  };

  const handleDownload = async (font) => {
    const result = await downloadSingleFont(font);

    if (result.success) {
      addNotification({
        type: 'success',
        message: result.message,
      });
    } else {
      addNotification({
        type: 'error',
        message: result.error,
      });
    }
  };

  const filteredFonts = React.useMemo(() => {
    let filtered = fonts;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(font =>
        font.font_name?.toLowerCase().includes(query) ||
        font.font_family?.toLowerCase().includes(query)
      );
    }

    if (syncFilter === 'synced') {
      filtered = filtered.filter(font => font.isSyncedToDevice);
    } else if (syncFilter === 'unsynced') {
      filtered = filtered.filter(font => !font.isSyncedToDevice);
    }

    return filtered;
  }, [fonts, searchQuery, syncFilter]);

  const syncedCount = fonts.filter(f => f.isSyncedToDevice).length;
  const unsyncedCount = fonts.length - syncedCount;

  return (
    <div className="p-3">
      {/* Action buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex-1 btn-secondary btn-press disabled:opacity-50 text-sm py-2"
        >
          {syncing ? 'Syncing...' : `Sync${syncStats?.onlyCloud > 0 ? ` (${syncStats.onlyCloud})` : ''}`}
        </button>
        <button
          onClick={handleScanFonts}
          disabled={scanning || syncing}
          className="flex-1 btn-primary btn-press disabled:opacity-50 text-sm py-2"
        >
          {scanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {/* Upload zone - always visible */}
      <div className="mb-3">
        <UploadZone onUpload={handleUpload} />
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search fonts..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none mb-3"
      />

      {/* Filter tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg mb-3">
        <button
          onClick={() => setSyncFilter('all')}
          className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            syncFilter === 'all'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-600'
          }`}
        >
          All ({fonts.length})
        </button>
        <button
          onClick={() => setSyncFilter('synced')}
          className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            syncFilter === 'synced'
              ? 'bg-black text-white shadow-sm'
              : 'text-neutral-600'
          }`}
        >
          Synced ({syncedCount})
        </button>
        <button
          onClick={() => setSyncFilter('unsynced')}
          className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            syncFilter === 'unsynced'
              ? 'bg-white text-black shadow-sm border border-black'
              : 'text-neutral-600'
          }`}
        >
          Unsynced ({unsyncedCount})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`bg-white rounded-lg border border-neutral-200 p-3 animate-fade-in-up stagger-${i + 1}`}>
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="skeleton h-4 w-32"></div>
                <div className="skeleton h-2 w-2 rounded-full"></div>
              </div>
              <div className="skeleton h-6 w-48 mb-2"></div>
              <div className="flex gap-2">
                <div className="skeleton h-4 w-10"></div>
                <div className="skeleton h-4 w-12"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className="text-xs text-neutral-500 mb-2 font-serif">
            {filteredFonts.length} font{filteredFonts.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>

          <div className="grid grid-cols-1 gap-2">
            {filteredFonts.map((font, index) => (
              <FontCard
                key={font.id}
                font={font}
                onDownload={handleDownload}
                isDownloading={downloadingFontId === font.id}
                index={index}
              />
            ))}
          </div>

          {filteredFonts.length === 0 && fonts.length > 0 && (
            <div className="text-center py-8">
              <p className="text-neutral-500 text-sm font-serif">No fonts match filter</p>
            </div>
          )}

          {fonts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-neutral-500 text-sm font-serif">No fonts yet. Scan or drop fonts above.</p>
            </div>
          )}
        </>
      )}

      {uploading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg border border-neutral-200">
            <p className="text-sm text-black font-medium">Uploading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
