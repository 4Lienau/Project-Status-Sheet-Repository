-- Create user_sessions table to track active sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_activity_logs table for detailed usage tracking
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'page_view', 'feature_use', 'project_action', etc.
  activity_data JSONB,
  page_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create usage_metrics table for aggregated statistics
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  total_session_time_minutes INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  projects_created INTEGER DEFAULT 0,
  projects_updated INTEGER DEFAULT 0,
  milestones_created INTEGER DEFAULT 0,
  login_count INTEGER DEFAULT 0,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_timestamp ON user_activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_date ON usage_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_date ON usage_metrics(date);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
CREATE POLICY "Admin can view all user sessions" ON user_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
    )
  );

CREATE POLICY "Admin can manage user sessions" ON user_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
    )
  );

CREATE POLICY "Users can manage their own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all activity logs" ON user_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
    )
  );

CREATE POLICY "Users can create their own activity logs" ON user_activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all usage metrics" ON usage_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
    )
  );

CREATE POLICY "Users can view their own usage metrics" ON usage_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage usage metrics" ON usage_metrics
  FOR ALL USING (true);

-- Create function to cleanup old sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  -- Mark sessions as inactive if no activity for more than 30 minutes
  UPDATE user_sessions 
  SET is_active = false, 
      session_end = last_activity,
      updated_at = NOW()
  WHERE is_active = true 
    AND last_activity < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get currently active users
CREATE OR REPLACE FUNCTION get_active_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  session_start TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  session_duration_minutes INTEGER
) AS $$
BEGIN
  -- First cleanup inactive sessions
  PERFORM cleanup_inactive_sessions();
  
  -- Return active users with session info
  RETURN QUERY
  SELECT 
    us.user_id,
    p.email,
    p.full_name,
    us.session_start,
    us.last_activity,
    EXTRACT(EPOCH FROM (us.last_activity - us.session_start))::INTEGER / 60 as session_duration_minutes
  FROM user_sessions us
  JOIN profiles p ON p.id = us.user_id
  WHERE us.is_active = true
  ORDER BY us.last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update daily usage metrics
CREATE OR REPLACE FUNCTION update_daily_usage_metrics(p_user_id UUID, p_activity_type TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO usage_metrics (user_id, date, page_views, projects_created, projects_updated, milestones_created)
  VALUES (p_user_id, CURRENT_DATE, 
    CASE WHEN p_activity_type = 'page_view' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'project_created' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'project_updated' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'milestone_created' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    page_views = usage_metrics.page_views + CASE WHEN p_activity_type = 'page_view' THEN 1 ELSE 0 END,
    projects_created = usage_metrics.projects_created + CASE WHEN p_activity_type = 'project_created' THEN 1 ELSE 0 END,
    projects_updated = usage_metrics.projects_updated + CASE WHEN p_activity_type = 'project_updated' THEN 1 ELSE 0 END,
    milestones_created = usage_metrics.milestones_created + CASE WHEN p_activity_type = 'milestone_created' THEN 1 ELSE 0 END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Realtime is automatically enabled for all tables since supabase_realtime publication is configured as FOR ALL TABLES
-- No need to explicitly add tables to the publication
