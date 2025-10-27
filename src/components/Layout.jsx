import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const Sidebar = () => {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  const linkClass = (path) => `
    block px-4 py-3 rounded-lg transition-colors
    ${isActive(path) 
      ? 'bg-primary-600 text-white' 
      : 'text-gray-700 hover:bg-gray-100'
    }
  `;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-full p-4">
      <nav className="space-y-2">
        <Link to="/" className={linkClass('/')}>
          <div className="flex items-center gap-2">
            <span>📚</span>
            <span>All Fonts</span>
          </div>
        </Link>
        <Link to="/devices" className={linkClass('/devices')}>
          <div className="flex items-center gap-2">
            <span>💻</span>
            <span>Devices</span>
          </div>
        </Link>
        <Link to="/settings" className={linkClass('/settings')}>
          <div className="flex items-center gap-2">
            <span>⚙️</span>
            <span>Settings</span>
          </div>
        </Link>
      </nav>
    </aside>
  );
};

const Header = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-primary-600">Font Sync Pro</h1>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span>Synced</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search fonts..."
          className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        />
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

const Footer = () => {
  return (
    <footer className="h-12 bg-white border-t border-gray-200 px-6 flex items-center justify-between text-sm text-gray-600">
      <div className="flex items-center gap-4">
        <span>Last sync: Just now</span>
        <span>|</span>
        <span>Storage: 0 MB / 5 GB</span>
      </div>
      
      <button className="text-primary-600 hover:text-primary-700">
        Sync Now
      </button>
    </footer>
  );
};

export default function Layout() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}
