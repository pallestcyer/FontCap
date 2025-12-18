/**
 * Electron Configuration
 * Handles environment-specific settings for the Electron app
 */

const { app } = require('electron');

// Supabase configuration - these are bundled with the app
// The anon key is safe to expose (it's meant for client-side use with RLS)
// Service role key no longer needed in Electron - uploads go through server to R2
const SUPABASE_CONFIG = {
  url: 'https://hzeeswpnzjqebrceotpp.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6ZWVzd3BuempxZWJyY2VvdHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NzY5NjcsImV4cCI6MjA3OTE1Mjk2N30.r_Un3HB3IIeTZmuEgbJfvYH7PyAmsGGpGq9Bd75dIl0',
  serviceRoleKey: '', // No longer needed - uploads go through server
};

// Get API URL from environment or use default
const getApiUrl = () => {
  // Check environment variable first
  if (process.env.API_URL) {
    return process.env.API_URL;
  }

  // Check if we're in development or production
  const isDev = process.env.NODE_ENV === 'development' || (app && !app.isPackaged);

  if (isDev) {
    return 'http://127.0.0.1:3000/api';
  }

  // Production API
  return 'https://api.fontcap.com/api';
};

module.exports = {
  API_URL: getApiUrl(),
  IS_DEV: process.env.NODE_ENV === 'development',
  SUPABASE_URL: SUPABASE_CONFIG.url,
  SUPABASE_ANON_KEY: SUPABASE_CONFIG.anonKey,
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_CONFIG.serviceRoleKey,
};
