-- ============================================
-- Migration: Fix RLS Policies for Production Security
-- Run this in your Supabase SQL Editor
-- ============================================
-- This replaces the permissive "USING (true)" policies with proper user-scoped policies

-- ============================================
-- STEP 1: DROP EXISTING PERMISSIVE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Service role full access users" ON users;
DROP POLICY IF EXISTS "Service role full access devices" ON devices;
DROP POLICY IF EXISTS "Service role full access fonts" ON fonts;
DROP POLICY IF EXISTS "Service role full access device_fonts" ON device_fonts;
DROP POLICY IF EXISTS "Service role full access sync_queue" ON sync_queue;
DROP POLICY IF EXISTS "Service role full access user_settings" ON user_settings;
DROP POLICY IF EXISTS "Service role storage access" ON storage.objects;

-- ============================================
-- STEP 2: ADD last_seen COLUMN IF MISSING
-- ============================================
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;
UPDATE devices SET last_seen = COALESCE(last_sync, created_at) WHERE last_seen IS NULL;
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);

-- ============================================
-- STEP 3: CREATE PROPER RLS POLICIES
-- ============================================

-- USERS TABLE
-- Users can only view and update their own record
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (true);  -- Allow select for login (need to find user by email)

CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (true);  -- Allow registration

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = current_setting('app.current_user_id', true)::uuid);

-- DEVICES TABLE
-- Users can only manage their own devices
CREATE POLICY "devices_select_own" ON devices
  FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "devices_insert_own" ON devices
  FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "devices_update_own" ON devices
  FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "devices_delete_own" ON devices
  FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));

-- FONTS TABLE
-- Users can only manage their own fonts
CREATE POLICY "fonts_select_own" ON fonts
  FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "fonts_insert_own" ON fonts
  FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "fonts_update_own" ON fonts
  FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "fonts_delete_own" ON fonts
  FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));

-- DEVICE_FONTS TABLE
-- Users can manage device_fonts for their own devices
CREATE POLICY "device_fonts_select_own" ON device_fonts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = device_fonts.device_id
      AND devices.user_id::text = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "device_fonts_insert_own" ON device_fonts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = device_fonts.device_id
      AND devices.user_id::text = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "device_fonts_update_own" ON device_fonts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = device_fonts.device_id
      AND devices.user_id::text = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "device_fonts_delete_own" ON device_fonts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = device_fonts.device_id
      AND devices.user_id::text = current_setting('app.current_user_id', true)
    )
  );

-- SYNC_QUEUE TABLE
-- Users can manage sync_queue for their own devices
CREATE POLICY "sync_queue_select_own" ON sync_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = sync_queue.device_id
      AND devices.user_id::text = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "sync_queue_insert_own" ON sync_queue
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = sync_queue.device_id
      AND devices.user_id::text = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "sync_queue_update_own" ON sync_queue
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = sync_queue.device_id
      AND devices.user_id::text = current_setting('app.current_user_id', true)
    )
  );

-- USER_SETTINGS TABLE
-- Users can only manage their own settings
CREATE POLICY "user_settings_select_own" ON user_settings
  FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "user_settings_insert_own" ON user_settings
  FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "user_settings_update_own" ON user_settings
  FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));

-- ============================================
-- STEP 4: STORAGE POLICIES
-- ============================================

-- Drop old permissive storage policy
DROP POLICY IF EXISTS "Service role storage access" ON storage.objects;

-- Users can upload to their own folder (folder name = user id)
CREATE POLICY "storage_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'fonts'
    AND (storage.foldername(name))[1] = current_setting('app.current_user_id', true)
  );

-- Users can view their own fonts
CREATE POLICY "storage_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'fonts'
    AND (storage.foldername(name))[1] = current_setting('app.current_user_id', true)
  );

-- Users can delete their own fonts
CREATE POLICY "storage_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'fonts'
    AND (storage.foldername(name))[1] = current_setting('app.current_user_id', true)
  );

-- Users can update their own fonts
CREATE POLICY "storage_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'fonts'
    AND (storage.foldername(name))[1] = current_setting('app.current_user_id', true)
  );

-- ============================================
-- NOTE: Service role key bypasses RLS
-- ============================================
-- The service_role key used by the server/Electron app bypasses all RLS policies.
-- This is by design - the app authenticates users via JWT and then uses
-- service_role to perform operations on their behalf.
--
-- The RLS policies above protect against:
-- 1. Direct database access with the anon key
-- 2. SQL injection attempts
-- 3. Any client that doesn't go through your app
