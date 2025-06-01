-- Fix RLS policy for azure_sync_logs table to allow admin access

-- Ensure the azure_sync_logs table exists with proper structure
CREATE TABLE IF NOT EXISTS azure_sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sync_started_at TIMESTAMP WITH TIME ZONE,
    sync_completed_at TIMESTAMP WITH TIME ZONE,
    sync_status TEXT,
    users_processed INTEGER,
    users_created INTEGER,
    users_updated INTEGER,
    users_deactivated INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the table
ALTER TABLE azure_sync_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can view azure sync logs" ON azure_sync_logs;
DROP POLICY IF EXISTS "admin_access_azure_sync_logs" ON azure_sync_logs;

-- Create a policy that allows admin users to SELECT from azure_sync_logs
-- Admin users are identified by their email addresses from JWT token
CREATE POLICY "Admin users can view azure sync logs"
ON azure_sync_logs
FOR SELECT
USING (
  auth.jwt() ->> 'email' IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
);

-- Grant necessary permissions
GRANT SELECT ON azure_sync_logs TO authenticated;
GRANT ALL ON azure_sync_logs TO service_role;

-- Note: Realtime is already enabled for all tables via FOR ALL TABLES publication