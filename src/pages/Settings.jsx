import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useNotificationStore } from '../stores/notificationStore';

// iOS-style Toggle Switch component
const ToggleSwitch = ({ enabled, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!enabled)}
    disabled={disabled}
    className={`toggle-switch ${enabled ? 'active' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span className="toggle-switch-knob" />
  </button>
);

// Settings section wrapper
const SettingsSection = ({ title, children }) => (
  <div className="card !p-0 overflow-hidden">
    {title && (
      <div className="px-4 pt-3 pb-1.5">
        <h3 className="text-xs font-semibold text-apple-secondary uppercase tracking-wide">{title}</h3>
      </div>
    )}
    <div className="divide-y divide-black/[0.04]">
      {children}
    </div>
  </div>
);

// Settings row item
const SettingsRow = ({ label, description, children, noPadding = false }) => (
  <div className={`flex items-center justify-between ${noPadding ? '' : 'px-4 py-3'}`}>
    <div className="flex-1 min-w-0 pr-3">
      <p className="text-sm text-apple-text font-medium">{label}</p>
      {description && (
        <p className="text-xs text-apple-secondary mt-0.5">{description}</p>
      )}
    </div>
    <div className="flex-shrink-0">
      {children}
    </div>
  </div>
);

// Custom select dropdown
const SelectDropdown = ({ value, onChange, options, disabled = false }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="appearance-none bg-black/[0.04] text-apple-text text-sm font-medium
                 pl-3 pr-8 py-2 rounded-lg cursor-pointer transition-colors
                 hover:bg-black/[0.06] focus:outline-none focus:ring-2 focus:ring-accent/20
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    <svg
      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-secondary pointer-events-none"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

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
        message: 'Settings saved',
        duration: 2000,
      });
    } else {
      addNotification({
        type: 'error',
        message: `Failed to save: ${result.error}`,
      });
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / 1024 / 1024;
    const gb = bytes / 1024 / 1024 / 1024;
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
  };

  const scanFrequencyOptions = [
    { value: 'disabled', label: 'Disabled' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
  ];

  const duplicateOptions = [
    { value: 'ask', label: 'Always ask' },
    { value: 'keep-newest', label: 'Keep newest' },
    { value: 'keep-all', label: 'Keep all' },
  ];

  return (
    <div className="p-3">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-apple-text tracking-tight">Settings</h1>
        <p className="text-xs text-apple-secondary mt-0.5">Manage your preferences</p>
      </div>

      <div className="space-y-3">
        {/* Account Section */}
        <SettingsSection title="Account">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <span className="text-accent font-semibold text-sm">
                  {user?.email?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-apple-text font-medium truncate">{user?.email || 'Not signed in'}</p>
                <p className="text-xs text-apple-secondary">Signed in</p>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Sync Section */}
        <SettingsSection title="Synchronization">
          <SettingsRow
            label="Auto-sync"
            description="Automatically sync fonts when changes are detected"
          >
            <ToggleSwitch enabled={autoSync} onChange={setAutoSync} />
          </SettingsRow>

          <SettingsRow
            label="Scan frequency"
            description="How often to check for new fonts"
          >
            <SelectDropdown
              value={scanFrequency}
              onChange={setScanFrequency}
              options={scanFrequencyOptions}
            />
          </SettingsRow>
        </SettingsSection>

        {/* Duplicates Section */}
        <SettingsSection title="Duplicate Handling">
          <SettingsRow
            label="When duplicates are found"
            description="Choose how to handle duplicate fonts"
          >
            <SelectDropdown
              value={duplicateHandling}
              onChange={setDuplicateHandling}
              options={duplicateOptions}
            />
          </SettingsRow>
        </SettingsSection>

        {/* Storage Section */}
        <SettingsSection title="Storage">
          <div className="px-4 py-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-apple-text font-medium">Used</span>
              <span className="text-xs font-semibold text-apple-text">
                {formatBytes(storage.used)} / {formatBytes(storage.limit)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(storage.percentage, 100)}%` }}
              />
            </div>

            {storage.percentage > 80 && (
              <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-status-warning/10">
                <svg className="w-3.5 h-3.5 text-status-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-status-warning">
                  {storage.percentage.toFixed(0)}% full
                </p>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* Save Button */}
        <button
          onClick={handleSaveSettings}
          disabled={saving || loading}
          className="w-full action-btn action-btn-primary"
        >
          {saving ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Changes</span>
          )}
        </button>

        {/* Version info */}
        <p className="text-center text-2xs text-apple-tertiary pt-1">
          FontCap v1.2.0
        </p>
      </div>
    </div>
  );
}
