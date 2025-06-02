-- Create function to get currently active users
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
    us.last_activity,
    EXTRACT(EPOCH FROM (COALESCE(us.last_activity, NOW()) - us.session_start))::integer / 60 as session_duration_minutes
  FROM user_sessions us
  JOIN profiles p ON us.user_id = p.id
  WHERE us.is_active = true
    AND us.last_activity > NOW() - INTERVAL '30 minutes'
  ORDER BY us.last_activity DESC;
END;
$$;

-- Create function to update daily usage metrics
CREATE OR REPLACE FUNCTION update_daily_usage_metrics(
  p_user_id uuid,
  p_activity_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_date date := CURRENT_DATE;
BEGIN
  -- Insert or update daily usage metrics
  INSERT INTO usage_metrics (
    user_id,
    date,
    login_count,
    page_views,
    projects_created,
    total_session_time_minutes
  )
  VALUES (
    p_user_id,
    today_date,
    CASE WHEN p_activity_type = 'login' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'page_view' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'project_action' THEN 1 ELSE 0 END,
    0
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    login_count = usage_metrics.login_count + CASE WHEN p_activity_type = 'login' THEN 1 ELSE 0 END,
    page_views = usage_metrics.page_views + CASE WHEN p_activity_type = 'page_view' THEN 1 ELSE 0 END,
    projects_created = usage_metrics.projects_created + CASE WHEN p_activity_type = 'project_action' THEN 1 ELSE 0 END,
    updated_at = NOW();
END;
$$;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS execute_sql(text);

-- Create function to execute SQL (for admin debugging)
CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Only allow SELECT statements for security
  IF UPPER(TRIM(sql_query)) NOT LIKE 'SELECT%' THEN
    RAISE EXCEPTION 'Only SELECT statements are allowed';
  END IF;
  
  EXECUTE sql_query INTO result;
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_active_users() TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_usage_metrics(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can manage their own activity logs" ON user_activity_logs;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON user_activity_logs;
DROP POLICY IF EXISTS "Users can manage their own usage metrics" ON usage_metrics;
DROP POLICY IF EXISTS "Admins can view all usage metrics" ON usage_metrics;

-- Enable RLS on usage tracking tables and create policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for user_sessions
CREATE POLICY "Users can manage their own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON user_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
    )
  );

-- Policies for user_activity_logs
CREATE POLICY "Users can manage their own activity logs" ON user_activity_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs" ON user_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
    )
  );

-- Policies for usage_metrics
CREATE POLICY "Users can manage their own usage metrics" ON usage_metrics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage metrics" ON usage_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
    )
  );