const express = require('express');
const { supabase } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: devices, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!devices || devices.length === 0) {
      return res.json({ devices: [] });
    }

    // Get all font counts in a single aggregated query instead of N+1 queries
    const deviceIds = devices.map(d => d.id);
    const { data: fontCounts, error: countError } = await supabase
      .from('device_fonts')
      .select('device_id')
      .in('device_id', deviceIds);

    if (countError) throw countError;

    // Count fonts per device from the result
    const countMap = {};
    (fontCounts || []).forEach(df => {
      countMap[df.device_id] = (countMap[df.device_id] || 0) + 1;
    });

    // Merge counts with devices
    const devicesWithCounts = devices.map(device => ({
      ...device,
      fonts_installed_count: countMap[device.id] || 0
    }));

    res.json({ devices: devicesWithCounts });
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

    // Check if device exists (don't use .single() to avoid error on no match)
    const { data: existingDevices } = await supabase
      .from('devices')
      .select('*')
      .eq('device_id', deviceId);

    const existing = existingDevices && existingDevices.length > 0 ? existingDevices[0] : null;

    if (existing) {
      // Update existing device and associate with current user
      const { data: updated, error } = await supabase
        .from('devices')
        .update({
          user_id: req.user.userId,
          device_name: deviceName,
          os_type: osType,
          os_version: osVersion,
          is_active: true,
          last_sync: new Date().toISOString()
        })
        .eq('device_id', deviceId)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        message: 'Device updated successfully',
        device: updated,
        isNewDevice: false
      });
    }

    // Register new device
    const { data: newDevice, error } = await supabase
      .from('devices')
      .insert({
        user_id: req.user.userId,
        device_name: deviceName,
        device_id: deviceId,
        os_type: osType,
        os_version: osVersion
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Device registered successfully',
      device: newDevice,
      isNewDevice: true
    });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { deviceName, lastScan, syncEnabled } = req.body;

    const updates = {
      last_sync: new Date().toISOString()
    };
    if (deviceName !== undefined) updates.device_name = deviceName;
    if (lastScan !== undefined) updates.last_scan = lastScan;
    if (syncEnabled !== undefined) updates.sync_enabled = syncEnabled;

    const { data: device, error } = await supabase
      .from('devices')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error || !device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ device });
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: device, error } = await supabase
      .from('devices')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error || !device) {
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
    const { data: deviceFonts, error } = await supabase
      .from('device_fonts')
      .select(`
        installation_status,
        installed_at,
        is_system_font,
        fonts (*)
      `)
      .eq('device_id', req.params.id);

    if (error) throw error;

    // Flatten the response
    const fonts = deviceFonts.map(df => ({
      ...df.fonts,
      installation_status: df.installation_status,
      installed_at: df.installed_at,
      is_system_font: df.is_system_font
    })).filter(f => f.user_id === req.user.userId);

    res.json({ fonts });
  } catch (error) {
    console.error('Error fetching device fonts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
