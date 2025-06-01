-- Fix sync_configurations table RLS issues
-- This table is admin-only, so we disable RLS for simplicity

-- Disable RLS on sync_configurations table
ALTER TABLE sync_configurations DISABLE ROW LEVEL SECURITY;

-- Ensure the table has proper permissions
GRANT ALL ON sync_configurations TO authenticated;
GRANT ALL ON sync_configurations TO service_role;

-- Add realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE sync_configurations;
