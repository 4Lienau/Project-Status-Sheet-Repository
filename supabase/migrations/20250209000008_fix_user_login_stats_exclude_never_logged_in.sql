-- Fix user login statistics to only show users who have actually logged in
-- and fix the Most Active Users data resolution

-- Drop and recreate the comprehensive user stats function to only include users with actual activity
DROP FUNCTION IF EXISTS get_comprehensive_user_stats();

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
    COALESCE(um.page_views, 0)::bigint as total_page_views,
    p.updated_at as account_created,
    us.last_activity
  FROM profiles p
  INNER JOIN usage_metrics um ON p.id = um.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      MAX(last_activity) as last_activity
    FROM user_sessions 
    GROUP BY user_id
  ) us ON p.id = us.user_id
  WHERE um.login_count > 0 OR um.page_views > 0 OR um.total_session_time_minutes > 0
  ORDER BY um.last_login DESC NULLS LAST;
END;
$$;

-- Drop and recreate the user login statistics function to only include users with login activity
DROP FUNCTION IF EXISTS get_user_login_statistics();

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
    p.updated_at as account_created
  FROM profiles p
  INNER JOIN usage_metrics um ON p.id = um.user_id
  WHERE um.login_count > 0
  ORDER BY um.last_login DESC NULLS LAST;
END;
$$;

-- Create a new function specifically for getting user activity summary with better data
CREATE OR REPLACE FUNCTION get_user_activity_summary()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  total_session_time bigint,
  total_page_views bigint,
  total_projects bigint,
  login_count bigint,
  last_login timestamp with time zone
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    COALESCE(um.total_session_time_minutes, 0)::bigint as total_session_time,
    COALESCE(um.page_views, 0)::bigint as total_page_views,
    COALESCE(um.projects_created, 0)::bigint as total_projects,
    COALESCE(um.login_count, 0)::bigint as login_count,
    um.last_login
  FROM profiles p
  INNER JOIN usage_metrics um ON p.id = um.user_id
  WHERE um.login_count > 0 OR um.page_views > 0 OR um.total_session_time_minutes > 0
  ORDER BY um.total_session_time_minutes DESC NULLS LAST;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_comprehensive_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_login_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary() TO authenticated;
