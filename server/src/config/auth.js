module.exports = {
  jwtSecret: process.env.JWT_SECRET || process.env.SESSION_SECRET || 'font-sync-pro-secret-key-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'font-sync-pro-refresh-secret-key',
  jwtExpiresIn: '1h',
  jwtRefreshExpiresIn: '7d',
};
