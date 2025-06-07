-- Create AI usage tracking table
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('description', 'value_statement', 'milestones', 'project_pilot')),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  session_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_user_id ON ai_usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_feature_type ON ai_usage_tracking(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_created_at ON ai_usage_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_project_id ON ai_usage_tracking(project_id);

-- Enable RLS
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own AI usage data
CREATE POLICY "Users can view own AI usage" ON ai_usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own AI usage data
CREATE POLICY "Users can insert own AI usage" ON ai_usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all AI usage data (for analytics)
CREATE POLICY "Admins can view all AI usage" ON ai_usage_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
    )
  );

-- Enable realtime (only if publication is not FOR ALL TABLES)
DO $$
BEGIN
  -- Check if publication is FOR ALL TABLES
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication 
    WHERE pubname = 'supabase_realtime' AND puballtables = true
  ) THEN
    -- Only add table if publication is not FOR ALL TABLES
    ALTER PUBLICATION supabase_realtime ADD TABLE ai_usage_tracking;
  END IF;
END $$;

-- Create function to get AI usage analytics
CREATE OR REPLACE FUNCTION get_ai_usage_analytics()
RETURNS TABLE (
  feature_type TEXT,
  total_usage BIGINT,
  unique_users BIGINT,
  usage_last_7_days BIGINT,
  usage_last_30_days BIGINT,
  avg_daily_usage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aut.feature_type,
    COUNT(*) as total_usage,
    COUNT(DISTINCT aut.user_id) as unique_users,
    COUNT(*) FILTER (WHERE aut.created_at >= NOW() - INTERVAL '7 days') as usage_last_7_days,
    COUNT(*) FILTER (WHERE aut.created_at >= NOW() - INTERVAL '30 days') as usage_last_30_days,
    ROUND(
      COUNT(*) FILTER (WHERE aut.created_at >= NOW() - INTERVAL '30 days')::NUMERIC / 30, 
      2
    ) as avg_daily_usage
  FROM ai_usage_tracking aut
  GROUP BY aut.feature_type
  ORDER BY total_usage DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get AI usage trends over time
CREATE OR REPLACE FUNCTION get_ai_usage_trends(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  feature_type TEXT,
  usage_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days_back || ' days')::INTERVAL,
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE as date
  ),
  feature_types AS (
    SELECT DISTINCT feature_type FROM ai_usage_tracking
  )
  SELECT 
    ds.date,
    ft.feature_type,
    COALESCE(COUNT(aut.id), 0) as usage_count
  FROM date_series ds
  CROSS JOIN feature_types ft
  LEFT JOIN ai_usage_tracking aut ON 
    DATE(aut.created_at) = ds.date AND 
    aut.feature_type = ft.feature_type
  GROUP BY ds.date, ft.feature_type
  ORDER BY ds.date, ft.feature_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get top AI users
CREATE OR REPLACE FUNCTION get_top_ai_users(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  total_ai_usage BIGINT,
  description_usage BIGINT,
  value_statement_usage BIGINT,
  milestones_usage BIGINT,
  project_pilot_usage BIGINT,
  last_ai_usage TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    COUNT(aut.id) as total_ai_usage,
    COUNT(aut.id) FILTER (WHERE aut.feature_type = 'description') as description_usage,
    COUNT(aut.id) FILTER (WHERE aut.feature_type = 'value_statement') as value_statement_usage,
    COUNT(aut.id) FILTER (WHERE aut.feature_type = 'milestones') as milestones_usage,
    COUNT(aut.id) FILTER (WHERE aut.feature_type = 'project_pilot') as project_pilot_usage,
    MAX(aut.created_at) as last_ai_usage
  FROM profiles p
  LEFT JOIN ai_usage_tracking aut ON p.id = aut.user_id
  WHERE aut.id IS NOT NULL
  GROUP BY p.id, p.email, p.full_name
  ORDER BY total_ai_usage DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;