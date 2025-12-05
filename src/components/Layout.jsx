import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import fontCapLogo from '/FontCap-Type.svg';
import { useAuthStore } from '../stores/authStore';
import { useFontStore } from '../stores/fontStore';
import { useDeviceStore } from '../stores/deviceStore';
import NotificationBanner from './NotificationBanner';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { syncStats } = useFontStore();
  const [showMenu, setShowMenu] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getSyncStatusColor = () => {
    if (!syncStats) return 'bg-neutral-400';
    if (syncStats.needsSync) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  const isSyncing = syncStats?.needsSync;

  return (
    <header className="h-14 bg-white border-b border-neutral-200 px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img src={fontCapLogo} alt="FontCap" className="h-5" />
        <span className={`w-2 h-2 ${getSyncStatusColor()} rounded-full ${isSyncing ? 'animate-sync-pulse' : ''}`}></span>
      </div>

      <nav className="flex items-center gap-1">
        <Link
          to="/"
          className={`p-2 rounded-lg nav-icon ${
            isActive('/') ? 'bg-black text-white' : 'text-neutral-500 hover:bg-neutral-100'
          }`}
          title="Fonts"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </Link>
        <Link
          to="/devices"
          className={`p-2 rounded-lg nav-icon ${
            isActive('/devices') ? 'bg-black text-white' : 'text-neutral-500 hover:bg-neutral-100'
          }`}
          title="Devices"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </Link>
        <Link
          to="/settings"
          className={`p-2 rounded-lg nav-icon ${
            isActive('/settings') ? 'bg-black text-white' : 'text-neutral-500 hover:bg-neutral-100'
          }`}
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 nav-icon ml-1"
          title="Logout"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </nav>
    </header>
  );
};

const operationLabels = {
  scanning: { title: 'Scanning', icon: '◐' },
  uploading: { title: 'Uploading', icon: '↑' },
  downloading: { title: 'Downloading', icon: '↓' }
};

const ProgressBar = ({ hidden, onHide }) => {
  const { operationProgress } = useFontStore();

  if (!operationProgress.active || hidden) return null;

  const config = operationLabels[operationProgress.type] || { title: 'Processing', icon: '○' };
  const percentage = operationProgress.total > 0
    ? Math.round((operationProgress.current / operationProgress.total) * 100)
    : 0;

  return (
    <div className="fixed bottom-10 left-0 right-0 bg-white border-t border-neutral-200 shadow-lg z-40">
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-sm font-medium">{config.icon}</span>
            <span className="font-semibold text-black text-xs tracking-wide uppercase">{config.title}</span>
            {operationProgress.currentFontName && (
              <span className="text-neutral-500 text-xs truncate font-serif" title={operationProgress.currentFontName}>
                — {operationProgress.currentFontName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-neutral-600">
              {operationProgress.total > 0 ? `${operationProgress.current}/${operationProgress.total}` : '...'}
            </span>
            <span className="text-xs font-semibold text-blue-600">{percentage}%</span>
            <button
              onClick={onHide}
              className="text-neutral-400 hover:text-black text-xs p-0.5"
              title="Hide"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 progress-shimmer"></div>
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

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <ProgressBar hidden={progressHidden} onHide={() => setProgressHidden(true)} />
      <footer className="h-10 bg-white border-t border-neutral-200 px-3 flex items-center justify-between text-xs text-neutral-600 relative z-50">
        <div className="flex items-center gap-2">
          <span className="font-medium">{syncStats?.totalLocal || 0} local</span>
          <span className="text-neutral-300">|</span>
          <span className="font-medium">{syncStats?.totalCloud || 0} cloud</span>
          {operationProgress.active && progressHidden && (
            <>
              <span className="text-neutral-300">|</span>
              <button
                onClick={() => setProgressHidden(false)}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
              >
                <span className="animate-pulse">●</span>
                Progress
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-neutral-400 font-serif">{formatLastSync()}</span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-blue-600 hover:text-blue-700 disabled:opacity-50 font-semibold btn-press"
          >
            {syncing ? '...' : 'Sync'}
          </button>
        </div>
      </footer>
    </>
  );
};

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      <NotificationBanner />
      <Header />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
