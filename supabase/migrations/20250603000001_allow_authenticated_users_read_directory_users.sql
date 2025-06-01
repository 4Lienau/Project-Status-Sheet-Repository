-- Allow all authenticated users to read the directory_users table
-- This enables user selection for milestone and task assignments

-- Drop any existing restrictive SELECT policies on directory_users
DROP POLICY IF EXISTS "Admin users can view directory users" ON directory_users;
DROP POLICY IF EXISTS "Only admins can view directory users" ON directory_users;
DROP POLICY IF EXISTS "Admin access only" ON directory_users;

-- Ensure RLS is enabled on the directory_users table
ALTER TABLE directory_users ENABLE ROW LEVEL SECURITY;

-- Create a new policy that allows all authenticated users to read directory_users
CREATE POLICY "Authenticated users can read directory users"
ON directory_users FOR SELECT
USING (auth.uid() IS NOT NULL);
