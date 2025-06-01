-- Fix RLS policies for azure_sync_logs table to allow admin access
-- This migration ensures that admin users can access Azure sync logs

-- First, check if the azure_sync_logs table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS azure_sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sync_status TEXT,
    sync_started_at TIMESTAMP WITH TIME ZONE,
    sync_completed_at TIMESTAMP WITH TIME ZONE,
    users_processed INTEGER,
    users_created INTEGER,
    users_updated INTEGER,
    users_deactivated INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on azure_sync_logs table
ALTER TABLE azure_sync_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can view all azure sync logs" ON azure_sync_logs;
DROP POLICY IF EXISTS "Admin users can insert azure sync logs" ON azure_sync_logs;
DROP POLICY IF EXISTS "Admin users can update azure sync logs" ON azure_sync_logs;

-- Create policy to allow admin users to view all azure sync logs
CREATE POLICY "Admin users can view all azure sync logs"
ON azure_sync_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
  )
);

-- Create policy to allow admin users to insert azure sync logs
CREATE POLICY "Admin users can insert azure sync logs"
ON azure_sync_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
  )
);

-- Create policy to allow admin users to update azure sync logs
CREATE POLICY "Admin users can update azure sync logs"
ON azure_sync_logs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
  )
);

-- Create policy to allow service role (edge functions) to manage azure sync logs
CREATE POLICY "Service role can manage azure sync logs"
ON azure_sync_logs FOR ALL
USING (auth.role() = 'service_role');

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON azure_sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON azure_sync_logs TO service_role;

-- Note: Realtime is already enabled for all tables via FOR ALL TABLES publication
