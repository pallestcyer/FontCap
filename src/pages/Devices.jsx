import React, { useEffect } from 'react';
import { useDeviceStore } from '../stores/deviceStore';

const DeviceCard = ({ device, onDelete }) => {
  const lastSync = device.last_sync 
    ? new Date(device.last_sync).toLocaleString()
    : 'Never';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{device.device_name}</h3>
          <p className="text-sm text-gray-600">{device.os_type} {device.os_version}</p>
        </div>
        <span className={`px-3 py-1 text-xs rounded-full ${
          device.is_active 
            ? 'bg-green-100 text-green-700' 
            : 'bg-gray-100 text-gray-700'
        }`}>
          {device.is_active ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Fonts contributed:</span>
          <span className="font-medium">{device.fonts_contributed_count || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Fonts installed:</span>
          <span className="font-medium">{device.fonts_installed_count || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Last sync:</span>
          <span className="font-medium">{lastSync}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 btn-secondary text-sm">
          Rescan
        </button>
        <button
          onClick={() => onDelete(device.id)}
          className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export default function Devices() {
  const { devices, loading, fetchDevices, deleteDevice } = useDeviceStore();

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleDelete = async (deviceId) => {
    if (confirm('Are you sure you want to remove this device?')) {
      await deleteDevice(deviceId);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Devices</h2>
        <p className="text-gray-600">Manage all your connected devices</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading devices...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💻</div>
          <p className="text-gray-600">No devices connected yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Devices will appear here when you log in on them
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
