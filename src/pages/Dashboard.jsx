import React, { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFontStore } from '../stores/fontStore';
import { useDeviceStore } from '../stores/deviceStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';

const FontCard = ({ font, onDownload, isDownloading, index }) => {
  const staggerClass = `stagger-${(index % 10) + 1}`;

  // Build tags array for font metadata
  const tags = [];
  if (font.is_variable) tags.push('Variable');
  if (font.category) tags.push(font.category);
  if (font.weight_name && font.weight_name !== 'Regular') tags.push(font.weight_name);
  if (font.is_italic) tags.push('Italic');

  return (
    <div className={`group font-card animate-fade-in-up ${staggerClass}`}>
      {/* Download button - top right corner */}
      {!font.isSyncedToDevice && (
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(font); }}
          disabled={isDownloading}
          className={`absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-lg
                     transition-all duration-200 btn-press z-10
                     ${isDownloading ? 'opacity-100 bg-white/80 text-font-card-hover' : 'opacity-0 group-hover:opacity-100 bg-white/80 hover:bg-white text-apple-secondary hover:text-font-card-hover'}`}
          title={font.storage_path ? 'Download to device' : 'Unavailable'}
        >
          {isDownloading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : font.storage_path ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          )}
        </button>
      )}

      {/* Sync status indicator - top left */}
      <span
        className={`absolute top-2 left-2 w-2 h-2 rounded-full transition-colors duration-300 ${
          font.isSyncedToDevice ? 'bg-status-success' : 'bg-neutral-300'
        }`}
        title={font.isSyncedToDevice ? 'Synced' : 'Not synced'}
      />

      {/* Font preview - Large "Aa" */}
      <div className="flex-1 flex items-center justify-start px-3 pt-4 pb-2">
        <span
          className="text-5xl text-apple-text transition-colors duration-200 group-hover:text-font-card-hover"
          style={{ fontFamily: `"${font.font_family || font.font_name}", system-ui` }}
        >
          Aa
        </span>
      </div>

      {/* Font info - bottom section */}
      <div className="px-3 pb-3">
        {/* Font name */}
        <h3 className="font-medium text-sm text-apple-text truncate tracking-tight text-left mb-1.5" title={font.font_name}>
          {font.font_name}
        </h3>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-start">
            {tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="font-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
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
      className={`upload-zone-minimal ${isDragActive ? 'active' : ''}`}
    >
      <input {...getInputProps()} />
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      <span className="text-sm font-medium">
        {isDragActive ? 'Drop fonts' : 'Add Fonts'}
      </span>
    </div>
  );
};

const SkeletonCard = ({ index }) => (
  <div className={`font-card animate-fade-in-up stagger-${index + 1}`}>
    <div className="flex-1 flex items-center justify-center pt-4 pb-2">
      <div className="skeleton h-12 w-16 rounded-lg" />
    </div>
    <div className="px-3 pb-3">
      <div className="skeleton h-4 w-24 mx-auto mb-1.5" />
      <div className="flex gap-1 justify-center">
        <div className="skeleton h-5 w-14 rounded-full" />
        <div className="skeleton h-5 w-12 rounded-full" />
      </div>
    </div>
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
    setOperationProgress,
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

  // Track upload operation ID to ignore stale progress updates
  const uploadOperationIdRef = React.useRef(null);

  useEffect(() => {
    let cleanup = null;
    let lastUpdate = 0;
    let pendingData = null;
    let rafId = null;

    if (window.electronAPI?.onUploadProgress) {
      cleanup = window.electronAPI.onUploadProgress((data) => {
        // Only process if we have an active upload operation
        if (!uploadOperationIdRef.current) return;

        // Throttle updates to prevent rapid state changes
        const now = Date.now();
        pendingData = data;

        // Update immediately if it's been more than 100ms, otherwise schedule
        if (now - lastUpdate > 100) {
          lastUpdate = now;
          setOperationProgress({
            current: data.current,
            total: data.total,
            currentFontName: data.fontName
          });
        } else if (!rafId) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            if (pendingData && uploadOperationIdRef.current) {
              lastUpdate = Date.now();
              setOperationProgress({
                current: pendingData.current,
                total: pendingData.total,
                currentFontName: pendingData.fontName
              });
            }
          });
        }
      });
    }
    return () => {
      if (cleanup) cleanup();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [setOperationProgress]);

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

          // Start upload operation and track it
          uploadOperationIdRef.current = startOperation('uploading', fontsToUpload.length, 'Uploading...');

          let uploadResult = { success: false, uploaded: 0, failed: 0, results: [] };
          try {
            uploadResult = await window.electronAPI.uploadFonts(fontsToUpload, user?.id);
          } catch (uploadError) {
            console.warn('Storage upload failed:', uploadError);
          }

          // Clear upload tracking and end operation
          uploadOperationIdRef.current = null;
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
          className="flex-1 action-btn action-btn-secondary"
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
          className="flex-1 action-btn action-btn-primary"
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

      {/* Filter tabs - Minimal pill style */}
      <div className="flex items-center gap-1 mb-3">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSyncFilter(tab.id)}
            className={`filter-pill ${syncFilter === tab.id ? 'active' : ''}`}
          >
            {tab.label}
            <span className="filter-pill-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
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

          {/* Font grid - two columns */}
          <div className="grid grid-cols-2 gap-3">
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
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl px-5 py-4 shadow-elevated animate-slide-up
                         border border-black/[0.04] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <svg className="w-4 h-4 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-sm text-apple-text font-medium">Uploading fonts...</p>
          </div>
        </div>
      )}
    </div>
  );
}
