import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Settings from './pages/Settings';
import Layout from './components/Layout';

function App() {
  const { isAuthenticated, loading, initialize, handleDeepLinkAuth } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Listen for deep link authentication (email confirmation, magic links)
  useEffect(() => {
    if (!window.electronAPI?.onDeepLinkAuth) return;

    const cleanup = window.electronAPI.onDeepLinkAuth(async (authData) => {
      console.log('Received deep link auth:', authData.type);
      const result = await handleDeepLinkAuth(authData);
      if (result.success) {
        console.log('Deep link authentication successful');
      } else {
        console.error('Deep link authentication failed:', result.error);
      }
    });

    return cleanup;
  }, [handleDeepLinkAuth]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-apple-bg flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <img src="./FontCap.svg" alt="FontCap" className="h-10 mx-auto mb-4 animate-pulse" />
          <p className="text-apple-secondary text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />

        <Route
          path="/"
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard />} />
          <Route path="devices" element={<Devices />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
