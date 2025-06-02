-- Fix usage analytics duplicates and session duration issues
-- This migration addresses:
-- 1. Duplicate users in get_active_users function
-- 2. Session duration calculation issues
-- 3. User login statistics data retrieval

-- Drop and recreate get_active_users function with proper deduplication
DROP FUNCTION IF EXISTS get_active_users();

CREATE OR REPLACE FUNCTION get_active_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  session_start TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE,
  session_duration_minutes INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (us.user_id)
    us.user_id,
    COALESCE(p.email, '') as email,
    COALESCE(p.full_name, '') as full_name,
    us.session_start,
    COALESCE(us.last_activity, us.session_start) as last_activity,
    CASE 
      WHEN us.session_start IS NOT NULL THEN
        EXTRACT(EPOCH FROM (COALESCE(us.last_activity, NOW()) - us.session_start))::INTEGER / 60
      ELSE 0
    END as session_duration_minutes
  FROM user_sessions us
  LEFT JOIN profiles p ON us.user_id = p.id
  WHERE us.is_active = true
    AND us.session_start IS NOT NULL
    AND us.last_activity > NOW() - INTERVAL '30 minutes'
  ORDER BY us.user_id, us.session_start DESC;
END;
$$;

-- Create function to get comprehensive user login statistics
CREATE OR REPLACE FUNCTION get_user_login_statistics()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  total_logins BIGINT,
  last_login TIMESTAMP WITH TIME ZONE,
  total_session_time_minutes BIGINT,
  account_created TIMESTAMP WITH TIME ZONE
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
    COALESCE(login_stats.login_count, 0) as total_logins,
    COALESCE(login_stats.last_login, p.updated_at) as last_login,
    COALESCE(session_stats.total_session_minutes, 0) as total_session_time_minutes,
    p.created_at as account_created
  FROM profiles p
  LEFT JOIN (
    SELECT 
      user_id,
      SUM(login_count) as login_count,
      MAX(last_login) as last_login
    FROM usage_metrics 
    WHERE login_count > 0
    GROUP BY user_id
  ) login_stats ON p.id = login_stats.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      SUM(total_session_time_minutes) as total_session_minutes
    FROM usage_metrics 
    WHERE total_session_time_minutes > 0
    GROUP BY user_id
  ) session_stats ON p.id = session_stats.user_id
  WHERE p.email IS NOT NULL
  ORDER BY COALESCE(login_stats.last_login, p.updated_at) DESC;
END;
$$;

-- Update get_user_activity_summary to handle better data aggregation
DROP FUNCTION IF EXISTS get_user_activity_summary();

CREATE OR REPLACE FUNCTION get_user_activity_summary()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  total_session_time BIGINT,
  total_page_views BIGINT,
  total_projects BIGINT,
  login_count BIGINT,
  last_login TIMESTAMP WITH TIME ZONE
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
    COALESCE(SUM(um.total_session_time_minutes), 0) as total_session_time,
    COALESCE(SUM(um.page_views), 0) as total_page_views,
    COALESCE(SUM(um.projects_created + um.projects_updated), 0) as total_projects,
    COALESCE(SUM(um.login_count), 0) as login_count,
    MAX(um.last_login) as last_login
  FROM profiles p
  LEFT JOIN usage_metrics um ON p.id = um.user_id
  WHERE p.email IS NOT NULL
  GROUP BY p.id, p.email, p.full_name
  HAVING COALESCE(SUM(um.total_session_time_minutes), 0) > 0 
      OR COALESCE(SUM(um.page_views), 0) > 0 
      OR COALESCE(SUM(um.login_count), 0) > 0
  ORDER BY total_session_time DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_login_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary() TO authenticated;

-- Ensure RLS policies allow reading the required tables
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can read all user sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admin can read all usage metrics" ON usage_metrics;
DROP POLICY IF EXISTS "Admin can read all activity logs" ON user_activity_logs;

-- Create policies for admin access
CREATE POLICY "Admin can read all user sessions" ON user_sessions
  FOR SELECT USING (true);

CREATE POLICY "Admin can read all usage metrics" ON usage_metrics
  FOR SELECT USING (true);

CREATE POLICY "Admin can read all activity logs" ON user_activity_logs
  FOR SELECT USING (true);

-- Users can manage their own sessions and metrics
DROP POLICY IF EXISTS "Users can manage their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can read their own metrics" ON usage_metrics;
DROP POLICY IF EXISTS "Users can read their own activity" ON user_activity_logs;

CREATE POLICY "Users can manage their own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own metrics" ON usage_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own activity" ON user_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Note: Realtime is already enabled for all tables via FOR ALL TABLES publication
-- No need to explicitly add tables to supabase_realtime publication
