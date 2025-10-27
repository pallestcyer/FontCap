# Font Sync Pro

A cross-platform font management and synchronization service that automatically syncs fonts across all your devices.

## Features

- **Automatic Font Discovery**: Scans system font directories on Windows, macOS, and Linux
- **Cross-Platform Sync**: Keep fonts synchronized across multiple devices
- **Smart Duplicate Detection**: Identifies and manages duplicate fonts
- **Real-time Monitoring**: File system watchers detect newly installed fonts
- **Device Management**: Manage fonts across all your connected devices
- **Cloud Storage**: Secure cloud storage for all your fonts

## Tech Stack

- **Frontend**: Electron + React + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Real-time**: WebSocket

## Getting Started

### Development

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Start development server
npm run dev
```

### Build

```bash
# Build for production
npm run build
```

## Project Structure

```
font-sync-pro/
├── server/          # Express backend API
├── electron/        # Electron main process
├── src/             # React frontend
├── public/          # Static assets
└── uploads/         # Font file storage
```
