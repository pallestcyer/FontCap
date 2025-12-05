/**
 * Validate environment variables and configuration
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Check NODE_ENV
  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV is not set. Defaulting to development.');
    process.env.NODE_ENV = 'development';
  }

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required. Please set it in your .env file.');
  }

  // Check JWT_SECRET
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required. Please set it in your .env file.');
  } else {
    // In production, JWT_SECRET must be strong
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopmentSecret = process.env.JWT_SECRET.includes('dev-secret-key') ||
                                process.env.JWT_SECRET.includes('CHANGE_THIS');

    if (isProduction && isDevelopmentSecret) {
      errors.push(
        'JWT_SECRET is using a development/default value in production! ' +
        'This is a critical security risk. Generate a secure random string:\n' +
        'node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
      );
    }

    if (isProduction && process.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters long for production.');
    }
  }

  // Check PORT
  if (!process.env.PORT) {
    warnings.push('PORT is not set. Defaulting to 3000.');
    process.env.PORT = '3000';
  }

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ALLOWED_ORIGINS) {
      warnings.push('ALLOWED_ORIGINS is not set. CORS will allow all origins (not recommended).');
    }

    // Check if using localhost in production
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')) {
      warnings.push('DATABASE_URL contains localhost in production. Ensure your database is properly configured.');
    }
  }

  // Display errors
  if (errors.length > 0) {
    console.error('\n❌ Configuration Errors:\n');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\nServer cannot start with configuration errors.\n');
    process.exit(1);
  }

  // Display warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Configuration Warnings:\n');
    warnings.forEach(warn => console.warn(`  - ${warn}`));
    console.warn('');
  }

  // Success message
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Environment configuration validated successfully');
  }
}

module.exports = { validateEnvironment };
