require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { initDatabase, supabase } = require('./config/database');

const authRoutes = require('./routes/auth');
const fontRoutes = require('./routes/fonts');
const deviceRoutes = require('./routes/devices');
const syncRoutes = require('./routes/sync');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration - whitelist specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

// In production, also allow electron app (file:// protocol handled separately)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Electron, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, be more permissive
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Limit request body size to prevent abuse
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/fonts', fontRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  };

  // Check Supabase connection
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error && error.code !== '42P01') {
      throw error;
    }
    health.database = 'connected';
    health.provider = 'supabase';
  } catch (error) {
    health.status = 'degraded';
    health.database = 'disconnected';
    health.databaseError = error.message;
  }

  // Memory usage
  const memoryUsage = process.memoryUsage();
  health.memory = {
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

async function startServer() {
  try {
    await initDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 FontCap server running on port ${PORT}`);
      console.log(`📍 API available at http://localhost:${PORT}/api`);
      console.log(`☁️  Using Supabase: ${process.env.SUPABASE_URL}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
