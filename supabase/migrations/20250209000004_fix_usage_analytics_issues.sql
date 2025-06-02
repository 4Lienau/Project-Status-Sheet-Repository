-- Fix Usage Analytics Issues
-- This migration addresses the problems with user identification and data correlation

-- First, let's ensure the get_active_users function exists and works correctly
DROP FUNCTION IF EXISTS get_active_users();

CREATE OR REPLACE FUNCTION get_active_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  session_start TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  session_duration_minutes INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.user_id,
    COALESCE(p.email, '') as email,
    COALESCE(p.full_name, '') as full_name,
    us.session_start,
    COALESCE(us.last_activity, us.session_start) as last_activity,
    EXTRACT(EPOCH FROM (COALESCE(us.last_activity, NOW()) - us.session_start))::INTEGER / 60 as session_duration_minutes
  FROM user_sessions us
  LEFT JOIN profiles p ON us.user_id = p.id
  WHERE us.is_active = true
    AND us.last_activity > NOW() - INTERVAL '30 minutes'
  ORDER BY us.last_activity DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_active_users() TO authenticated;

-- Fix the update_daily_usage_metrics function to handle different activity types properly
DROP FUNCTION IF EXISTS update_daily_usage_metrics(UUID, TEXT);

CREATE OR REPLACE FUNCTION update_daily_usage_metrics(
  p_user_id UUID,
  p_activity_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  current_session_time INTEGER := 0;
BEGIN
  -- Calculate current session time for the user
  SELECT COALESCE(
    EXTRACT(EPOCH FROM (COALESCE(last_activity, session_start) - session_start))::INTEGER / 60,
    0
  ) INTO current_session_time
  FROM user_sessions 
  WHERE user_id = p_user_id 
    AND is_active = true 
    AND session_start::DATE = today_date
  ORDER BY session_start DESC 
  LIMIT 1;

  -- Insert or update usage metrics for today
  INSERT INTO usage_metrics (
    user_id,
    date,
    login_count,
    page_views,
    projects_created,
    milestones_created,
    projects_updated,
    total_session_time_minutes,
    last_login,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    today_date,
    CASE WHEN p_activity_type = 'login' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'page_view' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'project_action' AND p_activity_type LIKE '%create%' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'milestone_created' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'project_action' AND p_activity_type LIKE '%update%' THEN 1 ELSE 0 END,
    current_session_time,
    CASE WHEN p_activity_type = 'login' THEN NOW() ELSE NULL END,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    login_count = usage_metrics.login_count + CASE WHEN p_activity_type = 'login' THEN 1 ELSE 0 END,
    page_views = usage_metrics.page_views + CASE WHEN p_activity_type = 'page_view' THEN 1 ELSE 0 END,
    projects_created = usage_metrics.projects_created + CASE WHEN p_activity_type = 'project_action' AND p_activity_type LIKE '%create%' THEN 1 ELSE 0 END,
    milestones_created = usage_metrics.milestones_created + CASE WHEN p_activity_type = 'milestone_created' THEN 1 ELSE 0 END,
    projects_updated = usage_metrics.projects_updated + CASE WHEN p_activity_type = 'project_action' AND p_activity_type LIKE '%update%' THEN 1 ELSE 0 END,
    total_session_time_minutes = GREATEST(usage_metrics.total_session_time_minutes, current_session_time),
    last_login = CASE WHEN p_activity_type = 'login' THEN NOW() ELSE usage_metrics.last_login END,
    updated_at = NOW();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_daily_usage_metrics(UUID, TEXT) TO authenticated;

-- Create a function to get user activity summary with proper joins
DROP FUNCTION IF EXISTS get_user_activity_summary();

CREATE OR REPLACE FUNCTION get_user_activity_summary()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  total_session_time INTEGER,
  total_page_views INTEGER,
  total_projects INTEGER,
  login_count INTEGER,
  last_login TIMESTAMPTZ
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
    COALESCE(SUM(um.total_session_time_minutes), 0)::INTEGER as total_session_time,
    COALESCE(SUM(um.page_views), 0)::INTEGER as total_page_views,
    COALESCE(SUM(um.projects_created), 0)::INTEGER as total_projects,
    COALESCE(SUM(um.login_count), 0)::INTEGER as login_count,
    MAX(um.last_login) as last_login
  FROM profiles p
  LEFT JOIN usage_metrics um ON p.id = um.user_id
  GROUP BY p.id, p.email, p.full_name
  HAVING COALESCE(SUM(um.total_session_time_minutes), 0) > 0
     OR COALESCE(SUM(um.page_views), 0) > 0
     OR COALESCE(SUM(um.login_count), 0) > 0
  ORDER BY total_session_time DESC, total_page_views DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_activity_summary() TO authenticated;

-- Update RLS policies to ensure proper access
DROP POLICY IF EXISTS "Users can read their own usage metrics" ON usage_metrics;
CREATE POLICY "Users can read their own usage metrics" ON usage_metrics
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all usage metrics" ON usage_metrics;
CREATE POLICY "Admins can read all usage metrics" ON usage_metrics
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
  );

-- Ensure user_sessions policies allow proper access
DROP POLICY IF EXISTS "Users can manage their own sessions" ON user_sessions;
CREATE POLICY "Users can manage their own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all sessions" ON user_sessions;
CREATE POLICY "Admins can read all sessions" ON user_sessions
  FOR SELECT USING (
    auth.jwt() ->> 'email' IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_user ON user_sessions(user_id, is_active, last_activity);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_date ON usage_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_session ON user_activity_logs(user_id, session_id, created_at);

-- Add some sample data to test the functions (only if tables are empty)
DO $$
BEGIN
  -- Only insert test data if usage_metrics is empty
  IF NOT EXISTS (SELECT 1 FROM usage_metrics LIMIT 1) THEN
    -- Insert some test usage data for existing users
    INSERT INTO usage_metrics (user_id, date, login_count, page_views, total_session_time_minutes, last_login)
    SELECT 
      p.id,
      CURRENT_DATE,
      1,
      FLOOR(RANDOM() * 20 + 5)::INTEGER,
      FLOOR(RANDOM() * 120 + 10)::INTEGER,
      NOW() - INTERVAL '1 hour' * FLOOR(RANDOM() * 24)
    FROM profiles p
    LIMIT 3;
  END IF;
END $$;
