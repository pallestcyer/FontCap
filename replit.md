# Font Sync Pro - Project Documentation

## Overview
Font Sync Pro is a cross-platform desktop application built with Electron, React, and Node.js that automatically syncs fonts across multiple devices. The application provides intelligent font discovery, cloud storage, real-time synchronization, and duplicate detection.

## Project Status
**Current Phase**: MVP Development in Progress  
**Last Updated**: October 27, 2025

## Architecture

### Tech Stack
- **Frontend**: Electron + React 18 + Tailwind CSS
- **Build Tool**: Vite 5
- **Backend**: Express.js (Node.js)
- **Database**: PostgreSQL (Neon-backed Replit DB)
- **State Management**: Zustand
- **Font Parsing**: Fontkit
- **File Watching**: Chokidar
- **Authentication**: JWT with bcrypt

### Project Structure
```
font-sync-pro/
├── server/              # Express backend API (port 3000)
│   ├── src/
│   │   ├── config/      # Database & auth config
│   │   ├── middleware/  # JWT authentication
│   │   ├── routes/      # API endpoints (auth, fonts, devices, sync)
│   │   └── server.js    # Main server entry point
├── electron/            # Electron main process
│   ├── services/        # Font scanner & file watcher
│   ├── main.js         # Window management, IPC, system tray
│   └── preload.js      # Context bridge for IPC
├── src/                 # React frontend (Vite dev on port 5173)
│   ├── components/      # Reusable UI components
│   ├── pages/          # Route pages (Login, Dashboard, Devices, Settings)
│   ├── stores/         # Zustand state management
│   ├── styles/         # Tailwind CSS
│   └── App.jsx         # Main React app with routing
├── uploads/fonts/       # Local font file storage
└── public/             # Static assets
```

## Database Schema

### Tables Implemented
1. **users** - User accounts with email/password authentication
2. **devices** - Connected devices per user with OS info and sync status
3. **fonts** - Font metadata with file paths, hashes, and origin tracking
4. **font_duplicates** - Duplicate font tracking and resolution
5. **device_fonts** - Junction table for device-font relationships
6. **sync_queue** - Pending sync operations
7. **font_scan_history** - History of font scans per device

All tables include proper indexes for performance.

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Create new user account
- `POST /login` - Authenticate and get JWT tokens
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout user

### Fonts (`/api/fonts`)
- `GET /` - Get all user fonts with metadata
- `POST /upload` - Upload single font file
- `POST /bulk-register` - Register multiple scanned fonts
- `GET /check-hash/:hash` - Check if font exists
- `GET /duplicates` - Get duplicate font groups
- `DELETE /:id` - Delete font
- `GET /:id/download` - Download font file

### Devices (`/api/devices`)
- `GET /` - List all user devices
- `POST /register` - Register new device
- `PUT /:id` - Update device info
- `DELETE /:id` - Remove device
- `GET /:id/fonts` - Get fonts on specific device

### Sync (`/api/sync`)
- `GET /status` - Get sync status and counts
- `POST /trigger` - Trigger manual sync
- `GET /queue/:deviceId` - Get sync queue for device

## Features Implemented

### ✅ Completed
1. **Project Setup**
   - Node.js/Electron project structure
   - All dependencies installed (React, Electron, Express, PostgreSQL client, etc.)
   - Vite configuration with Electron plugin
   - Tailwind CSS setup
   
2. **Database**
   - Full schema with 7 tables
   - Auto-initialization on server start
   - Indexes for performance
   - Foreign key relationships

3. **Backend API**
   - Complete authentication system with JWT
   - Font management endpoints (upload, list, delete, download)
   - Bulk font registration for scanned fonts
   - Device management endpoints
   - Sync status and trigger endpoints
   - Hash-based duplicate detection

4. **Electron Main Process**
   - Window management
   - System tray integration
   - IPC handlers for font scanning
   - File system watcher integration
   - Native notifications
   - Device info detection

5. **Font Scanning Engine**
   - OS-specific directory detection (Windows, macOS, Linux)
   - Recursive directory scanning
   - SHA-256 hash calculation for deduplication
   - Metadata extraction using Fontkit
   - Support for TTF, OTF, WOFF, WOFF2 formats

6. **File Watching Service**
   - Real-time font detection using Chokidar
   - Add/remove event handling
   - Automatic metadata extraction for new fonts

7. **React Frontend**
   - Complete routing setup with React Router
   - Authentication pages (Login, Register)
   - Main layout with header, sidebar, footer
   - Dashboard with font grid display
   - Device management page
   - Settings page
   - Zustand stores for state management
   - Drag-and-drop font upload with react-dropzone

### 🚧 In Progress
- WebSocket implementation for real-time sync
- Toast notification system
- Font preview rendering
- Advanced filtering and search

### 📋 Planned Features
- Font installation with OS-specific APIs
- Conflict resolution UI
- Performance optimizations (lazy loading, virtual scrolling)
- Comprehensive error handling and retry mechanisms
- Cross-platform build and packaging

## Development

### Running the Application

**Backend Server:**
```bash
cd server && node src/server.js
# Runs on http://localhost:3000
```

**Electron App (Development):**
```bash
npm run dev
# Runs Vite dev server on http://localhost:5173
# Launches Electron window
```

**Full Development Mode:**
```bash
npm run dev
# Runs both server and Electron concurrently
```

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Replit)
- `JWT_SECRET` - JWT signing secret (uses SESSION_SECRET fallback)
- `PORT` - Server port (default: 3000)

## Security Considerations
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt (10 rounds)
- File hash verification (SHA-256)
- CORS enabled for Electron app
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)

## Known Issues
- Font preview requires actual font installation (planned)
- WebSocket sync not yet implemented
- No automated tests yet
- File storage is local (S3 integration planned)

## Notes
- The app is designed to work cross-platform (Windows, macOS, Linux)
- Font scanning respects OS-specific system directories
- Duplicate detection uses file hash comparison
- Device tracking allows font origin attribution
