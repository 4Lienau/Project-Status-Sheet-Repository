-- Fix active users function to properly detect concurrent sessions
CREATE OR REPLACE FUNCTION get_active_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  session_start timestamptz,
  last_activity timestamptz,
  session_duration_minutes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.user_id,
    p.email,
    p.full_name,
    us.session_start,
    COALESCE(us.last_activity, us.session_start) as last_activity,
    EXTRACT(EPOCH FROM (COALESCE(us.last_activity, NOW()) - us.session_start))::integer / 60 as session_duration_minutes
  FROM user_sessions us
  JOIN profiles p ON us.user_id = p.id
  WHERE us.is_active = true
    AND (
      us.last_activity > NOW() - INTERVAL '30 minutes'
      OR (us.last_activity IS NULL AND us.session_start > NOW() - INTERVAL '30 minutes')
    )
  ORDER BY COALESCE(us.last_activity, us.session_start) DESC;
END;
$$;

-- Create improved function to get comprehensive user stats with better session time calculation
CREATE OR REPLACE FUNCTION get_comprehensive_user_stats()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  total_logins bigint,
  last_login timestamptz,
  total_session_time_minutes bigint,
  total_page_views bigint,
  account_created timestamptz,
  last_activity timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_session_stats AS (
    SELECT 
      us.user_id,
      COUNT(*) as session_count,
      MAX(us.session_start) as last_session_start,
      SUM(
        CASE 
          WHEN us.session_end IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (us.session_end - us.session_start))::integer / 60
          WHEN us.is_active = true THEN 
            EXTRACT(EPOCH FROM (COALESCE(us.last_activity, NOW()) - us.session_start))::integer / 60
          ELSE 0
        END
      ) as total_session_minutes,
      MAX(COALESCE(us.last_activity, us.session_start)) as last_activity_time
    FROM user_sessions us
    GROUP BY us.user_id
  ),
  user_metrics_stats AS (
    SELECT 
      um.user_id,
      SUM(um.login_count) as total_login_count,
      SUM(um.page_views) as total_page_view_count,
      MAX(um.last_login) as last_login_time
    FROM usage_metrics um
    GROUP BY um.user_id
  )
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    COALESCE(ums.total_login_count, uss.session_count, 0) as total_logins,
    COALESCE(ums.last_login_time, uss.last_session_start) as last_login,
    COALESCE(uss.total_session_minutes, 0) as total_session_time_minutes,
    COALESCE(ums.total_page_view_count, 0) as total_page_views,
    p.updated_at as account_created,
    uss.last_activity_time as last_activity
  FROM profiles p
  LEFT JOIN user_session_stats uss ON p.id = uss.user_id
  LEFT JOIN user_metrics_stats ums ON p.id = ums.user_id
  WHERE (
    COALESCE(ums.total_login_count, uss.session_count, 0) > 0
    OR uss.total_session_minutes > 0
  )
  ORDER BY COALESCE(ums.last_login_time, uss.last_session_start) DESC NULLS LAST;
END;
$$;

-- Create function to get user activity summary with accurate calculations
CREATE OR REPLACE FUNCTION get_user_activity_summary()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  total_session_time bigint,
  total_page_views bigint,
  total_projects bigint,
  login_count bigint,
  last_login timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_session_stats AS (
    SELECT 
      us.user_id,
      COUNT(*) as session_count,
      SUM(
        CASE 
          WHEN us.session_end IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (us.session_end - us.session_start))::integer / 60
          WHEN us.is_active = true THEN 
            EXTRACT(EPOCH FROM (COALESCE(us.last_activity, NOW()) - us.session_start))::integer / 60
          ELSE 0
        END
      ) as total_session_minutes,
      MAX(us.session_start) as last_session_time
    FROM user_sessions us
    GROUP BY us.user_id
  ),
  user_metrics_stats AS (
    SELECT 
      um.user_id,
      SUM(um.login_count) as total_login_count,
      SUM(um.page_views) as total_page_view_count,
      SUM(um.projects_created) as total_project_count,
      MAX(um.last_login) as last_login_time
    FROM usage_metrics um
    GROUP BY um.user_id
  )
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    COALESCE(uss.total_session_minutes, 0) as total_session_time,
    COALESCE(ums.total_page_view_count, 0) as total_page_views,
    COALESCE(ums.total_project_count, 0) as total_projects,
    COALESCE(ums.total_login_count, uss.session_count, 0) as login_count,
    COALESCE(ums.last_login_time, uss.last_session_time) as last_login
  FROM profiles p
  LEFT JOIN user_session_stats uss ON p.id = uss.user_id
  LEFT JOIN user_metrics_stats ums ON p.id = ums.user_id
  WHERE (
    COALESCE(ums.total_login_count, uss.session_count, 0) > 0
    OR uss.total_session_minutes > 0
  )
  ORDER BY uss.total_session_minutes DESC NULLS LAST;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_comprehensive_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary() TO authenticated;
