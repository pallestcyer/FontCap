const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM device_fonts df WHERE df.device_id = d.id) as fonts_installed_count
      FROM devices d
      WHERE d.user_id = $1
      ORDER BY d.created_at DESC
    `, [req.user.userId]);

    res.json({ devices: result.rows });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { deviceName, deviceId, osType, osVersion } = req.body;

    if (!deviceName || !deviceId) {
      return res.status(400).json({ error: 'Device name and ID are required' });
    }

    const existing = await pool.query('SELECT id FROM devices WHERE device_id = $1', [deviceId]);
    
    if (existing.rows.length > 0) {
      await pool.query(`
        UPDATE devices 
        SET device_name = $1, os_type = $2, os_version = $3, is_active = true, last_sync = CURRENT_TIMESTAMP
        WHERE device_id = $4
        RETURNING *
      `, [deviceName, osType, osVersion, deviceId]);
      
      return res.json({ 
        message: 'Device updated successfully',
        device: existing.rows[0],
        isNewDevice: false
      });
    }

    const result = await pool.query(`
      INSERT INTO devices (user_id, device_name, device_id, os_type, os_version)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.userId, deviceName, deviceId, osType, osVersion]);

    res.status(201).json({
      message: 'Device registered successfully',
      device: result.rows[0],
      isNewDevice: true
    });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { deviceName, lastScan } = req.body;

    const result = await pool.query(`
      UPDATE devices 
      SET device_name = COALESCE($1, device_name), 
          last_scan = COALESCE($2, last_scan),
          last_sync = CURRENT_TIMESTAMP
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `, [deviceName, lastScan, req.params.id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ device: result.rows[0] });
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM devices WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ message: 'Device removed successfully' });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/fonts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*, df.installation_status, df.installed_at, df.is_system_font
      FROM fonts f
      JOIN device_fonts df ON f.id = df.font_id
      WHERE df.device_id = $1 AND f.user_id = $2
      ORDER BY df.installed_at DESC
    `, [req.params.id, req.user.userId]);

    res.json({ fonts: result.rows });
  } catch (error) {
    console.error('Error fetching device fonts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
