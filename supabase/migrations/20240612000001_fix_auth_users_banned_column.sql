-- Fix the auth users function to remove the banned column reference
CREATE OR REPLACE FUNCTION get_auth_users_data()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the user is an admin (you can customize this check)
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
  ) THEN
    RETURN QUERY
    SELECT 
      au.id,
      au.email,
      au.created_at,
      au.last_sign_in_at
    FROM auth.users au
    JOIN profiles p ON p.id = au.id;
  ELSE
    RAISE EXCEPTION 'Not authorized';
  END IF;
END;
$$;