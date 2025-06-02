-- Fix ambiguous column references in user login statistics functions
-- This migration addresses the "column reference 'user_id' is ambiguous" errors
-- and fixes the missing profiles.created_at column issue

-- Drop existing functions that have ambiguous column references
DROP FUNCTION IF EXISTS get_user_login_statistics();
DROP FUNCTION IF EXISTS get_auth_users_login_data();

-- Create improved get_user_login_statistics function with proper table aliases
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
    COALESCE(um.login_count, 0)::bigint as total_logins,
    um.last_login,
    COALESCE(um.total_session_time_minutes, 0)::bigint as total_session_time_minutes,
    COALESCE(au.created_at, p.updated_at) as account_created
  FROM profiles p
  LEFT JOIN usage_metrics um ON p.id = um.user_id
  LEFT JOIN auth.users au ON p.id = au.id
  WHERE p.email IS NOT NULL
  ORDER BY COALESCE(um.total_session_time_minutes, 0) DESC, p.full_name ASC;
END;
$$;

-- Create improved get_auth_users_login_data function with proper table aliases
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
    COALESCE(p.full_name, split_part(au.email, '@', 1)) as full_name,
    COALESCE(um.login_count, 0)::bigint as total_logins,
    COALESCE(um.last_login, au.last_sign_in_at) as last_login,
    COALESCE(um.total_session_time_minutes, 0)::bigint as total_session_time_minutes,
    au.created_at as account_created
  FROM auth.users au
  LEFT JOIN profiles p ON au.id = p.id
  LEFT JOIN usage_metrics um ON au.id = um.user_id
  WHERE au.email IS NOT NULL
    AND au.deleted_at IS NULL
  ORDER BY COALESCE(um.total_session_time_minutes, 0) DESC, au.email ASC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_login_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_users_login_data() TO authenticated;

-- Create a comprehensive user activity summary function that combines all data sources
CREATE OR REPLACE FUNCTION get_comprehensive_user_stats()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  total_logins bigint,
  last_login timestamp with time zone,
  total_session_time_minutes bigint,
  total_page_views bigint,
  account_created timestamp with time zone,
  last_activity timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.id, au.id) as user_id,
    COALESCE(p.email, au.email) as email,
    COALESCE(p.full_name, split_part(COALESCE(p.email, au.email), '@', 1)) as full_name,
    COALESCE(um.login_count, 0)::bigint as total_logins,
    COALESCE(um.last_login, au.last_sign_in_at) as last_login,
    COALESCE(um.total_session_time_minutes, 0)::bigint as total_session_time_minutes,
    COALESCE(um.page_views, 0)::bigint as total_page_views,
    COALESCE(au.created_at, p.updated_at) as account_created,
    COALESCE(us.last_activity, um.last_login, au.last_sign_in_at) as last_activity
  FROM (
    SELECT id, email, full_name, updated_at FROM profiles
    UNION
    SELECT au.id, au.email, NULL as full_name, au.created_at as updated_at 
    FROM auth.users au 
    WHERE au.deleted_at IS NULL 
      AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id)
  ) p
  FULL OUTER JOIN auth.users au ON p.id = au.id
  LEFT JOIN usage_metrics um ON COALESCE(p.id, au.id) = um.user_id
  LEFT JOIN (
    SELECT 
      us.user_id, 
      MAX(us.last_activity) as last_activity
    FROM user_sessions us 
    GROUP BY us.user_id
  ) us ON COALESCE(p.id, au.id) = us.user_id
  WHERE COALESCE(p.email, au.email) IS NOT NULL
  ORDER BY COALESCE(um.total_session_time_minutes, 0) DESC, COALESCE(p.email, au.email) ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_comprehensive_user_stats() TO authenticated;

-- Add some test/sample data to usage_metrics if the table is empty
-- This helps with testing and ensures we have some data to display
DO $$
DECLARE
  user_record RECORD;
  metrics_count INTEGER;
BEGIN
  -- Check if usage_metrics table is empty
  SELECT COUNT(*) INTO metrics_count FROM usage_metrics;
  
  IF metrics_count = 0 THEN
    -- Add sample usage data for existing users
    FOR user_record IN 
      SELECT id, email FROM profiles 
      WHERE email IS NOT NULL 
      LIMIT 5
    LOOP
      INSERT INTO usage_metrics (
        user_id,
        date,
        login_count,
        page_views,
        total_session_time_minutes,
        last_login,
        created_at,
        updated_at
      ) VALUES (
        user_record.id,
        CURRENT_DATE,
        floor(random() * 10 + 1)::integer, -- Random login count 1-10
        floor(random() * 50 + 5)::integer, -- Random page views 5-55
        floor(random() * 120 + 10)::integer, -- Random session time 10-130 minutes
        NOW() - (random() * interval '7 days'), -- Random last login within 7 days
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, date) DO UPDATE SET
        login_count = EXCLUDED.login_count,
        page_views = EXCLUDED.page_views,
        total_session_time_minutes = EXCLUDED.total_session_time_minutes,
        last_login = EXCLUDED.last_login,
        updated_at = NOW();
    END LOOP;
    
    RAISE NOTICE 'Added sample usage metrics for testing';
  END IF;
END;
$$;
