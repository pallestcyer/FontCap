import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useNotificationStore } from '../stores/notificationStore';

export default function Settings() {
  const { user } = useAuthStore();
  const { settings, storage, loading, saving, fetchSettings, updateSettings, fetchStorageInfo } = useSettingsStore();
  const { addNotification } = useNotificationStore();

  const [autoSync, setAutoSync] = useState(settings.autoSync);
  const [scanFrequency, setScanFrequency] = useState(settings.scanFrequency);
  const [duplicateHandling, setDuplicateHandling] = useState(settings.duplicateHandling);

  useEffect(() => {
    fetchSettings();
    fetchStorageInfo();
  }, []);

  useEffect(() => {
    setAutoSync(settings.autoSync);
    setScanFrequency(settings.scanFrequency);
    setDuplicateHandling(settings.duplicateHandling);
  }, [settings]);

  const handleSaveSettings = async () => {
    const result = await updateSettings({
      autoSync,
      scanFrequency,
      duplicateHandling,
    });

    if (result.success) {
      addNotification({
        type: 'success',
        message: 'Settings saved!',
        duration: 2000,
      });
    } else {
      addNotification({
        type: 'error',
        message: `Failed: ${result.error}`,
      });
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / 1024 / 1024;
    const gb = bytes / 1024 / 1024 / 1024;
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
  };

  return (
    <div className="p-3">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-black">Settings</h2>
        <p className="text-xs text-neutral-500 font-serif">Configure preferences</p>
      </div>

      <div className="space-y-3">
        {/* Account */}
        <div className="bg-white rounded-lg border border-neutral-200 p-3">
          <h3 className="text-sm font-semibold text-black mb-2">Account</h3>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-600 font-serif"
          />
        </div>

        {/* Sync Settings */}
        <div className="bg-white rounded-lg border border-neutral-200 p-3">
          <h3 className="text-sm font-semibold text-black mb-3">Sync</h3>

          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-black font-medium">Auto-sync</p>
              <p className="text-xs text-neutral-500 font-serif">Sync fonts automatically</p>
            </div>
            <button
              onClick={() => setAutoSync(!autoSync)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                ${autoSync ? 'bg-blue-500' : 'bg-neutral-200'}`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
                  ${autoSync ? 'translate-x-4' : 'translate-x-1'}`}
              />
            </button>
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1 font-serif">Scan frequency</label>
            <select
              value={scanFrequency}
              onChange={(e) => setScanFrequency(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
            >
              <option value="disabled">Disabled</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>

        {/* Duplicate Handling */}
        <div className="bg-white rounded-lg border border-neutral-200 p-3">
          <h3 className="text-sm font-semibold text-black mb-2">Duplicates</h3>
          <select
            value={duplicateHandling}
            onChange={(e) => setDuplicateHandling(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
          >
            <option value="ask">Always ask</option>
            <option value="keep-newest">Keep newest</option>
            <option value="keep-all">Keep all</option>
          </select>
        </div>

        {/* Storage */}
        <div className="bg-white rounded-lg border border-neutral-200 p-3">
          <h3 className="text-sm font-semibold text-black mb-2">Storage</h3>
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-neutral-600 font-serif">Used</span>
            <span className="font-semibold">
              {formatBytes(storage.used)} / {formatBytes(storage.limit)}
            </span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                storage.percentage > 80 ? 'bg-neutral-600' : 'bg-black'
              }`}
              style={{ width: `${Math.min(storage.percentage, 100)}%` }}
            />
          </div>
          {storage.percentage > 80 && (
            <p className="text-xs text-neutral-600 mt-1 font-serif">
              {storage.percentage.toFixed(0)}% used
            </p>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveSettings}
          disabled={saving || loading}
          className="w-full btn-primary text-sm py-2 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
