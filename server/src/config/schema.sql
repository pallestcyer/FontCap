-- ============================================
-- DEPRECATED: Use schema-supabase-auth.sql instead
-- ============================================
-- This schema uses custom auth. For production, use:
-- schema-supabase-auth.sql (uses Supabase Auth - recommended)
-- ============================================

-- FontCap Database Schema for Supabase (Legacy)
-- Run this ENTIRE script in your Supabase SQL Editor

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('fonts', 'fonts', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DATABASE TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  storage_limit BIGINT DEFAULT 5368709120,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_name VARCHAR(255) NOT NULL,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  os_type VARCHAR(50),
  os_version VARCHAR(100),
  last_sync TIMESTAMP WITH TIME ZONE,
  last_scan TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT true,
  fonts_contributed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fonts table
CREATE TABLE IF NOT EXISTS fonts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  font_name VARCHAR(255) NOT NULL,
  font_family VARCHAR(255),
  storage_path VARCHAR(500),
  file_size BIGINT,
  file_hash VARCHAR(64) NOT NULL,
  font_format VARCHAR(20),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  origin_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  version_info VARCHAR(100)
);

-- Device fonts (tracks which fonts are installed on which devices)
CREATE TABLE IF NOT EXISTS device_fonts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  font_id UUID REFERENCES fonts(id) ON DELETE CASCADE,
  installation_status VARCHAR(20) DEFAULT 'installed',
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_checked TIMESTAMP WITH TIME ZONE,
  was_present_at_scan BOOLEAN DEFAULT true,
  is_system_font BOOLEAN DEFAULT false,
  UNIQUE(device_id, font_id)
);

-- Sync queue
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  font_id UUID REFERENCES fonts(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  auto_sync BOOLEAN DEFAULT true,
  scan_frequency VARCHAR(20) DEFAULT 'daily',
  duplicate_handling VARCHAR(20) DEFAULT 'ask',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_fonts_user_id ON fonts(user_id);
CREATE INDEX IF NOT EXISTS idx_fonts_file_hash ON fonts(file_hash);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_device_fonts_device_id ON device_fonts(device_id);
CREATE INDEX IF NOT EXISTS idx_device_fonts_font_id ON device_fonts(font_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_device_id ON sync_queue(device_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fonts_user_hash ON fonts(user_id, file_hash);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fonts ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_fonts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policies (service_role bypasses these, but good to have)
CREATE POLICY "Service role full access users" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access devices" ON devices FOR ALL USING (true);
CREATE POLICY "Service role full access fonts" ON fonts FOR ALL USING (true);
CREATE POLICY "Service role full access device_fonts" ON device_fonts FOR ALL USING (true);
CREATE POLICY "Service role full access sync_queue" ON sync_queue FOR ALL USING (true);
CREATE POLICY "Service role full access user_settings" ON user_settings FOR ALL USING (true);

-- ============================================
-- STORAGE POLICIES
-- ============================================
CREATE POLICY "Service role storage access" ON storage.objects
FOR ALL USING (bucket_id = 'fonts');
