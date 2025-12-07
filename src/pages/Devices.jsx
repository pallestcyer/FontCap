import React, { useEffect } from 'react';
import { useDeviceStore } from '../stores/deviceStore';

// iOS-style Toggle Switch component
const ToggleSwitch = ({ enabled, onChange, size = 'default' }) => {
  const sizeClasses = size === 'small'
    ? 'h-5 w-9'
    : 'h-6 w-11';
  const knobSizeClasses = size === 'small'
    ? 'h-[18px] w-[18px]'
    : 'h-[22px] w-[22px]';
  const translateClasses = size === 'small'
    ? 'translate-x-[16px]'
    : 'translate-x-[20px]';

  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`toggle-switch ${sizeClasses} ${enabled ? 'active' : ''}`}
    >
      <span
        className={`toggle-switch-knob ${knobSizeClasses} ${enabled ? translateClasses : ''}`}
        style={{ transform: enabled ? `translateX(${size === 'small' ? '16px' : '20px'})` : 'translateX(0)' }}
      />
    </button>
  );
};

const DeviceCard = ({ device, onDelete, onToggleSync, index }) => {
  const lastSync = device.last_sync
    ? new Date(device.last_sync).toLocaleDateString()
    : 'Never';

  const syncEnabled = device.sync_enabled !== false;
  const staggerClass = `stagger-${(index % 10) + 1}`;

  return (
    <div className={`card card-hover animate-fade-in-up ${staggerClass} !p-3`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Device icon */}
          <div className="w-9 h-9 rounded-lg bg-black/[0.04] flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-apple-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm text-apple-text truncate">{device.device_name}</h3>
            <p className="text-xs text-apple-secondary">{device.os_type} {device.os_version}</p>
          </div>
        </div>

        {/* Status badge */}
        <span className={`badge text-2xs ${device.is_active ? 'badge-success' : ''}`}>
          {device.is_active ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-2xs text-apple-secondary">Contributed</p>
          <p className="text-base font-semibold text-apple-text">{device.fonts_contributed_count || 0}</p>
        </div>
        <div>
          <p className="text-2xs text-apple-secondary">Installed</p>
          <p className="text-base font-semibold text-apple-text">{device.fonts_installed_count || 0}</p>
        </div>
        <div>
          <p className="text-2xs text-apple-secondary">Last sync</p>
          <p className="text-xs font-medium text-apple-text">{lastSync}</p>
        </div>
        <div>
          <p className="text-2xs text-apple-secondary mb-0.5">Auto-sync</p>
          <ToggleSwitch
            enabled={syncEnabled}
            onChange={(enabled) => onToggleSync(device.id, enabled)}
            size="small"
          />
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={() => onDelete(device.id)}
        className="w-full py-2 text-xs font-medium text-apple-secondary hover:text-status-error
                   bg-black/[0.02] hover:bg-status-error/10 rounded-lg transition-all duration-200"
      >
        Remove Device
      </button>
    </div>
  );
};

const EmptyState = () => (
  <div className="text-center py-10">
    <div className="w-12 h-12 rounded-xl bg-black/[0.04] flex items-center justify-center mx-auto mb-3">
      <svg className="w-6 h-6 text-apple-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
      </svg>
    </div>
    <h3 className="text-sm font-medium text-apple-text mb-0.5">No devices connected</h3>
    <p className="text-apple-secondary text-xs px-4">
      Devices appear here when you sign in on other computers
    </p>
  </div>
);

const SkeletonCard = ({ index }) => (
  <div className={`card !p-3 animate-fade-in-up stagger-${index + 1}`}>
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2.5">
        <div className="skeleton w-9 h-9 rounded-lg" />
        <div>
          <div className="skeleton h-4 w-28 mb-1.5" />
          <div className="skeleton h-3 w-20" />
        </div>
      </div>
      <div className="skeleton h-4 w-12 rounded-md" />
    </div>
    <div className="grid grid-cols-2 gap-3 mb-3">
      <div>
        <div className="skeleton h-2.5 w-14 mb-1" />
        <div className="skeleton h-5 w-6" />
      </div>
      <div>
        <div className="skeleton h-2.5 w-12 mb-1" />
        <div className="skeleton h-5 w-6" />
      </div>
      <div>
        <div className="skeleton h-2.5 w-14 mb-1" />
        <div className="skeleton h-3 w-16" />
      </div>
      <div>
        <div className="skeleton h-2.5 w-14 mb-1" />
        <div className="skeleton h-5 w-9 rounded-full" />
      </div>
    </div>
    <div className="skeleton h-8 w-full rounded-lg" />
  </div>
);

export default function Devices() {
  const { devices, loading, fetchDevices, deleteDevice, toggleDeviceSync } = useDeviceStore();

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleDelete = async (deviceId) => {
    const device = devices.find(d => d.id === deviceId);
    const deviceName = device ? device.device_name : 'this device';

    if (confirm(`Remove ${deviceName}?`)) {
      await deleteDevice(deviceId);
    }
  };

  const handleToggleSync = async (deviceId, syncEnabled) => {
    await toggleDeviceSync(deviceId, syncEnabled);
  };

  return (
    <div className="p-3">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-apple-text tracking-tight">Devices</h1>
        <p className="text-xs text-apple-secondary mt-0.5">Manage your connected devices</p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {devices.map((device, index) => (
            <DeviceCard
              key={device.id}
              device={device}
              onDelete={handleDelete}
              onToggleSync={handleToggleSync}
              index={index}
            />
          ))}
        </div>
      )}

      {/* Info card */}
      <div className="mt-4 card !p-3 bg-black/[0.02]">
        <div className="flex items-start gap-2.5">
          <svg className="w-4 h-4 text-apple-secondary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <p className="text-xs text-apple-secondary leading-relaxed">
            Devices auto-register when you sign in. Removing a device hides it from this list — your fonts remain safely stored in the cloud.
          </p>
        </div>
      </div>
    </div>
  );
}
