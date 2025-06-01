-- Fix sync_configurations RLS policies and ensure default record exists

-- First, ensure the sync_configurations table exists
CREATE TABLE IF NOT EXISTS sync_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL,
  frequency_hours INTEGER NOT NULL DEFAULT 6,
  is_enabled BOOLEAN DEFAULT false,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read sync configurations" ON sync_configurations;
DROP POLICY IF EXISTS "Allow authenticated users to update sync configurations" ON sync_configurations;
DROP POLICY IF EXISTS "Allow authenticated users to insert sync configurations" ON sync_configurations;

-- Create comprehensive RLS policies
CREATE POLICY "Allow authenticated users to read sync configurations"
ON sync_configurations FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update sync configurations"
ON sync_configurations FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert sync configurations"
ON sync_configurations FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE sync_configurations ENABLE ROW LEVEL SECURITY;

-- Insert default Azure AD sync configuration if it doesn't exist
INSERT INTO sync_configurations (
  sync_type,
  frequency_hours,
  is_enabled,
  created_at,
  updated_at
)
SELECT 
  'azure_ad_sync',
  6,
  false,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM sync_configurations WHERE sync_type = 'azure_ad_sync'
);

-- Note: Realtime is automatically enabled for all tables when publication is FOR ALL TABLES
