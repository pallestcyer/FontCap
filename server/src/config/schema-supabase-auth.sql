-- ============================================
-- FontCap Database Schema with Supabase Auth
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: DROP OLD TABLES (if migrating)
-- ============================================
-- Uncomment these if you need to start fresh:
-- DROP TABLE IF EXISTS sync_queue CASCADE;
-- DROP TABLE IF EXISTS device_fonts CASCADE;
-- DROP TABLE IF EXISTS fonts CASCADE;
-- DROP TABLE IF EXISTS devices CASCADE;
-- DROP TABLE IF EXISTS user_settings CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- STEP 2: CREATE STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name)
VALUES ('fonts', 'fonts')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 3: CREATE TABLES
-- ============================================

-- Profiles table (extends auth.users with app-specific data)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_limit BIGINT DEFAULT 5368709120,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_sync BOOLEAN DEFAULT true,
  scan_frequency VARCHAR(20) DEFAULT 'daily',
  duplicate_handling VARCHAR(20) DEFAULT 'ask',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 4: CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_fonts_user_id ON fonts(user_id);
CREATE INDEX IF NOT EXISTS idx_fonts_file_hash ON fonts(file_hash);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_device_fonts_device_id ON device_fonts(device_id);
CREATE INDEX IF NOT EXISTS idx_device_fonts_font_id ON device_fonts(font_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_device_id ON sync_queue(device_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fonts_user_hash ON fonts(user_id, file_hash);

-- ============================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fonts ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_fonts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: CREATE RLS POLICIES
-- ============================================

-- Profiles policies
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Devices policies
CREATE POLICY "Users can view own devices"
ON devices FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices"
ON devices FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
ON devices FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices"
ON devices FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Fonts policies
CREATE POLICY "Users can view own fonts"
ON fonts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fonts"
ON fonts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fonts"
ON fonts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fonts"
ON fonts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Device fonts policies (users can manage device_fonts for their own devices)
CREATE POLICY "Users can view own device fonts"
ON device_fonts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM devices
    WHERE devices.id = device_fonts.device_id
    AND devices.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own device fonts"
ON device_fonts FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM devices
    WHERE devices.id = device_fonts.device_id
    AND devices.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own device fonts"
ON device_fonts FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM devices
    WHERE devices.id = device_fonts.device_id
    AND devices.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own device fonts"
ON device_fonts FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM devices
    WHERE devices.id = device_fonts.device_id
    AND devices.user_id = auth.uid()
  )
);

-- Sync queue policies
CREATE POLICY "Users can view own sync queue"
ON sync_queue FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM devices
    WHERE devices.id = sync_queue.device_id
    AND devices.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own sync queue"
ON sync_queue FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM devices
    WHERE devices.id = sync_queue.device_id
    AND devices.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own sync queue"
ON sync_queue FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM devices
    WHERE devices.id = sync_queue.device_id
    AND devices.user_id = auth.uid()
  )
);

-- User settings policies
CREATE POLICY "Users can view own settings"
ON user_settings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
ON user_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
ON user_settings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- STEP 7: STORAGE POLICIES
-- ============================================

-- Users can upload fonts to their own folder (folder name = user id)
CREATE POLICY "Users can upload own fonts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fonts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own fonts
CREATE POLICY "Users can view own font files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'fonts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own fonts
CREATE POLICY "Users can delete own font files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'fonts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own fonts
CREATE POLICY "Users can update own font files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'fonts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- STEP 8: AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
