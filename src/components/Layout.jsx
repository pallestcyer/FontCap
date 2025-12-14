import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
const fontCapLogo = '/FontCap-Type.svg';
import { useAuthStore } from '../stores/authStore';
import { useFontStore } from '../stores/fontStore';
import { useDeviceStore } from '../stores/deviceStore';
import NotificationBanner from './NotificationBanner';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { syncStats } = useFontStore();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getSyncStatusColor = () => {
    if (!syncStats) return 'bg-neutral-300';
    if (syncStats.needsSync) return 'bg-status-warning';
    return 'bg-status-success';
  };

  const isSyncing = syncStats?.needsSync;

  // Navigation items with SF Symbols-inspired icons
  const navItems = [
    {
      path: '/',
      title: 'Fonts',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      ),
    },
    {
      path: '/devices',
      title: 'Devices',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
        </svg>
      ),
    },
    {
      path: '/settings',
      title: 'Settings',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <header className="h-12 glass-header px-3 flex items-center justify-between sticky top-0 z-40">
      {/* Logo and sync status */}
      <div className="flex items-center gap-2">
        <Link to="/" className="logo-link">
          <img src={fontCapLogo} alt="FontCap" className="h-4 transition-all duration-200" />
        </Link>
        <span
          className={`w-2 h-2 ${getSyncStatusColor()} rounded-full ${isSyncing ? 'animate-sync-pulse' : ''}`}
          title={isSyncing ? 'Sync needed' : 'Up to date'}
        />
      </div>

      {/* Navigation - Segmented control style */}
      <nav className="flex items-center">
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-black/[0.04]">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`p-1.5 rounded-md nav-icon flex items-center justify-center transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-white text-apple-text shadow-sm'
                  : 'text-apple-secondary hover:text-apple-text'
              }`}
              title={item.title}
            >
              {item.icon}
            </Link>
          ))}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-apple-secondary hover:text-apple-text nav-icon ml-0.5"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </nav>
    </header>
  );
};

const operationIcons = {
  scanning: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  uploading: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  ),
  downloading: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
};

const operationLabels = {
  scanning: 'Scanning',
  uploading: 'Uploading',
  downloading: 'Downloading'
};

const ProgressBar = ({ hidden, onHide }) => {
  const { operationProgress } = useFontStore();

  if (!operationProgress.active || hidden) return null;

  const label = operationLabels[operationProgress.type] || 'Processing';
  const icon = operationIcons[operationProgress.type] || operationIcons.scanning;
  const percentage = operationProgress.total > 0
    ? Math.round((operationProgress.current / operationProgress.total) * 100)
    : 0;

  return (
    <div className="fixed bottom-16 left-3 right-3 z-40 animate-slide-up">
      <div className="bg-white/90 backdrop-blur-xl rounded-xl border border-black/[0.04] shadow-soft px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent">
              {icon}
            </div>
            <span className="font-medium text-apple-text text-xs tracking-tight">{label}</span>
            {operationProgress.currentFontName && (
              <span className="text-apple-tertiary text-xs truncate" title={operationProgress.currentFontName}>
                {operationProgress.currentFontName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-apple-secondary tabular-nums">
              {operationProgress.total > 0 ? `${operationProgress.current}/${operationProgress.total}` : '...'}
            </span>
            <span className="text-xs font-semibold text-accent tabular-nums">{percentage}%</span>
            <button
              onClick={onHide}
              className="w-5 h-5 rounded flex items-center justify-center text-apple-tertiary hover:text-apple-text hover:bg-black/[0.04] transition-colors"
              title="Hide"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill relative overflow-hidden"
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 progress-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
};

const Footer = () => {
  const { syncStats, lastSync, performSync, syncing, operationProgress } = useFontStore();
  const { currentDevice } = useDeviceStore();
  const [progressHidden, setProgressHidden] = useState(false);

  useEffect(() => {
    if (operationProgress.active) {
      setProgressHidden(false);
    }
  }, [operationProgress.active]);

  const handleSync = async () => {
    if (!currentDevice) return;
    await performSync(currentDevice.id);
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Never';
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <ProgressBar hidden={progressHidden} onHide={() => setProgressHidden(true)} />

      {/* Floating Footer Pill */}
      <div className="fixed bottom-3 left-3 right-3 z-50">
        <footer className="bg-white/90 backdrop-blur-xl rounded-xl border border-black/[0.04] shadow-soft h-10 px-3 flex items-center justify-between">
          {/* Left side - Stats */}
          <div className="flex items-center gap-2 text-xs min-w-0 overflow-hidden">
            <div className="flex items-center gap-1">
              <span className="text-apple-text font-medium tabular-nums">{syncStats?.totalLocal || 0}</span>
              <span className="text-apple-tertiary">local</span>
            </div>
            <span className="w-px h-2.5 bg-black/[0.08]" />
            <div className="flex items-center gap-1">
              <span className="text-apple-text font-medium tabular-nums">{syncStats?.totalCloud || 0}</span>
              <span className="text-apple-tertiary">cloud</span>
            </div>

            {operationProgress.active && progressHidden && (
              <>
                <span className="w-px h-2.5 bg-black/[0.08]" />
                <button
                  onClick={() => setProgressHidden(false)}
                  className="flex items-center gap-1 text-accent font-medium transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-soft" />
                  Progress
                </button>
              </>
            )}
          </div>

          {/* Right side - Sync */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-apple-tertiary whitespace-nowrap">{formatLastSync()}</span>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/8 text-accent font-medium text-xs
                         hover:bg-accent/12 disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
            >
              {syncing ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Syncing</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  <span>Sync</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </>
  );
};

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-apple-bg">
      <NotificationBanner />
      <Header />
      <main className="flex-1 overflow-auto pb-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
