-- Create a function to get auth users data
-- This function requires supabase_admin role to execute

CREATE OR REPLACE FUNCTION get_auth_users_data()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  banned boolean
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only allow admin users to execute this function
  IF NOT (SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
  )) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Return user data from auth.users table
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    au.banned
  FROM auth.users au;
END;
$$;

-- Set appropriate permissions
REVOKE ALL ON FUNCTION get_auth_users_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_auth_users_data() TO authenticated;
