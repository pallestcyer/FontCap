import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { useAuthStore } from './authStore';

// Heartbeat interval - device is considered offline after 2 minutes of no heartbeat
const HEARTBEAT_INTERVAL = 60000; // Send heartbeat every 60 seconds
const OFFLINE_THRESHOLD = 120000; // Consider offline after 2 minutes

export const useDeviceStore = create((set, get) => ({
  devices: [],
  currentDevice: null,
  loading: false,
  heartbeatInterval: null,

  fetchDevices: async () => {
    set({ loading: true });

    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ devices: [], loading: false });
        return;
      }

      const { data: devices, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get font counts for each device and calculate online status
      const now = Date.now();
      const devicesWithStatus = await Promise.all((devices || []).map(async (device) => {
        const { count } = await supabase
          .from('device_fonts')
          .select('*', { count: 'exact', head: true })
          .eq('device_id', device.id);

        // Device is online if last_seen is within threshold
        const lastSeen = device.last_seen ? new Date(device.last_seen).getTime() : 0;
        const isOnline = (now - lastSeen) < OFFLINE_THRESHOLD;

        return {
          ...device,
          fonts_installed_count: count || 0,
          is_active: isOnline
        };
      }));

      set({ devices: devicesWithStatus, loading: false });
    } catch (error) {
      set({ loading: false });
    }
  },

  registerDevice: async (deviceData) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return { success: false, error: 'Not authenticated' };

      const { deviceName, deviceId, osType, osVersion } = deviceData;
      const now = new Date().toISOString();

      // Check if device exists by device_id (globally unique)
      const { data: existingDevices, error: lookupError } = await supabase
        .from('devices')
        .select('*')
        .eq('device_id', deviceId);

      if (lookupError) {
        console.error('Device lookup error:', lookupError);
        return { success: false, error: lookupError.message };
      }

      const existing = existingDevices && existingDevices.length > 0 ? existingDevices[0] : null;

      if (existing) {
        // Update existing device - associate with current user
        const updateData = {
          user_id: user.id,
          device_name: deviceName,
          os_type: osType,
          os_version: osVersion,
          is_active: true,
          last_sync: now
        };

        // Try with last_seen first, fallback without it
        let { data: updated, error } = await supabase
          .from('devices')
          .update({ ...updateData, last_seen: now })
          .eq('device_id', deviceId)
          .select()
          .single();

        // If last_seen column doesn't exist, try without it
        if (error && error.message.includes('last_seen')) {
          const result = await supabase
            .from('devices')
            .update(updateData)
            .eq('device_id', deviceId)
            .select()
            .single();
          updated = result.data;
          error = result.error;
        }

        if (error) {
          console.error('Device update error:', error);
          return { success: false, error: error.message };
        }

        set({ currentDevice: updated });

        // Start heartbeat for this device
        get().startHeartbeat(updated.id);

        return { success: true, device: updated, isNewDevice: false };
      }

      // Register new device
      const insertData = {
        user_id: user.id,
        device_name: deviceName,
        device_id: deviceId,
        os_type: osType,
        os_version: osVersion,
        sync_enabled: true
      };

      // Try with last_seen first, fallback without it
      let { data: newDevice, error } = await supabase
        .from('devices')
        .insert({ ...insertData, last_seen: now })
        .select()
        .single();

      // If last_seen column doesn't exist, try without it
      if (error && error.message.includes('last_seen')) {
        const result = await supabase
          .from('devices')
          .insert(insertData)
          .select()
          .single();
        newDevice = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Device insert error:', error);
        return { success: false, error: error.message };
      }

      set({ currentDevice: newDevice });

      // Start heartbeat for this device
      get().startHeartbeat(newDevice.id);

      return { success: true, device: newDevice, isNewDevice: true };
    } catch (error) {
      console.error('Device registration error:', error);
      return { success: false, error: error.message };
    }
  },

  deleteDevice: async (deviceId) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return { success: false, error: 'Not authenticated' };

      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId)
        .eq('user_id', user.id);

      if (error) throw error;

      // If we deleted the current device, clear it
      const currentDevice = get().currentDevice;
      if (currentDevice?.id === deviceId) {
        set({ currentDevice: null });
      }

      await get().fetchDevices();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  setCurrentDevice: (device) => set({ currentDevice: device }),

  toggleDeviceSync: async (deviceId, syncEnabled) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return { success: false, error: 'Not authenticated' };

      const { data: device, error } = await supabase
        .from('devices')
        .update({ sync_enabled: syncEnabled })
        .eq('id', deviceId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const devices = get().devices;
      const updatedDevices = devices.map(d =>
        d.id === deviceId ? device : d
      );
      set({ devices: updatedDevices });

      // Update current device if it's the one being toggled
      const currentDevice = get().currentDevice;
      if (currentDevice && currentDevice.id === deviceId) {
        set({ currentDevice: device });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Heartbeat system to track online status
  startHeartbeat: (deviceId) => {
    // Clear any existing heartbeat
    get().stopHeartbeat();

    // Send initial heartbeat
    get().sendHeartbeat(deviceId);

    // Set up interval
    const interval = setInterval(() => {
      get().sendHeartbeat(deviceId);
    }, HEARTBEAT_INTERVAL);

    set({ heartbeatInterval: interval });
  },

  stopHeartbeat: () => {
    const interval = get().heartbeatInterval;
    if (interval) {
      clearInterval(interval);
      set({ heartbeatInterval: null });
    }
  },

  sendHeartbeat: async (deviceId) => {
    try {
      const { error } = await supabase
        .from('devices')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', deviceId);

      // If last_seen column doesn't exist, stop the heartbeat
      if (error && error.message.includes('last_seen')) {
        get().stopHeartbeat();
      }
    } catch (error) {
      // Silently fail - heartbeat is non-critical
    }
  },
}));
