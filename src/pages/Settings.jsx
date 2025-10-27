import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export default function Settings() {
  const { user } = useAuthStore();
  const [autoSync, setAutoSync] = useState(true);
  const [scanFrequency, setScanFrequency] = useState('daily');
  const [duplicateHandling, setDuplicateHandling] = useState('ask');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">Configure your Font Sync Pro preferences</p>
      </div>

      <div className="max-w-3xl space-y-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input-field bg-gray-50"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Auto-sync</p>
                <p className="text-sm text-gray-600">Automatically sync fonts across devices</p>
              </div>
              <button
                onClick={() => setAutoSync(!autoSync)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${autoSync ? 'bg-primary-600' : 'bg-gray-200'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${autoSync ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scan Frequency
              </label>
              <select
                value={scanFrequency}
                onChange={(e) => setScanFrequency(e.target.value)}
                className="input-field"
              >
                <option value="disabled">Disabled</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Duplicate Handling</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                When duplicates are found
              </label>
              <select
                value={duplicateHandling}
                onChange={(e) => setDuplicateHandling(e.target.value)}
                className="input-field"
              >
                <option value="ask">Always ask me</option>
                <option value="keep-newest">Keep newest version</option>
                <option value="keep-all">Keep all versions</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Used storage</span>
              <span className="font-medium">0 MB / 5 GB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-primary-600 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="btn-primary">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
