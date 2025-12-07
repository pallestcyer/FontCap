import React, { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFontStore } from '../stores/fontStore';
import { useDeviceStore } from '../stores/deviceStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';

const FontCard = ({ font, onDownload, isDownloading, index }) => {
  const staggerClass = `stagger-${(index % 10) + 1}`;

  return (
    <div className={`group card card-hover animate-fade-in-up ${staggerClass} !p-3`}>
      {/* Header with name and actions */}
      <div className="flex justify-between items-center gap-2 mb-1.5">
        <h3 className="font-medium text-sm text-apple-text truncate tracking-tight flex-1" title={font.font_name}>
          {font.font_name}
        </h3>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Download button - visible on hover or when downloading */}
          {!font.isSyncedToDevice && (
            <button
              onClick={() => onDownload(font)}
              disabled={isDownloading}
              className={`flex items-center justify-center w-6 h-6 rounded-md text-accent
                         transition-all duration-200 btn-press btn-download
                         ${isDownloading ? 'opacity-100 bg-accent/10' : 'opacity-0 group-hover:opacity-100 hover:bg-accent/10'}`}
              title={font.storage_path ? 'Download to device' : 'Unavailable'}
            >
              {isDownloading ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : font.storage_path ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-apple-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              )}
            </button>
          )}

          {/* Sync status indicator */}
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              font.isSyncedToDevice ? 'bg-status-success' : 'bg-neutral-300'
            }`}
            title={font.isSyncedToDevice ? 'Synced' : 'Not synced'}
          />
        </div>
      </div>

      {/* Font preview */}
      <p
        className="text-xl text-apple-text truncate leading-snug"
        style={{ fontFamily: `"${font.font_family || font.font_name}", system-ui` }}
        title="The quick brown fox jumps over the lazy dog"
      >
        The quick brown fox jumps
      </p>
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
      className={`upload-zone !p-4 ${isDragActive ? 'active' : ''}`}
    >
      <input {...getInputProps()} />
      <div className="flex items-center justify-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200
                        ${isDragActive ? 'bg-accent/10 text-accent' : 'bg-black/[0.04] text-apple-secondary'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-apple-text font-medium">
            {isDragActive ? 'Drop fonts here' : 'Drop fonts or click to browse'}
          </p>
          <p className="text-xs text-apple-secondary">TTF, OTF, WOFF, WOFF2</p>
        </div>
      </div>
    </div>
  );
};

const SkeletonCard = ({ index }) => (
  <div className={`card !p-3 animate-fade-in-up stagger-${index + 1}`}>
    <div className="flex justify-between items-center gap-2 mb-1.5">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton h-1.5 w-1.5 rounded-full" />
    </div>
    <div className="skeleton h-6 w-48" />
  </div>
);

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

    if (successCount > 0) {
      await fetchFonts();
    }

    setUploading(false);

    if (successCount > 0) {
      addNotification({
        type: 'success',
        message: `Uploaded ${successCount} font${successCount !== 1 ? 's' : ''} — tap Sync to install`,
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

  const filterTabs = [
    { id: 'all', label: 'All', count: fonts.length },
    { id: 'synced', label: 'Synced', count: syncedCount },
    { id: 'unsynced', label: 'Unsynced', count: unsyncedCount },
  ];

  return (
    <div className="p-3">
      {/* Action buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex-1 btn-secondary btn-sm btn-press disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {syncing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>Sync{syncStats?.onlyCloud > 0 ? ` (${syncStats.onlyCloud})` : ''}</span>
            </>
          )}
        </button>
        <button
          onClick={handleScanFonts}
          disabled={scanning || syncing}
          className="flex-1 btn-primary btn-sm btn-press disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {scanning ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <span>Scan Fonts</span>
            </>
          )}
        </button>
      </div>

      {/* Upload zone */}
      <div className="mb-3">
        <UploadZone onUpload={handleUpload} />
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-apple-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search fonts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-11"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-apple-secondary hover:text-apple-text"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter tabs - Segmented control */}
      <div className="segmented-control mb-3">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSyncFilter(tab.id)}
            className={`segmented-control-item ${syncFilter === tab.id ? 'active' : ''}`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-2">
          {[...Array(5)].map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      ) : (
        <>
          {/* Results count */}
          <p className="text-xs text-apple-secondary mb-2">
            {filteredFonts.length} font{filteredFonts.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>

          {/* Font grid */}
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

          {/* Empty states */}
          {filteredFonts.length === 0 && fonts.length > 0 && (
            <div className="text-center py-8">
              <div className="w-10 h-10 rounded-xl bg-black/[0.04] flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-apple-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <p className="text-apple-secondary text-sm">No fonts match your search</p>
            </div>
          )}

          {fonts.length === 0 && (
            <div className="text-center py-8">
              <div className="w-10 h-10 rounded-xl bg-black/[0.04] flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-apple-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <p className="text-apple-text font-medium text-sm mb-0.5">No fonts yet</p>
              <p className="text-apple-secondary text-xs">Scan your system or drop fonts above</p>
            </div>
          )}
        </>
      )}

      {/* Upload overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 animate-slide-up">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-apple-text font-medium">Uploading fonts...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
