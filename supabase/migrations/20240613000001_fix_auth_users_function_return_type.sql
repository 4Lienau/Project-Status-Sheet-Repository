-- First drop the existing function
DROP FUNCTION IF EXISTS get_auth_users_data();

-- Then recreate it with the correct return type
CREATE OR REPLACE FUNCTION get_auth_users_data()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user has admin access
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email IN ('4lienau@gmail.com', 'chrisl@re-wa.org') AND id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT 
    au.id::uuid,
    au.email::text,
    au.created_at::timestamptz,
    au.last_sign_in_at::timestamptz
  FROM auth.users au;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_auth_users_data() TO authenticated;
