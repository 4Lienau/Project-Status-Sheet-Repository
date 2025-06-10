-- Improve session time calculation with better functions

-- Function to get accurate session statistics
CREATE OR REPLACE FUNCTION get_session_statistics()
RETURNS TABLE (
  total_sessions BIGINT,
  avg_session_minutes NUMERIC,
  total_session_minutes NUMERIC,
  active_sessions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH session_durations AS (
    SELECT 
      CASE 
        WHEN session_end IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (session_end - session_start)) / 60
        WHEN is_active = true THEN 
          EXTRACT(EPOCH FROM (last_activity - session_start)) / 60
        ELSE 0
      END as duration_minutes
    FROM user_sessions
    WHERE 
      session_start >= NOW() - INTERVAL '30 days'
      AND session_start IS NOT NULL
  ),
  valid_sessions AS (
    SELECT duration_minutes
    FROM session_durations
    WHERE 
      duration_minutes > 0 
      AND duration_minutes < 1440 -- Less than 24 hours
  )
  SELECT 
    (SELECT COUNT(*) FROM valid_sessions)::BIGINT as total_sessions,
    COALESCE(ROUND(AVG(duration_minutes), 0), 0)::NUMERIC as avg_session_minutes,
    COALESCE(ROUND(SUM(duration_minutes), 0), 0)::NUMERIC as total_session_minutes,
    (SELECT COUNT(*) FROM user_sessions WHERE is_active = true)::BIGINT as active_sessions
  FROM valid_sessions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_session_statistics() TO authenticated;

-- Drop existing function if it exists to avoid return type conflicts
DROP FUNCTION IF EXISTS cleanup_inactive_sessions();

-- Function to cleanup sessions that have been inactive for too long
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  -- End sessions that have been inactive for more than 1 hour
  UPDATE user_sessions 
  SET 
    is_active = false,
    session_end = COALESCE(session_end, last_activity),
    updated_at = NOW()
  WHERE 
    is_active = true 
    AND last_activity < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_inactive_sessions() TO authenticated;

-- Update the existing cleanup function to be more aggressive
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  -- End sessions that have been inactive for more than 30 minutes
  UPDATE user_sessions 
  SET 
    is_active = false,
    session_end = COALESCE(session_end, last_activity),
    updated_at = NOW()
  WHERE 
    is_active = true 
    AND last_activity < NOW() - INTERVAL '30 minutes';
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;