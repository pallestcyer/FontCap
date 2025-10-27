const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/database');

const authRoutes = require('./routes/auth');
const fontRoutes = require('./routes/fonts');
const deviceRoutes = require('./routes/devices');
const syncRoutes = require('./routes/sync');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/fonts', fontRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/sync', syncRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Font Sync Pro API is running' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Font Sync Pro server running on port ${PORT}`);
      console.log(`📍 API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
