-- Fix AI usage analytics to prevent double counting

-- Update the get_ai_usage_analytics function to be more accurate
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
    COUNT(aut.id) as total_usage,
    COUNT(DISTINCT aut.user_id) as unique_users,
    COUNT(aut.id) FILTER (WHERE aut.created_at >= NOW() - INTERVAL '7 days') as usage_last_7_days,
    COUNT(aut.id) FILTER (WHERE aut.created_at >= NOW() - INTERVAL '30 days') as usage_last_30_days,
    ROUND(
      COUNT(aut.id) FILTER (WHERE aut.created_at >= NOW() - INTERVAL '30 days')::NUMERIC / 30, 
      2
    ) as avg_daily_usage
  FROM ai_usage_tracking aut
  GROUP BY aut.feature_type
  ORDER BY total_usage DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get overall AI adoption metrics without double counting users
CREATE OR REPLACE FUNCTION get_ai_adoption_overview()
RETURNS TABLE (
  total_ai_events BIGINT,
  unique_ai_users BIGINT,
  total_users BIGINT,
  adoption_rate NUMERIC,
  most_popular_feature TEXT,
  daily_average_usage NUMERIC
) AS $$
DECLARE
  total_users_count BIGINT;
  unique_users_count BIGINT;
  total_events_count BIGINT;
  popular_feature TEXT;
  daily_avg NUMERIC;
BEGIN
  -- Get total users count
  SELECT COUNT(*) INTO total_users_count FROM profiles;
  
  -- Get unique AI users count (no double counting)
  SELECT COUNT(DISTINCT user_id) INTO unique_users_count FROM ai_usage_tracking;
  
  -- Get total AI events
  SELECT COUNT(*) INTO total_events_count FROM ai_usage_tracking;
  
  -- Get most popular feature
  SELECT aut.feature_type INTO popular_feature
  FROM ai_usage_tracking aut
  GROUP BY aut.feature_type
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  -- Calculate daily average for last 30 days
  SELECT ROUND(
    COUNT(*)::NUMERIC / 30, 
    2
  ) INTO daily_avg
  FROM ai_usage_tracking 
  WHERE created_at >= NOW() - INTERVAL '30 days';
  
  RETURN QUERY
  SELECT 
    total_events_count,
    unique_users_count,
    total_users_count,
    CASE 
      WHEN total_users_count > 0 THEN ROUND((unique_users_count::NUMERIC / total_users_count::NUMERIC) * 100, 1)
      ELSE 0::NUMERIC
    END,
    COALESCE(popular_feature, 'None'),
    COALESCE(daily_avg, 0::NUMERIC);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes to improve query performance and help prevent duplicate tracking
-- Note: We're not adding unique constraints here to avoid blocking legitimate rapid usage
-- Instead, we'll handle deduplication at the application level

-- Index for queries with project_id
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_feature_project ON ai_usage_tracking(
  user_id, 
  feature_type, 
  project_id, 
  created_at DESC
) WHERE project_id IS NOT NULL;

-- Index for queries without project_id
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_feature_no_project ON ai_usage_tracking(
  user_id, 
  feature_type, 
  created_at DESC
) WHERE project_id IS NULL;

-- General performance indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature_type ON ai_usage_tracking(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage_tracking(user_id);
