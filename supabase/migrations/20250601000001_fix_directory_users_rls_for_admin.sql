-- Fix RLS policy for directory_users table to allow admin access
-- This migration creates a policy that allows SELECT access for admin users

-- First, ensure RLS is enabled on directory_users table
ALTER TABLE directory_users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin access to directory users" ON directory_users;
DROP POLICY IF EXISTS "Allow admin access to directory users" ON directory_users;
DROP POLICY IF EXISTS "Public access" ON directory_users;

-- Create a policy that allows admin users to read directory_users
-- Admin users are identified by their email being in a predefined list
CREATE POLICY "Admin access to directory users"
ON directory_users FOR SELECT
USING (
  auth.jwt() ->> 'email' IN (
    '4lienau@gmail.com',
    'chrisl@re-wa.org'
  )
);

-- Note: Realtime is already enabled for all tables via FOR ALL TABLES publication
