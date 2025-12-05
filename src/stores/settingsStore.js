import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { useAuthStore } from './authStore';

export const useSettingsStore = create((set, get) => ({
  settings: {
    autoSync: true,
    scanFrequency: 'daily',
    duplicateHandling: 'ask',
  },
  storage: {
    used: 0,
    limit: 5368709120, // 5GB in bytes
    percentage: 0,
  },
  loading: false,
  saving: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ loading: false });
        return;
      }

      // Use maybeSingle() to avoid 406 error when no settings exist for new users
      const { data: settings, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
      }

      if (settings) {
        set({
          settings: {
            autoSync: settings.auto_sync ?? true,
            scanFrequency: settings.scan_frequency ?? 'daily',
            duplicateHandling: settings.duplicate_handling ?? 'ask',
          },
          loading: false,
        });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      set({ loading: false });
    }
  },

  updateSettings: async (newSettings) => {
    set({ saving: true });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ saving: false });
        return { success: false, error: 'Not authenticated' };
      }

      const { data: settings, error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          auto_sync: newSettings.autoSync,
          scan_frequency: newSettings.scanFrequency,
          duplicate_handling: newSettings.duplicateHandling,
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;

      set({
        settings: {
          autoSync: settings.auto_sync,
          scanFrequency: settings.scan_frequency,
          duplicateHandling: settings.duplicate_handling,
        },
        saving: false,
      });

      return { success: true, message: 'Settings saved' };
    } catch (error) {
      set({ saving: false });
      return { success: false, error: error.message || 'Failed to save settings' };
    }
  },

  fetchStorageInfo: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      // Get total size of user's fonts from the fonts table
      const { data: fonts, error } = await supabase
        .from('fonts')
        .select('file_size')
        .eq('user_id', user.id);

      if (error) throw error;

      const usedStorage = (fonts || []).reduce((sum, font) => sum + (font.file_size || 0), 0);
      const storageLimit = 5368709120; // 5GB
      const usedPercentage = (usedStorage / storageLimit) * 100;

      set({
        storage: {
          used: usedStorage,
          limit: storageLimit,
          percentage: usedPercentage,
        },
      });
    } catch (error) {
      console.error('Error fetching storage info:', error);
    }
  },

  setSettings: (settings) => set({ settings }),
}));
