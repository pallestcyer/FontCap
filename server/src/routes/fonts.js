const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/fonts');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid font file format'));
    }
  }
});

async function calculateFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*, d.device_name as origin_device_name,
        (SELECT COUNT(*) FROM device_fonts df WHERE df.font_id = f.id) as installed_on_devices
      FROM fonts f
      LEFT JOIN devices d ON f.origin_device_id = d.id
      WHERE f.user_id = $1
      ORDER BY f.uploaded_at DESC
    `, [req.user.userId]);

    res.json({ fonts: result.rows });
  } catch (error) {
    console.error('Error fetching fonts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/upload', authenticateToken, upload.single('font'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No font file provided' });
    }

    const filePath = req.file.path;
    const fileHash = await calculateFileHash(filePath);
    
    const existing = await pool.query(
      'SELECT id FROM fonts WHERE file_hash = $1 AND user_id = $2',
      [fileHash, req.user.userId]
    );
    if (existing.rows.length > 0) {
      await fs.unlink(filePath);
      return res.status(400).json({ error: 'Font already exists in your library' });
    }

    const fontData = {
      fontName: req.body.fontName || req.file.originalname,
      fontFamily: req.body.fontFamily || '',
      fileSize: req.file.size,
      fontFormat: path.extname(req.file.originalname).substring(1).toUpperCase()
    };

    const result = await pool.query(`
      INSERT INTO fonts (user_id, font_name, font_family, file_path, file_size, file_hash, font_format, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      req.user.userId,
      fontData.fontName,
      fontData.fontFamily,
      filePath,
      fontData.fileSize,
      fileHash,
      fontData.fontFormat,
      JSON.stringify({ originalName: req.file.originalname })
    ]);

    res.status(201).json({ font: result.rows[0], message: 'Font uploaded successfully' });
  } catch (error) {
    console.error('Error uploading font:', error);
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bulk-register', authenticateToken, async (req, res) => {
  try {
    const { fonts, deviceId } = req.body;

    if (!Array.isArray(fonts) || fonts.length === 0) {
      return res.status(400).json({ error: 'Fonts array is required' });
    }

    const registered = [];
    const duplicates = [];

    for (const fontData of fonts) {
      const existing = await pool.query(
        'SELECT id FROM fonts WHERE file_hash = $1 AND user_id = $2',
        [fontData.fileHash, req.user.userId]
      );
      
      if (existing.rows.length > 0) {
        duplicates.push({ fontName: fontData.fontName, fontId: existing.rows[0].id });
        
        if (deviceId) {
          await pool.query(`
            INSERT INTO device_fonts (device_id, font_id, was_present_at_scan, is_system_font)
            VALUES ($1, $2, true, true)
            ON CONFLICT (device_id, font_id) DO NOTHING
          `, [deviceId, existing.rows[0].id]);
        }
      } else {
        const result = await pool.query(`
          INSERT INTO fonts (user_id, font_name, font_family, file_path, file_size, file_hash, font_format, origin_device_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [
          req.user.userId,
          fontData.fontName,
          fontData.fontFamily || '',
          fontData.filePath,
          fontData.fileSize,
          fontData.fileHash,
          fontData.fontFormat,
          deviceId || null,
          JSON.stringify(fontData.metadata || {})
        ]);
        
        registered.push(result.rows[0]);

        if (deviceId) {
          await pool.query(`
            INSERT INTO device_fonts (device_id, font_id, was_present_at_scan, is_system_font)
            VALUES ($1, $2, true, true)
            ON CONFLICT (device_id, font_id) DO NOTHING
          `, [deviceId, result.rows[0].id]);
        }
      }
    }

    let syncQueuedCount = 0;
    
    if (deviceId) {
      await pool.query(`
        UPDATE devices 
        SET fonts_contributed_count = (SELECT COUNT(*) FROM fonts WHERE origin_device_id = $1),
            last_scan = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [deviceId]);
      
      const otherDevices = await pool.query(
        'SELECT id FROM devices WHERE user_id = $1 AND id != $2 AND is_active = true',
        [req.user.userId, deviceId]
      );
      
      for (const font of registered) {
        for (const device of otherDevices.rows) {
          await pool.query(`
            INSERT INTO sync_queue (device_id, font_id, action, status)
            VALUES ($1, $2, 'install', 'pending')
          `, [device.id, font.id]);
        }
      }
      
      syncQueuedCount = otherDevices.rows.length;
    }

    res.json({
      message: 'Fonts registered successfully',
      registered: registered.length,
      duplicates: duplicates.length,
      fonts: registered,
      duplicateList: duplicates,
      syncQueuedTo: syncQueuedCount
    });
  } catch (error) {
    console.error('Error bulk registering fonts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/check-hash/:hash', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, font_name, font_family FROM fonts WHERE file_hash = $1 AND user_id = $2',
      [req.params.hash, req.user.userId]
    );

    if (result.rows.length > 0) {
      res.json({ exists: true, font: result.rows[0] });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking hash:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/duplicates', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fd.*, 
        f1.font_name as font_1_name, f1.file_size as font_1_size,
        f2.font_name as font_2_name, f2.file_size as font_2_size
      FROM font_duplicates fd
      JOIN fonts f1 ON fd.font_id_1 = f1.id
      JOIN fonts f2 ON fd.font_id_2 = f2.id
      WHERE f1.user_id = $1 AND fd.resolution_status = 'pending'
    `, [req.user.userId]);

    res.json({ duplicates: result.rows });
  } catch (error) {
    console.error('Error fetching duplicates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const fontResult = await pool.query(
      'SELECT * FROM fonts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (fontResult.rows.length === 0) {
      return res.status(404).json({ error: 'Font not found' });
    }

    const font = fontResult.rows[0];
    
    await pool.query('DELETE FROM fonts WHERE id = $1', [req.params.id]);
    
    if (font.file_path) {
      await fs.unlink(font.file_path).catch(() => {});
    }

    res.json({ message: 'Font deleted successfully' });
  } catch (error) {
    console.error('Error deleting font:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM fonts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Font not found' });
    }

    const font = result.rows[0];
    res.download(font.file_path, font.font_name);
  } catch (error) {
    console.error('Error downloading font:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
