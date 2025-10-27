import React, { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFontStore } from '../stores/fontStore';
import { useDeviceStore } from '../stores/deviceStore';

const FontCard = ({ font }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{font.font_name}</h3>
          <p className="text-sm text-gray-600">{font.font_family}</p>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
          ✓ Synced
        </span>
      </div>
      
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-2xl" style={{ fontFamily: font.font_family || 'inherit' }}>
          The quick brown fox
        </p>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>{font.font_format}</span>
        <span>{(font.file_size / 1024).toFixed(1)} KB</span>
        {font.origin_device_name && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
            {font.origin_device_name}
          </span>
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
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}`}
    >
      <input {...getInputProps()} />
      <div className="text-6xl mb-4">📁</div>
      <p className="text-lg text-gray-700 mb-2">
        {isDragActive ? 'Drop fonts here...' : 'Drag & drop fonts here'}
      </p>
      <p className="text-sm text-gray-500">
        or click to browse (TTF, OTF, WOFF, WOFF2)
      </p>
    </div>
  );
};

export default function Dashboard() {
  const { fonts, loading, fetchFonts, uploadFont, getFilteredFonts, bulkRegisterFonts } = useFontStore();
  const { currentDevice, registerDevice } = useDeviceStore();
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchFonts();
    registerCurrentDevice();
  }, []);

  const registerCurrentDevice = async () => {
    if (window.electronAPI) {
      const deviceInfo = await window.electronAPI.getDeviceInfo();
      const deviceId = `${deviceInfo.osType}-${deviceInfo.deviceName}`;
      
      await registerDevice({
        deviceName: deviceInfo.deviceName,
        deviceId,
        osType: deviceInfo.osType,
        osVersion: deviceInfo.osVersion,
      });
    }
  };

  const handleScanFonts = async () => {
    if (!window.electronAPI) {
      alert('Font scanning is only available in the desktop app');
      return;
    }

    setScanning(true);
    try {
      const directories = await window.electronAPI.getSystemFontDirectories();
      const result = await window.electronAPI.scanFonts(directories);
      
      if (result.success && result.fonts.length > 0) {
        const deviceInfo = await window.electronAPI.getDeviceInfo();
        const deviceResult = await registerDevice({
          deviceName: deviceInfo.deviceName,
          deviceId: `${deviceInfo.osType}-${deviceInfo.deviceName}`,
          osType: deviceInfo.osType,
          osVersion: deviceInfo.osVersion,
        });
        
        if (deviceResult.success) {
          const bulkResult = await bulkRegisterFonts(result.fonts, deviceResult.device.id);
          
          if (bulkResult.success) {
            alert(`Scan complete!\n\nFound: ${result.fonts.length} fonts\nRegistered: ${bulkResult.data.registered} new fonts\nDuplicates: ${bulkResult.data.duplicates} fonts already in library`);
            await fetchFonts();
          } else {
            alert(`Error registering fonts: ${bulkResult.error}`);
          }
        }
      } else {
        alert(`No fonts found on your system.`);
      }
    } catch (error) {
      console.error('Scan error:', error);
      alert(`Error scanning fonts: ${error.message}`);
    }
    setScanning(false);
  };

  const handleUpload = async (files) => {
    setUploading(true);
    for (const file of files) {
      await uploadFont(file);
    }
    setUploading(false);
  };

  const filteredFonts = getFilteredFonts();

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Your Fonts</h2>
          <button
            onClick={handleScanFonts}
            disabled={scanning}
            className="btn-primary disabled:opacity-50"
          >
            {scanning ? 'Scanning...' : '🔍 Scan System Fonts'}
          </button>
        </div>

        {fonts.length === 0 && !loading && (
          <UploadZone onUpload={handleUpload} />
        )}
      </div>

      {uploading && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700">Uploading fonts...</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading fonts...</p>
        </div>
      ) : (
        <>
          <div className="mb-6 flex justify-between items-center">
            <p className="text-gray-600">
              {filteredFonts.length} {filteredFonts.length === 1 ? 'font' : 'fonts'} in your library
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFonts.map((font) => (
              <FontCard key={font.id} font={font} />
            ))}
          </div>

          {filteredFonts.length > 0 && fonts.length > 0 && (
            <div className="mt-8">
              <UploadZone onUpload={handleUpload} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
