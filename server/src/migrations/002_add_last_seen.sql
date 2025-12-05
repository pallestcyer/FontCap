-- Migration: Add last_seen column to devices table for heartbeat tracking
-- Run this in your Supabase SQL Editor

-- Add last_seen column to track device online status
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- Update existing devices to have a last_seen value based on last_sync
UPDATE devices SET last_seen = COALESCE(last_sync, created_at) WHERE last_seen IS NULL;

-- Create index for efficient online status queries
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);
