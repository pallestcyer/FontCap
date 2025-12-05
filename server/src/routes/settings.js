const express = require('express');
const { supabase } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user.userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No settings found, create default
      const { data: newSettings, error: createError } = await supabase
        .from('user_settings')
        .insert({
          user_id: req.user.userId,
          auto_sync: true,
          scan_frequency: 'daily',
          duplicate_handling: 'ask'
        })
        .select()
        .single();

      if (createError) throw createError;
      return res.json({ settings: newSettings });
    }

    if (error) throw error;

    res.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user settings
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { autoSync, scanFrequency, duplicateHandling } = req.body;

    // Check if settings exist
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    let result;
    if (!existing) {
      // Create new settings
      const { data, error } = await supabase
        .from('user_settings')
        .insert({
          user_id: req.user.userId,
          auto_sync: autoSync,
          scan_frequency: scanFrequency,
          duplicate_handling: duplicateHandling
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Update existing settings
      const updates = { updated_at: new Date().toISOString() };
      if (autoSync !== undefined) updates.auto_sync = autoSync;
      if (scanFrequency !== undefined) updates.scan_frequency = scanFrequency;
      if (duplicateHandling !== undefined) updates.duplicate_handling = duplicateHandling;

      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', req.user.userId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    res.json({ settings: result, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get storage usage
router.get('/storage', authenticateToken, async (req, res) => {
  try {
    // Get total file size from user's fonts
    const { data: fonts } = await supabase
      .from('fonts')
      .select('file_size')
      .eq('user_id', req.user.userId);

    const usedStorage = (fonts || []).reduce((sum, f) => sum + (f.file_size || 0), 0);

    // Get storage limit from users table
    const { data: user } = await supabase
      .from('users')
      .select('storage_limit')
      .eq('id', req.user.userId)
      .single();

    const storageLimit = user?.storage_limit || 5368709120; // 5GB default

    res.json({
      usedStorage,
      storageLimit,
      usedPercentage: (usedStorage / storageLimit) * 100
    });
  } catch (error) {
    console.error('Error fetching storage info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
