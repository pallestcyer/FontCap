const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/status', authenticateToken, async (req, res) => {
  try {
    const deviceId = req.query.deviceId;

    const fontsResult = await pool.query(
      'SELECT COUNT(*) as total FROM fonts WHERE user_id = $1',
      [req.user.userId]
    );

    let deviceFonts = 0;
    if (deviceId) {
      const deviceResult = await pool.query(
        'SELECT COUNT(*) as total FROM device_fonts WHERE device_id = $1',
        [deviceId]
      );
      deviceFonts = parseInt(deviceResult.rows[0].total);
    }

    const queueResult = await pool.query(`
      SELECT COUNT(*) as pending
      FROM sync_queue sq
      JOIN devices d ON sq.device_id = d.id
      WHERE d.user_id = $1 AND sq.status = 'pending'
    `, [req.user.userId]);

    res.json({
      totalFonts: parseInt(fontsResult.rows[0].total),
      deviceFonts,
      pendingSync: parseInt(queueResult.rows[0].pending),
      lastSync: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/trigger', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const deviceResult = await pool.query(
      'SELECT id FROM devices WHERE id = $1 AND user_id = $2',
      [deviceId, req.user.userId]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await pool.query(
      'UPDATE devices SET last_sync = CURRENT_TIMESTAMP WHERE id = $1',
      [deviceId]
    );

    const fontsResult = await pool.query(`
      SELECT f.* FROM fonts f
      WHERE f.user_id = $1
      AND NOT EXISTS (
        SELECT 1 FROM device_fonts df 
        WHERE df.font_id = f.id AND df.device_id = $2
      )
    `, [req.user.userId, deviceId]);

    res.json({
      message: 'Sync triggered successfully',
      fontsToSync: fontsResult.rows.length,
      fonts: fontsResult.rows
    });
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/queue/:deviceId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sq.*, f.font_name, f.file_size
      FROM sync_queue sq
      JOIN fonts f ON sq.font_id = f.id
      JOIN devices d ON sq.device_id = d.id
      WHERE sq.device_id = $1 AND d.user_id = $2
      ORDER BY sq.created_at ASC
    `, [req.params.deviceId, req.user.userId]);

    res.json({ queue: result.rows });
  } catch (error) {
    console.error('Error fetching sync queue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
