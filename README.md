<p align="center">
  <img src="FontCap-Logo.png" alt="FontCap" width="400">
</p>

<p align="center">
  <strong>Your fonts. Every device.</strong>
</p>

<p align="center">
  <a href="#download">Download</a> •
  <a href="#features">Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#self-hosting">Self-Hosting</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/github/v/release/pallestcyer/FontCap" alt="Release">
</p>

---

FontCap syncs your font library across all your devices. Install a font on your Mac, and it's automatically available on your Windows workstation and Linux laptop. No more emailing font files to yourself or hunting through cloud storage.

<p align="center">
  <img src="FontCap3d-6.png" alt="FontCap App Icon" width="200">
</p>

## Download

Download the latest version for your platform:

| Platform | Download | Requirements |
|----------|----------|--------------|
| **macOS** | [FontCap-1.0.0-universal.dmg](https://github.com/pallestcyer/FontCap/releases/latest) | macOS 10.13+ |
| **Windows** | [FontCap-1.0.0-win-x64.zip](https://github.com/pallestcyer/FontCap/releases/latest) | Windows 10+ |
| **Linux** | [FontCap-1.0.0.AppImage](https://github.com/pallestcyer/FontCap/releases/latest) | Ubuntu 18.04+ or equivalent |

## Features

- **Cross-Platform Sync** — Works natively on macOS, Windows, and Linux
- **Automatic Font Discovery** — Scans your system font directories on first launch
- **Smart Deduplication** — SHA-256 hashing prevents duplicate uploads
- **One-Click Install** — Download and install missing fonts with a single click
- **Multi-Device Management** — See all your devices and their sync status
- **Offline Support** — Fonts already on your device work without internet
- **System Tray** — Runs quietly in the background
- **Privacy First** — Your fonts are stored in your own Supabase project

### Supported Font Formats

TTF • OTF • WOFF • WOFF2

## How It Works

1. **Create an account** — Sign up with email and password
2. **Scan your fonts** — FontCap automatically detects fonts on your system
3. **Upload to cloud** — Your fonts are securely uploaded to your storage
4. **Sync everywhere** — Install FontCap on another device and sync your library

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   MacBook   │     │   Supabase  │     │  Windows PC │
│             │────▶│   Storage   │◀────│             │
│  500 fonts  │     │             │     │  500 fonts  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Quick Start

1. Download and install FontCap for your platform
2. Create an account or log in
3. Click **Scan Fonts** to detect your installed fonts
4. Click **Upload All** to sync fonts to the cloud
5. On your other devices, click **Sync** to download your font library

## Self-Hosting

FontCap is fully open source. You can run your own instance with your own Supabase project.

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works great)

### Setup

1. **Create a Supabase Project**

   Go to [supabase.com](https://supabase.com) and create a new project.

2. **Set Up the Database**

   In your Supabase dashboard, go to **SQL Editor** and run the schema from:
   ```
   server/src/config/schema-supabase-auth.sql
   ```

3. **Create Storage Bucket**

   In **Storage**, create a bucket named `fonts` with the following settings:
   - Public: No
   - File size limit: 50MB

4. **Configure Environment**

   ```bash
   git clone https://github.com/pallestcyer/FontCap.git
   cd FontCap
   cp .env.example .env
   ```

   Edit `.env` with your Supabase credentials (found in Settings → API):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Run Locally**

   ```bash
   npm install
   npm run dev          # Start Vite dev server
   npm run electron:start  # Start Electron (in another terminal)
   ```

6. **Build for Distribution**

   ```bash
   npm run build:mac    # macOS (.dmg)
   npm run build:win    # Windows (.zip)
   npm run build:linux  # Linux (.AppImage, .deb)
   ```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop App | Electron 28 |
| Frontend | React 18 + Tailwind CSS |
| State | Zustand |
| Backend | Supabase (Auth, Database, Storage) |
| Build | Vite + electron-builder |

## Project Structure

```
fontcap/
├── electron/              # Electron main process
│   ├── main.js            # App entry, IPC handlers
│   ├── preload.js         # Context bridge
│   └── services/          # Font scanning, installation, upload
├── src/                   # React frontend
│   ├── components/        # Reusable UI components
│   ├── pages/             # Dashboard, Devices, Settings, Login
│   ├── stores/            # Zustand state (auth, fonts, devices)
│   └── config/            # Supabase client
├── server/                # Database schemas and migrations
│   └── src/config/        # SQL schemas for Supabase
└── build/                 # Electron builder resources
```

## Security

- **Row Level Security (RLS)** — Users can only access their own data
- **Scoped Storage** — Font files stored in user-specific folders
- **Password Hashing** — Handled by Supabase Auth (bcrypt)
- **File Integrity** — SHA-256 hashes verify font files

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run the app locally to test
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development

```bash
# Install dependencies
npm install

# Start development
npm run dev              # Vite dev server
npm run electron:start   # Electron app

# The app will hot-reload as you make changes
```

## Roadmap

- [ ] Font previews in the dashboard
- [ ] Font collections/folders
- [ ] Selective sync (choose which fonts to sync)
- [ ] Font activation/deactivation without uninstalling
- [ ] Team/organization sharing

## FAQ

**Q: Is FontCap free?**
A: Yes! FontCap is open source and free to use. You'll need a Supabase account for cloud storage (free tier includes 1GB).

**Q: Where are my fonts stored?**
A: In your own Supabase project's storage. You have full control over your data.

**Q: Does FontCap modify my system fonts?**
A: FontCap only installs fonts to your user font directory. It never modifies or deletes system fonts.

**Q: Can I use FontCap offline?**
A: Yes! Fonts already installed on your device work offline. You only need internet to sync.

**Q: What about font licenses?**
A: FontCap syncs fonts you own. Make sure you have the appropriate licenses for any fonts you sync across devices.

## License

MIT License — see [LICENSE](LICENSE) for details.

## Support

- [GitHub Issues](https://github.com/pallestcyer/FontCap/issues) — Bug reports and feature requests
- [Discussions](https://github.com/pallestcyer/FontCap/discussions) — Questions and community chat

---

<p align="center">
  Made with ♥ for designers and developers who work across multiple machines
</p>
