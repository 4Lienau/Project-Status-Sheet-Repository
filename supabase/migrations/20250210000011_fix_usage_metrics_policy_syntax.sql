-- Fix the update_daily_usage_metrics function to properly handle daily active users
-- and return boolean values as expected by the adminService
-- This migration fixes the CREATE POLICY IF NOT EXISTS syntax error

-- First, ensure the usage_metrics table has all required columns
ALTER TABLE usage_metrics 
ADD COLUMN IF NOT EXISTS project_count INTEGER DEFAULT 0;

-- Update the function to return boolean and handle all activity types properly
CREATE OR REPLACE FUNCTION update_daily_usage_metrics(
  p_user_id UUID,
  p_activity_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  rows_affected INTEGER;
BEGIN
  -- Log the function call for debugging
  RAISE LOG 'update_daily_usage_metrics called with user_id: %, activity_type: %', p_user_id, p_activity_type;
  
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE LOG 'update_daily_usage_metrics: user_id is NULL';
    RETURN FALSE;
  END IF;
  
  IF p_activity_type IS NULL OR p_activity_type = '' THEN
    RAISE LOG 'update_daily_usage_metrics: activity_type is NULL or empty';
    RETURN FALSE;
  END IF;
  
  -- Insert or update daily usage metrics
  INSERT INTO usage_metrics (
    user_id,
    date,
    login_count,
    page_views,
    projects_created,
    projects_updated,
    milestones_created,
    project_count,
    total_session_time_minutes,
    last_login
  )
  VALUES (
    p_user_id,
    today_date,
    CASE WHEN p_activity_type = 'login' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'page_view' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'project_creation' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'project_updated' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'milestone_created' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'project_creation' THEN 1 ELSE 0 END,
    0,
    CASE WHEN p_activity_type = 'login' THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    login_count = usage_metrics.login_count + CASE WHEN p_activity_type = 'login' THEN 1 ELSE 0 END,
    page_views = usage_metrics.page_views + CASE WHEN p_activity_type = 'page_view' THEN 1 ELSE 0 END,
    projects_created = usage_metrics.projects_created + CASE WHEN p_activity_type = 'project_creation' THEN 1 ELSE 0 END,
    projects_updated = usage_metrics.projects_updated + CASE WHEN p_activity_type = 'project_updated' THEN 1 ELSE 0 END,
    milestones_created = usage_metrics.milestones_created + CASE WHEN p_activity_type = 'milestone_created' THEN 1 ELSE 0 END,
    project_count = usage_metrics.project_count + CASE WHEN p_activity_type = 'project_creation' THEN 1 ELSE 0 END,
    last_login = CASE WHEN p_activity_type = 'login' THEN NOW() ELSE usage_metrics.last_login END,
    updated_at = NOW();
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  RAISE LOG 'update_daily_usage_metrics: affected % rows for user % on date %', rows_affected, p_user_id, today_date;
  
  -- Return true if operation was successful
  RETURN rows_affected > 0;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'update_daily_usage_metrics ERROR: % for user_id: %, activity_type: %', SQLERRM, p_user_id, p_activity_type;
    RETURN FALSE;
END;
$$;

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_user_activity_summary();

-- Create a function to get user activity summary for analytics
CREATE OR REPLACE FUNCTION get_user_activity_summary()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  total_session_time INTEGER,
  total_page_views INTEGER,
  total_projects INTEGER,
  login_count INTEGER,
  last_login TIMESTAMPTZ,
  account_created TIMESTAMPTZ
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
    COALESCE(SUM(um.project_count), 0)::INTEGER as total_projects,
    COALESCE(SUM(um.login_count), 0)::INTEGER as login_count,
    MAX(um.last_login) as last_login,
    p.updated_at as account_created
  FROM profiles p
  LEFT JOIN usage_metrics um ON p.id = um.user_id
  GROUP BY p.id, p.email, p.full_name, p.updated_at
  ORDER BY total_session_time DESC;
END;
$$;

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS cleanup_stale_sessions();

-- Create a function to cleanup stale sessions
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Mark sessions as inactive if no activity for more than 5 minutes
  UPDATE user_sessions 
  SET 
    is_active = false, 
    session_end = last_activity,
    updated_at = NOW()
  WHERE 
    is_active = true 
    AND last_activity < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  RAISE LOG 'cleanup_stale_sessions: marked % sessions as inactive', rows_updated;
  
  RETURN rows_updated;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_daily_usage_metrics(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stale_sessions() TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_date_composite ON usage_metrics(user_id, date, login_count, page_views, project_count);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_last_activity ON user_sessions(is_active, last_activity) WHERE is_active = true;

-- Fix the policy syntax error by using DROP POLICY IF EXISTS followed by CREATE POLICY
DROP POLICY IF EXISTS "System can manage usage metrics for functions" ON usage_metrics;
CREATE POLICY "System can manage usage metrics for functions" ON usage_metrics
  FOR ALL USING (true)
  WITH CHECK (true);