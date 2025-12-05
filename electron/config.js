/**
 * Electron Configuration
 * Handles environment-specific settings for the Electron app
 */

const { app } = require('electron');

// Supabase configuration - these are bundled with the app
// The anon key is safe to expose (it's meant for client-side use with RLS)
// The service role key is used only in the main process for uploads
const SUPABASE_CONFIG = {
  url: 'https://pwzucewvklsmthzbvqct.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3enVjZXd2a2xzbXRoemJ2cWN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1Njg1NjksImV4cCI6MjA3OTE0NDU2OX0.0CeH2EC6imKioWkHBSInXn692KhCMepwDuNCu58NmeY',
  serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3enVjZXd2a2xzbXRoemJ2cWN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU2ODU2OSwiZXhwIjoyMDc5MTQ0NTY5fQ.PJuXtqfz7T0KhA6W6dei9dYGjyk1Jhq3safovrAttFQ',
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

  // Production default - should be overridden
  // This should be configured during build or via environment variables
  return process.env.PRODUCTION_API_URL || 'https://your-domain.com/api';
};

module.exports = {
  API_URL: getApiUrl(),
  IS_DEV: process.env.NODE_ENV === 'development',
  SUPABASE_URL: SUPABASE_CONFIG.url,
  SUPABASE_ANON_KEY: SUPABASE_CONFIG.anonKey,
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_CONFIG.serviceRoleKey,
};
