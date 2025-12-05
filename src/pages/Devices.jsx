import React, { useEffect } from 'react';
import { useDeviceStore } from '../stores/deviceStore';

const DeviceCard = ({ device, onDelete, onToggleSync }) => {
  const lastSync = device.last_sync
    ? new Date(device.last_sync).toLocaleDateString()
    : 'Never';

  const syncEnabled = device.sync_enabled !== false;

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-3">
      <div className="flex justify-between items-start mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm text-black truncate">{device.device_name}</h3>
          <p className="text-xs text-neutral-500 font-serif">{device.os_type} {device.os_version}</p>
        </div>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
          device.is_active
            ? 'bg-black text-white'
            : 'bg-neutral-100 text-neutral-600'
        }`}>
          {device.is_active ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div>
          <span className="text-neutral-500 font-serif">Contributed:</span>
          <span className="ml-1 font-semibold">{device.fonts_contributed_count || 0}</span>
        </div>
        <div>
          <span className="text-neutral-500 font-serif">Installed:</span>
          <span className="ml-1 font-semibold">{device.fonts_installed_count || 0}</span>
        </div>
        <div>
          <span className="text-neutral-500 font-serif">Last sync:</span>
          <span className="ml-1 font-semibold">{lastSync}</span>
        </div>
        <div className="flex items-center">
          <span className="text-neutral-500 font-serif">Auto-sync:</span>
          <label className="relative inline-flex items-center cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={syncEnabled}
              onChange={(e) => onToggleSync(device.id, e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>

      <button
        onClick={() => onDelete(device.id)}
        className="w-full px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 font-semibold rounded-lg transition-colors border border-neutral-300"
      >
        Remove
      </button>
    </div>
  );
};

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
      <div className="mb-3">
        <h2 className="text-lg font-bold text-black">Devices</h2>
        <p className="text-xs text-neutral-500 font-serif">Manage connected devices</p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-neutral-500 text-sm">Loading...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">◯</div>
          <p className="text-neutral-500 text-sm font-serif">No devices connected</p>
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onDelete={handleDelete}
              onToggleSync={handleToggleSync}
            />
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-neutral-100 rounded-lg">
        <p className="text-xs text-neutral-500 font-serif">
          Devices auto-register when you sign in. Removing a device just hides it — fonts remain in your library.
        </p>
      </div>
    </div>
  );
}
