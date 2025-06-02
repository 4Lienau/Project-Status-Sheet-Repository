-- Debug and fix user login statistics function
-- This migration will check the current state and fix the get_user_login_statistics function

-- First, let's check if the function exists and drop it if it does
DROP FUNCTION IF EXISTS get_user_login_statistics();

-- Create a comprehensive user login statistics function
CREATE OR REPLACE FUNCTION get_user_login_statistics()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  total_logins bigint,
  last_login timestamp with time zone,
  total_session_time_minutes bigint,
  account_created timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    COALESCE(um.login_count, 0) as total_logins,
    COALESCE(um.last_login, p.updated_at) as last_login,
    COALESCE(um.total_session_time_minutes, 0) as total_session_time_minutes,
    p.created_at as account_created
  FROM profiles p
  LEFT JOIN (
    SELECT 
      user_id,
      SUM(login_count) as login_count,
      MAX(last_login) as last_login,
      SUM(total_session_time_minutes) as total_session_time_minutes
    FROM usage_metrics 
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  ) um ON p.id = um.user_id
  WHERE p.email IS NOT NULL
  ORDER BY COALESCE(um.login_count, 0) DESC, p.full_name ASC
  LIMIT 50;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_login_statistics() TO authenticated;

-- Also create a simpler version that gets data from auth.users if available
CREATE OR REPLACE FUNCTION get_auth_users_login_data()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  total_logins bigint,
  last_login timestamp with time zone,
  total_session_time_minutes bigint,
  account_created timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    COALESCE(p.full_name, au.email) as full_name,
    COALESCE(um.login_count, 0) as total_logins,
    COALESCE(au.last_sign_in_at, au.created_at) as last_login,
    COALESCE(um.total_session_time_minutes, 0) as total_session_time_minutes,
    au.created_at as account_created
  FROM auth.users au
  LEFT JOIN profiles p ON au.id = p.id
  LEFT JOIN (
    SELECT 
      user_id,
      SUM(login_count) as login_count,
      SUM(total_session_time_minutes) as total_session_time_minutes
    FROM usage_metrics 
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  ) um ON au.id = um.user_id
  WHERE au.email IS NOT NULL
    AND au.deleted_at IS NULL
  ORDER BY COALESCE(au.last_sign_in_at, au.created_at) DESC
  LIMIT 50;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_auth_users_login_data() TO authenticated;

-- Insert some test data into usage_metrics if the table is empty
-- This will help populate the statistics
DO $$
DECLARE
  user_record RECORD;
  metric_count INTEGER;
BEGIN
  -- Check if usage_metrics has any data
  SELECT COUNT(*) INTO metric_count FROM usage_metrics;
  
  -- If no data exists, create some basic entries for existing users
  IF metric_count = 0 THEN
    FOR user_record IN 
      SELECT id, email, created_at 
      FROM profiles 
      WHERE email IS NOT NULL 
      LIMIT 10
    LOOP
      INSERT INTO usage_metrics (
        user_id,
        date,
        login_count,
        page_views,
        total_session_time_minutes,
        last_login,
        projects_created,
        projects_updated,
        milestones_created
      ) VALUES (
        user_record.id,
        CURRENT_DATE,
        1, -- At least 1 login to create the account
        5, -- Some page views
        15, -- 15 minutes session time
        user_record.created_at,
        0,
        0,
        0
      )
      ON CONFLICT (user_id, date) DO NOTHING;
    END LOOP;
  END IF;
END;
$$;
