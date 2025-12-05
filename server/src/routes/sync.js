const express = require('express');
const { supabase } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/status', authenticateToken, async (req, res) => {
  try {
    const deviceId = req.query.deviceId;

    // Get total fonts count
    const { count: totalFonts } = await supabase
      .from('fonts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.userId);

    // Get device fonts count
    let deviceFonts = 0;
    if (deviceId) {
      const { count } = await supabase
        .from('device_fonts')
        .select('*', { count: 'exact', head: true })
        .eq('device_id', deviceId);
      deviceFonts = count || 0;
    }

    // Get pending sync count
    const { count: pendingSync } = await supabase
      .from('sync_queue')
      .select(`
        *,
        devices!inner (user_id)
      `, { count: 'exact', head: true })
      .eq('devices.user_id', req.user.userId)
      .eq('status', 'pending');

    res.json({
      totalFonts: totalFonts || 0,
      deviceFonts,
      pendingSync: pendingSync || 0,
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

    // Verify device belongs to user
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id')
      .eq('id', deviceId)
      .eq('user_id', req.user.userId)
      .single();

    if (deviceError || !device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Update device last sync time
    await supabase
      .from('devices')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', deviceId);

    // Get fonts that need to be synced to this device
    // (fonts that exist for user but aren't on this device yet)
    const { data: userFonts } = await supabase
      .from('fonts')
      .select('id')
      .eq('user_id', req.user.userId);

    const { data: deviceFontIds } = await supabase
      .from('device_fonts')
      .select('font_id')
      .eq('device_id', deviceId);

    const deviceFontIdSet = new Set((deviceFontIds || []).map(df => df.font_id));
    const fontsToSyncIds = (userFonts || [])
      .filter(f => !deviceFontIdSet.has(f.id))
      .map(f => f.id);

    // Get full font details for fonts to sync
    let fontsToSync = [];
    if (fontsToSyncIds.length > 0) {
      const { data: fonts } = await supabase
        .from('fonts')
        .select('*')
        .in('id', fontsToSyncIds);
      fontsToSync = fonts || [];
    }

    res.json({
      message: 'Sync triggered successfully',
      fontsToSync: fontsToSync.length,
      fonts: fontsToSync
    });
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/queue/:deviceId', authenticateToken, async (req, res) => {
  try {
    // Verify device belongs to user
    const { data: device } = await supabase
      .from('devices')
      .select('id')
      .eq('id', req.params.deviceId)
      .eq('user_id', req.user.userId)
      .single();

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const { data: queue, error } = await supabase
      .from('sync_queue')
      .select(`
        *,
        fonts (font_name, file_size)
      `)
      .eq('device_id', req.params.deviceId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Flatten the response
    const queueItems = (queue || []).map(item => ({
      ...item,
      font_name: item.fonts?.font_name,
      file_size: item.fonts?.file_size
    }));

    res.json({ queue: queueItems });
  } catch (error) {
    console.error('Error fetching sync queue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
