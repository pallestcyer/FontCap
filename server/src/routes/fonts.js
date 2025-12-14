const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { supabase } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const r2Storage = require('../services/r2Storage');

const router = express.Router();

// Use memory storage for multer since we'll upload directly to Supabase
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
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

function calculateBufferHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Get all fonts for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: fonts, error } = await supabase
      .from('fonts')
      .select(`
        *,
        devices!origin_device_id (device_name)
      `)
      .eq('user_id', req.user.userId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    // Transform to include origin_device_name
    const transformedFonts = fonts.map(font => ({
      ...font,
      origin_device_name: font.devices?.device_name || null
    }));

    res.json({ fonts: transformedFonts });
  } catch (error) {
    console.error('Error fetching fonts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload a font file
router.post('/upload', authenticateToken, upload.single('font'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No font file provided' });
    }

    const fileBuffer = req.file.buffer;
    const fileHash = calculateBufferHash(fileBuffer);

    // Check if font already exists for this user
    const { data: existing } = await supabase
      .from('fonts')
      .select('id')
      .eq('file_hash', fileHash)
      .eq('user_id', req.user.userId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Font already exists in your library' });
    }

    // Generate unique storage path
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(req.file.originalname).toLowerCase();
    const storagePath = `${req.user.userId}/${uniqueId}${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('fonts')
      .upload(storagePath, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload font file' });
    }

    // Save font metadata to database
    const fontData = {
      user_id: req.user.userId,
      font_name: req.body.fontName || req.file.originalname,
      font_family: req.body.fontFamily || '',
      storage_path: storagePath,
      file_size: req.file.size,
      file_hash: fileHash,
      font_format: ext.substring(1).toUpperCase(),
      metadata: { originalName: req.file.originalname }
    };

    const { data: font, error: insertError } = await supabase
      .from('fonts')
      .insert(fontData)
      .select()
      .single();

    if (insertError) {
      // Clean up uploaded file on error
      await supabase.storage.from('fonts').remove([storagePath]);
      throw insertError;
    }

    res.status(201).json({ font, message: 'Font uploaded successfully' });
  } catch (error) {
    console.error('Error uploading font:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk register fonts (for scanning local fonts)
router.post('/bulk-register', authenticateToken, async (req, res) => {
  try {
    const { fonts, deviceId } = req.body;

    if (!Array.isArray(fonts) || fonts.length === 0) {
      return res.status(400).json({ error: 'Fonts array is required' });
    }

    const registered = [];
    const duplicates = [];

    for (const fontData of fonts) {
      // Check if font already exists
      const { data: existing } = await supabase
        .from('fonts')
        .select('id')
        .eq('file_hash', fontData.fileHash)
        .eq('user_id', req.user.userId)
        .single();

      if (existing) {
        duplicates.push({ fontName: fontData.fontName, fontId: existing.id });

        // Associate with device
        if (deviceId) {
          await supabase
            .from('device_fonts')
            .upsert({
              device_id: deviceId,
              font_id: existing.id,
              was_present_at_scan: true,
              is_system_font: true
            }, { onConflict: 'device_id,font_id' });
        }
      } else {
        // Insert new font (without file - will be uploaded separately)
        const { data: newFont, error } = await supabase
          .from('fonts')
          .insert({
            user_id: req.user.userId,
            font_name: fontData.fontName,
            font_family: fontData.fontFamily || '',
            storage_path: fontData.storagePath || null,
            file_size: fontData.fileSize,
            file_hash: fontData.fileHash,
            font_format: fontData.fontFormat,
            origin_device_id: deviceId || null,
            metadata: fontData.metadata || {}
          })
          .select()
          .single();

        if (!error && newFont) {
          registered.push(newFont);

          // Associate with device
          if (deviceId) {
            await supabase
              .from('device_fonts')
              .upsert({
                device_id: deviceId,
                font_id: newFont.id,
                was_present_at_scan: true,
                is_system_font: true
              }, { onConflict: 'device_id,font_id' });
          }
        }
      }
    }

    // Queue sync to other devices for newly registered fonts
    let syncQueuedCount = 0;
    if (deviceId && registered.length > 0) {
      // Update device stats
      await supabase
        .from('devices')
        .update({
          last_scan: new Date().toISOString()
        })
        .eq('id', deviceId);

      // Get other active devices
      const { data: otherDevices } = await supabase
        .from('devices')
        .select('id')
        .eq('user_id', req.user.userId)
        .neq('id', deviceId)
        .eq('is_active', true);

      if (otherDevices) {
        for (const font of registered) {
          for (const device of otherDevices) {
            // Check if font already on device
            const { data: existsOnDevice } = await supabase
              .from('device_fonts')
              .select('id')
              .eq('device_id', device.id)
              .eq('font_id', font.id)
              .single();

            if (!existsOnDevice) {
              await supabase
                .from('sync_queue')
                .insert({
                  device_id: device.id,
                  font_id: font.id,
                  action: 'install',
                  status: 'pending'
                });
            }
          }
        }
        syncQueuedCount = otherDevices.length;
      }
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

// Get presigned URL for uploading a font to R2
router.post('/upload-url', authenticateToken, async (req, res) => {
  try {
    const { fileHash, fileName, fileSize, fontFormat, metadata } = req.body;

    if (!fileHash || !fileName) {
      return res.status(400).json({ error: 'fileHash and fileName are required' });
    }

    // Check if font already exists for this user
    const { data: existing } = await supabase
      .from('fonts')
      .select('id')
      .eq('file_hash', fileHash)
      .eq('user_id', req.user.userId)
      .single();

    if (existing) {
      return res.status(409).json({
        error: 'Font already exists in your library',
        fontId: existing.id,
        duplicate: true
      });
    }

    // Generate unique storage path
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(fileName).toLowerCase();
    const storagePath = `${req.user.userId}/${uniqueId}${ext}`;
    const contentType = r2Storage.getMimeType(ext);

    // Generate presigned upload URL
    const result = await r2Storage.generateUploadUrl(storagePath, contentType);

    if (!result.success) {
      console.error('Failed to generate upload URL:', result.error);
      return res.status(500).json({ error: 'Failed to generate upload URL' });
    }

    res.json({
      uploadUrl: result.uploadUrl,
      storagePath,
      contentType
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm font upload completed and save metadata
router.post('/confirm-upload', authenticateToken, async (req, res) => {
  try {
    const {
      storagePath,
      fileHash,
      fileName,
      fontName,
      fontFamily,
      fileSize,
      fontFormat,
      deviceId,
      metadata
    } = req.body;

    if (!storagePath || !fileHash) {
      return res.status(400).json({ error: 'storagePath and fileHash are required' });
    }

    // Verify file exists in R2
    const existsResult = await r2Storage.fileExists(storagePath);
    if (!existsResult.exists) {
      return res.status(400).json({ error: 'File not found in storage. Upload may have failed.' });
    }

    // Check for duplicate again (race condition protection)
    const { data: existing } = await supabase
      .from('fonts')
      .select('id')
      .eq('file_hash', fileHash)
      .eq('user_id', req.user.userId)
      .single();

    if (existing) {
      // Clean up the uploaded file since it's a duplicate
      await r2Storage.deleteFile(storagePath);
      return res.status(409).json({
        error: 'Font already exists in your library',
        fontId: existing.id,
        duplicate: true
      });
    }

    // Save font metadata to database
    const fontData = {
      user_id: req.user.userId,
      font_name: fontName || fileName,
      font_family: fontFamily || '',
      storage_path: storagePath,
      file_size: fileSize || 0,
      file_hash: fileHash,
      font_format: fontFormat || path.extname(fileName).substring(1).toUpperCase(),
      origin_device_id: deviceId || null,
      metadata: metadata || {}
    };

    const { data: font, error: insertError } = await supabase
      .from('fonts')
      .insert(fontData)
      .select()
      .single();

    if (insertError) {
      // Clean up uploaded file on database error
      await r2Storage.deleteFile(storagePath);
      throw insertError;
    }

    // Associate with device if provided
    if (deviceId) {
      await supabase
        .from('device_fonts')
        .upsert({
          device_id: deviceId,
          font_id: font.id,
          was_present_at_scan: true,
          is_system_font: true
        }, { onConflict: 'device_id,font_id' });

      // Queue sync to other devices
      const { data: otherDevices } = await supabase
        .from('devices')
        .select('id')
        .eq('user_id', req.user.userId)
        .neq('id', deviceId)
        .eq('is_active', true);

      if (otherDevices) {
        for (const device of otherDevices) {
          await supabase
            .from('sync_queue')
            .insert({
              device_id: device.id,
              font_id: font.id,
              action: 'install',
              status: 'pending'
            });
        }
      }
    }

    res.status(201).json({
      font,
      message: 'Font uploaded successfully'
    });
  } catch (error) {
    console.error('Error confirming upload:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if font hash exists
router.get('/check-hash/:hash', authenticateToken, async (req, res) => {
  try {
    const { data: font } = await supabase
      .from('fonts')
      .select('id, font_name, font_family')
      .eq('file_hash', req.params.hash)
      .eq('user_id', req.user.userId)
      .single();

    if (font) {
      res.json({ exists: true, font });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking hash:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a font
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Get font first to check ownership and get storage path
    const { data: font, error: fetchError } = await supabase
      .from('fonts')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .single();

    if (fetchError || !font) {
      return res.status(404).json({ error: 'Font not found' });
    }

    // Delete from R2 storage if there's a file
    if (font.storage_path) {
      const deleteResult = await r2Storage.deleteFile(font.storage_path);
      if (!deleteResult.success) {
        console.warn('Failed to delete file from R2:', deleteResult.error);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('fonts')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) throw deleteError;

    res.json({ message: 'Font deleted successfully' });
  } catch (error) {
    console.error('Error deleting font:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download a font file
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { data: font, error } = await supabase
      .from('fonts')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .single();

    if (error || !font) {
      return res.status(404).json({ error: 'Font not found' });
    }

    if (!font.storage_path) {
      return res.status(404).json({ error: 'Font file not available' });
    }

    // Get signed URL for download from R2
    const result = await r2Storage.generateDownloadUrl(font.storage_path);

    if (!result.success) {
      console.error('Failed to generate download URL:', result.error);
      return res.status(500).json({ error: 'Failed to generate download URL' });
    }

    res.json({
      downloadUrl: result.downloadUrl,
      fontName: font.font_name
    });
  } catch (error) {
    console.error('Error downloading font:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark font as installed on a device
router.post('/:id/installed', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const fontId = req.params.id;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Verify font belongs to user
    const { data: font } = await supabase
      .from('fonts')
      .select('id')
      .eq('id', fontId)
      .eq('user_id', req.user.userId)
      .single();

    if (!font) {
      return res.status(404).json({ error: 'Font not found' });
    }

    // Verify device belongs to user
    const { data: device } = await supabase
      .from('devices')
      .select('id')
      .eq('id', deviceId)
      .eq('user_id', req.user.userId)
      .single();

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Mark font as installed
    await supabase
      .from('device_fonts')
      .upsert({
        device_id: deviceId,
        font_id: fontId,
        was_present_at_scan: false,
        is_system_font: false,
        installation_status: 'installed',
        installed_at: new Date().toISOString()
      }, { onConflict: 'device_id,font_id' });

    // Update sync queue
    await supabase
      .from('sync_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('device_id', deviceId)
      .eq('font_id', fontId)
      .eq('status', 'pending');

    res.json({ message: 'Font marked as installed successfully' });
  } catch (error) {
    console.error('Error marking font as installed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
