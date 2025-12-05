import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { useDeviceStore } from './deviceStore';
import { useAuthStore } from './authStore';

// Helper: Run tasks with concurrency limit
const runWithConcurrency = async (tasks, limit, onProgress) => {
  const results = [];
  let index = 0;
  let completed = 0;

  const runNext = async () => {
    if (index >= tasks.length) return;
    const currentIndex = index++;
    try {
      results[currentIndex] = await tasks[currentIndex]();
    } catch (error) {
      results[currentIndex] = { success: false, error: error.message };
    }
    completed++;
    if (onProgress) onProgress(completed, tasks.length);
    await runNext();
  };

  // Start up to `limit` concurrent workers
  const workers = Array(Math.min(limit, tasks.length)).fill(null).map(() => runNext());
  await Promise.all(workers);
  return results;
};

// Helper: Retry with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
};

export const useFontStore = create((set, get) => ({
  fonts: [],
  loading: false,
  scanning: false,
  scanProgress: 0,
  filter: 'all',
  syncFilter: 'all', // 'all', 'synced', 'unsynced'
  searchQuery: '',
  syncing: false,
  syncLock: false, // Prevent concurrent sync operations
  downloadingFontId: null, // Track individual font downloads
  syncStats: null,
  lastSync: null,
  deviceFontIds: new Set(), // Track which fonts are on current device

  // Progress tracking for operations
  operationProgress: {
    active: false,
    type: null, // 'scanning' | 'uploading' | 'downloading'
    current: 0,
    total: 0,
    currentFontName: '',
    message: ''
  },

  setOperationProgress: (progress) => set({
    operationProgress: { ...get().operationProgress, ...progress }
  }),

  startOperation: (type, total = 0, message = '') => set({
    operationProgress: {
      active: true,
      type,
      current: 0,
      total,
      currentFontName: '',
      message
    }
  }),

  updateOperationProgress: (current, currentFontName = '', message = '') => set({
    operationProgress: {
      ...get().operationProgress,
      current,
      currentFontName,
      message: message || get().operationProgress.message
    }
  }),

  endOperation: () => set({
    operationProgress: {
      active: false,
      type: null,
      current: 0,
      total: 0,
      currentFontName: '',
      message: ''
    }
  }),

  fetchFonts: async () => {
    set({ loading: true });

    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ fonts: [], loading: false, deviceFontIds: new Set() });
        return;
      }

      const { currentDevice } = useDeviceStore.getState();

      // Fetch all fonts with pagination to handle large collections
      let allFonts = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data: fontPage, error } = await supabase
          .from('fonts')
          .select(`
            *,
            devices!origin_device_id (device_name)
          `)
          .eq('user_id', user.id)
          .order('uploaded_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (!fontPage || fontPage.length === 0) break;

        allFonts = allFonts.concat(fontPage);
        if (fontPage.length < pageSize) break;
        page++;
      }

      // Fetch device fonts to know which are synced to current device (also paginated)
      let deviceFontIdSet = new Set();
      if (currentDevice) {
        let allDeviceFonts = [];
        page = 0;
        while (true) {
          const { data: deviceFontPage } = await supabase
            .from('device_fonts')
            .select('font_id')
            .eq('device_id', currentDevice.id)
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (!deviceFontPage || deviceFontPage.length === 0) break;
          allDeviceFonts = allDeviceFonts.concat(deviceFontPage);
          if (deviceFontPage.length < pageSize) break;
          page++;
        }

        deviceFontIdSet = new Set(allDeviceFonts.map(df => df.font_id));
      }

      // Transform to include origin_device_name and sync status
      const transformedFonts = allFonts.map(font => ({
        ...font,
        origin_device_name: font.devices?.device_name || null,
        isSyncedToDevice: deviceFontIdSet.has(font.id)
      }));

      set({ fonts: transformedFonts, loading: false, deviceFontIds: deviceFontIdSet });

      // Auto-update sync stats after fetching fonts
      await get().updateSyncStats();
    } catch (error) {
      set({ loading: false });
    }
  },

  bulkRegisterFonts: async (fonts, deviceId) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return { success: false, error: 'Not authenticated' };

      const registered = [];
      const duplicates = [];
      const storageUpdatedFontIds = []; // Track fonts that can now be synced
      let storageUpdated = 0;

      for (const fontData of fonts) {
        // Check if font already exists (use maybeSingle to avoid 406 error when not found)
        const { data: existing } = await supabase
          .from('fonts')
          .select('id')
          .eq('file_hash', fontData.fileHash)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          duplicates.push({ fontName: fontData.fontName, fontId: existing.id });

          // If we have a storage_path now but the existing font doesn't, update it
          // This fixes fonts that were registered before storage upload was working
          if (fontData.storagePath) {
            const { data: existingFont } = await supabase
              .from('fonts')
              .select('storage_path')
              .eq('id', existing.id)
              .single();

            if (!existingFont?.storage_path) {
              await supabase
                .from('fonts')
                .update({ storage_path: fontData.storagePath })
                .eq('id', existing.id);
              storageUpdated++;
              storageUpdatedFontIds.push(existing.id);
            }
          }

          // Associate with device
          if (deviceId) {
            await supabase
              .from('device_fonts')
              .upsert({
                device_id: deviceId,
                font_id: existing.id,
                was_present_at_scan: true,
                is_system_font: true
              }, { onConflict: 'device_id,font_id' });
          }
        } else {
          // Insert new font
          const { data: newFont, error } = await supabase
            .from('fonts')
            .insert({
              user_id: user.id,
              font_name: fontData.fontName,
              font_family: fontData.fontFamily || '',
              storage_path: fontData.storagePath || null,
              file_size: fontData.fileSize,
              file_hash: fontData.fileHash,
              font_format: fontData.fontFormat,
              origin_device_id: deviceId || null,
              metadata: fontData.metadata || {}
            })
            .select()
            .single();

          if (!error && newFont) {
            registered.push(newFont);

            // Associate with device
            if (deviceId) {
              await supabase
                .from('device_fonts')
                .upsert({
                  device_id: deviceId,
                  font_id: newFont.id,
                  was_present_at_scan: true,
                  is_system_font: true
                }, { onConflict: 'device_id,font_id' });
            }
          }
        }
      }

      // Queue sync to other devices for new fonts
      if (deviceId && registered.length > 0) {
        const { data: otherDevices } = await supabase
          .from('devices')
          .select('id')
          .eq('user_id', user.id)
          .neq('id', deviceId)
          .eq('is_active', true);

        if (otherDevices) {
          for (const font of registered) {
            for (const device of otherDevices) {
              await supabase
                .from('sync_queue')
                .insert({
                  device_id: device.id,
                  font_id: font.id,
                  action: 'install',
                  status: 'pending'
                });
            }
          }
        }
      }

      // Queue sync for fonts that just got their storage_path updated
      // (they can now be synced to other devices)
      if (deviceId && storageUpdatedFontIds.length > 0) {
        const { data: otherDevices } = await supabase
          .from('devices')
          .select('id')
          .eq('user_id', user.id)
          .neq('id', deviceId)
          .eq('is_active', true);

        if (otherDevices) {
          for (const fontId of storageUpdatedFontIds) {
            for (const device of otherDevices) {
              // Check if this device already has this font
              const { data: hasFont } = await supabase
                .from('device_fonts')
                .select('id')
                .eq('device_id', device.id)
                .eq('font_id', fontId)
                .maybeSingle();

              // Only queue if device doesn't have the font
              if (!hasFont) {
                // Check if already in queue
                const { data: inQueue } = await supabase
                  .from('sync_queue')
                  .select('id')
                  .eq('device_id', device.id)
                  .eq('font_id', fontId)
                  .eq('status', 'pending')
                  .maybeSingle();

                if (!inQueue) {
                  await supabase
                    .from('sync_queue')
                    .insert({
                      device_id: device.id,
                      font_id: fontId,
                      action: 'install',
                      status: 'pending'
                    });
                }
              }
            }
          }
        }
      }

      await get().fetchFonts();
      return {
        success: true,
        data: {
          registered: registered.length,
          duplicates: duplicates.length,
          storageUpdated,
          total: fonts.length
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Upload a single font file (for drag-drop in browser)
  uploadFont: async (file) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return { success: false, error: 'Not authenticated' };

      const { currentDevice } = useDeviceStore.getState();

      // Validate file type
      const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
      const fileName = file.name.toLowerCase();
      const extension = fileName.substring(fileName.lastIndexOf('.'));
      if (!validExtensions.includes(extension)) {
        return { success: false, error: 'Invalid font format. Use TTF, OTF, WOFF, or WOFF2.' };
      }

      // Calculate file hash
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Check for duplicate
      const { data: existing } = await supabase
        .from('fonts')
        .select('id')
        .eq('file_hash', fileHash)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        return { success: false, error: 'Font already exists in your library' };
      }

      // Upload to storage
      const storagePath = `${user.id}/${fileHash}${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('fonts')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) {
        return { success: false, error: 'Failed to upload font file' };
      }

      // Extract font name from filename (remove extension)
      const fontName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const fontFormat = extension.substring(1).toUpperCase();

      // Register in database
      const { data: newFont, error: dbError } = await supabase
        .from('fonts')
        .insert({
          user_id: user.id,
          font_name: fontName,
          font_family: fontName,
          storage_path: storagePath,
          file_size: file.size,
          file_hash: fileHash,
          font_format: fontFormat,
          origin_device_id: currentDevice?.id || null,
          metadata: {}
        })
        .select()
        .single();

      if (dbError) {
        // Clean up storage on db error
        await supabase.storage.from('fonts').remove([storagePath]);
        return { success: false, error: dbError.message };
      }

      // Don't mark as synced to device - the font was uploaded but not installed locally
      // User needs to sync to actually install it to their system fonts

      // Return without fetching all fonts - caller can batch this
      return { success: true, font: newFont };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteFont: async (fontId) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return { success: false, error: 'Not authenticated' };

      // Get font to check storage path
      const { data: font } = await supabase
        .from('fonts')
        .select('storage_path')
        .eq('id', fontId)
        .eq('user_id', user.id)
        .single();

      // Delete from storage if exists
      if (font?.storage_path) {
        await supabase.storage.from('fonts').remove([font.storage_path]);
      }

      // Delete from database
      const { error } = await supabase
        .from('fonts')
        .delete()
        .eq('id', fontId)
        .eq('user_id', user.id);

      if (error) throw error;

      await get().fetchFonts();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  setFilter: (filter) => set({ filter }),
  setSyncFilter: (syncFilter) => set({ syncFilter }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  getFilteredFonts: () => {
    const { fonts, filter, searchQuery, syncFilter } = get();

    let filtered = fonts;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(font =>
        font.font_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        font.font_family?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sync status filter
    if (syncFilter === 'synced') {
      filtered = filtered.filter(font => font.isSyncedToDevice);
    } else if (syncFilter === 'unsynced') {
      filtered = filtered.filter(font => !font.isSyncedToDevice);
    }

    return filtered;
  },

  // Download and install a single font
  downloadSingleFont: async (font) => {
    const { currentDevice } = useDeviceStore.getState();

    if (!currentDevice) {
      return { success: false, error: 'No device registered' };
    }

    if (!window.electronAPI || !window.electronAPI.downloadAndInstallFont) {
      return { success: false, error: 'Download only available in desktop app' };
    }

    if (!font.storage_path) {
      return { success: false, error: 'Font not uploaded to cloud. Re-scan on source device.' };
    }

    set({ downloadingFontId: font.id });

    try {
      // Get signed URL for download
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('fonts')
        .createSignedUrl(font.storage_path, 3600);

      if (urlError || !signedUrl?.signedUrl) {
        set({ downloadingFontId: null });
        return { success: false, error: 'Failed to get download URL' };
      }

      // Build filename with extension from font_format
      const ext = font.font_format ? `.${font.font_format.toLowerCase()}` : '.ttf';
      const fileName = font.font_name.endsWith(ext) ? font.font_name : `${font.font_name}${ext}`;

      const result = await window.electronAPI.downloadAndInstallFont({
        fontId: font.id,
        fontName: fileName,
        downloadUrl: signedUrl.signedUrl
      });

      if (result.success) {
        // Mark as installed on this device
        await supabase
          .from('device_fonts')
          .upsert({
            device_id: currentDevice.id,
            font_id: font.id,
            was_present_at_scan: false,
            is_system_font: false,
            installation_status: 'installed'
          }, { onConflict: 'device_id,font_id' });

        // Mark sync_queue entry as completed if exists
        await supabase
          .from('sync_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('device_id', currentDevice.id)
          .eq('font_id', font.id)
          .eq('status', 'pending');

        // Refresh fonts and stats
        await get().fetchFonts();

        set({ downloadingFontId: null });
        return {
          success: true,
          alreadyExists: result.alreadyExists,
          message: result.alreadyExists ? 'Font already installed' : 'Font downloaded and installed'
        };
      } else {
        set({ downloadingFontId: null });
        return { success: false, error: result.error || 'Failed to install font' };
      }
    } catch (error) {
      set({ downloadingFontId: null });
      return { success: false, error: error.message };
    }
  },

  // Sync methods
  performSync: async (deviceId) => {
    // Sync guard - prevent concurrent sync operations
    if (get().syncLock) {
      return { success: false, error: 'Sync already in progress' };
    }

    set({ syncing: true, syncLock: true });

    // Use try-finally to ALWAYS release the lock, preventing deadlocks
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Efficiently get only fonts NOT on this device using a left join approach
      // First, get the IDs of fonts already on this device
      let deviceFontIds = new Set();
      let page = 0;
      const pageSize = 1000;

      while (true) {
        const { data: deviceFontPage, error: dfError } = await supabase
          .from('device_fonts')
          .select('font_id')
          .eq('device_id', deviceId)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (dfError) {
          console.error('Error fetching device fonts:', dfError);
          break;
        }

        if (!deviceFontPage || deviceFontPage.length === 0) break;
        deviceFontPage.forEach(df => deviceFontIds.add(df.font_id));

        if (deviceFontPage.length < pageSize) break;
        page++;
      }

      // Now fetch only fonts that need syncing (with storage_path, not on device)
      // Fetch in pages and filter out ones already on device
      let fontsToSync = [];
      page = 0;

      while (true) {
        const { data: fontPage, error: fontError } = await supabase
          .from('fonts')
          .select('*')
          .eq('user_id', user.id)
          .not('storage_path', 'is', null)  // Only fonts that can be synced
          .order('uploaded_at', { ascending: false })  // Newest first
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (fontError) {
          console.error('Error fetching fonts:', fontError);
          break;
        }

        if (!fontPage || fontPage.length === 0) break;

        // Filter to only fonts not on this device
        const newFonts = fontPage.filter(f => !deviceFontIds.has(f.id));
        fontsToSync = fontsToSync.concat(newFonts);

        // If we've found fonts to sync and this page had no new ones,
        // we can stop early (since we're ordering by newest first)
        if (newFonts.length === 0 && fontsToSync.length > 0) {
          // Continue checking a few more pages in case of gaps
          page++;
          if (page > 3) break;  // Check up to 3 more pages
          continue;
        }

        if (fontPage.length < pageSize) break;
        page++;
      }

      // Download and install fonts
      let downloadedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      // If no fonts to sync, we're done
      if (fontsToSync.length === 0) {
        set({ lastSync: new Date().toISOString() });
        return { success: true, downloaded: 0, skipped: 0, failed: 0, message: 'All fonts already synced!' };
      }

      // Check if we're in Electron environment
      if (!window.electronAPI || !window.electronAPI.downloadAndInstallFont) {
        return { success: false, error: 'Download only available in desktop app' };
      }

      // Smart pre-check: determine which fonts are already installed locally
      // This saves bandwidth by skipping downloads for fonts that exist on disk
      get().startOperation('downloading', fontsToSync.length, 'Checking local fonts...');

      const fontFileNames = fontsToSync.map(font => {
        const ext = font.font_format ? `.${font.font_format.toLowerCase()}` : '.ttf';
        return font.font_name.endsWith(ext) ? font.font_name : `${font.font_name}${ext}`;
      });

      let locallyInstalled = {};
      if (window.electronAPI.checkInstalledFonts) {
        const checkResult = await window.electronAPI.checkInstalledFonts(fontFileNames);
        if (checkResult.success) {
          locallyInstalled = checkResult.installed;
        }
      }

      // Separate fonts into those needing download vs already installed
      const fontsNeedingDownload = [];
      const fontsAlreadyInstalled = [];

      fontsToSync.forEach((font, index) => {
        const fileName = fontFileNames[index];
        if (locallyInstalled[fileName]) {
          fontsAlreadyInstalled.push({ font, fileName });
        } else {
          fontsNeedingDownload.push({ font, fileName });
        }
      });

      // Mark already-installed fonts as synced in database (no download needed)
      for (const { font } of fontsAlreadyInstalled) {
        await supabase
          .from('device_fonts')
          .upsert({
            device_id: deviceId,
            font_id: font.id,
            was_present_at_scan: false,
            is_system_font: false,
            installation_status: 'installed'
          }, { onConflict: 'device_id,font_id' });
        skippedCount++;
      }

      // If all fonts are already installed, we're done
      if (fontsNeedingDownload.length === 0) {
        get().endOperation();
        set({ lastSync: new Date().toISOString() });
        await get().fetchFonts();
        return {
          success: true,
          downloaded: 0,
          skipped: skippedCount,
          failed: 0,
          message: `All ${skippedCount} fonts already installed locally!`
        };
      }

      get().setOperationProgress({ message: `Downloading ${fontsNeedingDownload.length} fonts...`, total: fontsNeedingDownload.length });

      // Create download tasks for parallel execution (only for fonts that need downloading)
      const downloadTasks = fontsNeedingDownload.map(({ font, fileName }) => async () => {
        try {
          // Get signed URL with retry
          const signedUrlResult = await retryWithBackoff(async () => {
            const { data, error } = await supabase.storage
              .from('fonts')
              .createSignedUrl(font.storage_path, 3600);
            if (error) throw error;
            return data;
          }, 2, 500);

          if (!signedUrlResult?.signedUrl) {
            return { success: false, font, error: 'No signed URL' };
          }

          // Download and install with retry
          const result = await retryWithBackoff(async () => {
            const res = await window.electronAPI.downloadAndInstallFont({
              fontId: font.id,
              fontName: fileName,
              downloadUrl: signedUrlResult.signedUrl
            });
            if (!res.success && !res.alreadyExists) {
              throw new Error(res.error || 'Download failed');
            }
            return res;
          }, 2, 1000);

          if (result.success) {
            // Mark as installed on this device
            await supabase
              .from('device_fonts')
              .upsert({
                device_id: deviceId,
                font_id: font.id,
                was_present_at_scan: false,
                is_system_font: false,
                installation_status: 'installed'
              }, { onConflict: 'device_id,font_id' });

            // Mark sync_queue entry as completed
            await supabase
              .from('sync_queue')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString()
              })
              .eq('device_id', deviceId)
              .eq('font_id', font.id)
              .eq('status', 'pending');

            return { success: true, font, alreadyExists: result.alreadyExists };
          }
          return { success: false, font, error: result.error };
        } catch (error) {
          return { success: false, font, error: error.message };
        }
      });

      // Run downloads in parallel with concurrency limit of 5
      const CONCURRENCY_LIMIT = 5;
      const results = await runWithConcurrency(
        downloadTasks,
        CONCURRENCY_LIMIT,
        (completed, total) => {
          get().updateOperationProgress(completed, `${completed}/${total} fonts`);
        }
      );

      // Count results
      for (const result of results) {
        if (result.success) {
          if (result.alreadyExists) {
            skippedCount++;
          } else {
            downloadedCount++;
          }
        } else {
          failedCount++;
        }
      }

      // End operation tracking
      get().endOperation();

      // Update device last sync
      await supabase
        .from('devices')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', deviceId);

      await get().fetchFonts();

      set({ lastSync: new Date().toISOString() });

      let message = `Downloaded ${downloadedCount}`;
      if (skippedCount > 0) {
        message += `, ${skippedCount} existed`;
      }
      if (failedCount > 0) {
        message += `, ${failedCount} failed`;
      }

      return {
        success: true,
        downloaded: downloadedCount,
        skipped: skippedCount,
        failed: failedCount,
        message
      };
    } catch (error) {
      get().endOperation();
      return { success: false, error: error.message };
    } finally {
      // ALWAYS release the lock to prevent deadlocks
      set({ syncing: false, syncLock: false });
    }
  },

  updateSyncStats: async () => {
    try {
      const user = useAuthStore.getState().user;
      const { currentDevice } = useDeviceStore.getState();

      if (!user || !currentDevice) return;

      // Get total fonts count
      const { count: totalFonts } = await supabase
        .from('fonts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get device fonts count
      const { count: deviceFonts } = await supabase
        .from('device_fonts')
        .select('*', { count: 'exact', head: true })
        .eq('device_id', currentDevice.id);

      set({
        syncStats: {
          totalLocal: deviceFonts || 0,
          totalCloud: totalFonts || 0,
          synced: deviceFonts || 0,
          onlyLocal: 0,
          onlyCloud: (totalFonts || 0) - (deviceFonts || 0),
          needsSync: (totalFonts || 0) > (deviceFonts || 0)
        }
      });
    } catch (error) {
      // Silently fail - stats are not critical
    }
  },

  getSyncStatus: () => {
    const { syncStats, lastSync } = get();
    return {
      stats: syncStats,
      lastSync,
      needsSync: syncStats?.needsSync || false,
    };
  },
}));
