// JWT Configuration - secrets MUST be set via environment variables in production
const jwtSecret = process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

// Fail fast if secrets are not configured in production
if (process.env.NODE_ENV === 'production') {
  if (!jwtSecret) {
    throw new Error('CRITICAL: JWT_SECRET environment variable is required in production');
  }
  if (!jwtRefreshSecret) {
    throw new Error('CRITICAL: JWT_REFRESH_SECRET environment variable is required in production');
  }
}

// Development fallback with warning
if (!jwtSecret || !jwtRefreshSecret) {
  console.warn('⚠️  WARNING: Using default JWT secrets. Set JWT_SECRET and JWT_REFRESH_SECRET for production.');
}

module.exports = {
  jwtSecret: jwtSecret || 'dev-only-jwt-secret-do-not-use-in-production',
  jwtRefreshSecret: jwtRefreshSecret || 'dev-only-refresh-secret-do-not-use-in-production',
  jwtExpiresIn: '1h',
  jwtRefreshExpiresIn: '7d',
};
