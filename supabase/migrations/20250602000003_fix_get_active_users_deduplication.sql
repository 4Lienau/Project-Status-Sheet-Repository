-- Fix get_active_users function to return only one session per user
-- This prevents duplicate entries in the admin dashboard

CREATE OR REPLACE FUNCTION get_active_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  session_start timestamp with time zone,
  last_activity timestamp with time zone,
  session_duration_minutes integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return only the most recent active session per user
  -- This prevents duplicate entries for users with multiple browser tabs
  RETURN QUERY
  WITH ranked_sessions AS (
    SELECT 
      us.user_id,
      p.email,
      p.full_name,
      us.session_start,
      us.last_activity,
      EXTRACT(EPOCH FROM (us.last_activity - us.session_start))::integer / 60 as session_duration_minutes,
      ROW_NUMBER() OVER (
        PARTITION BY us.user_id 
        ORDER BY us.last_activity DESC
      ) as rn
    FROM user_sessions us
    INNER JOIN profiles p ON us.user_id = p.id
    WHERE 
      us.is_active = true 
      AND us.last_activity >= NOW() - INTERVAL '5 minutes'
  )
  SELECT 
    rs.user_id,
    rs.email,
    rs.full_name,
    rs.session_start,
    rs.last_activity,
    GREATEST(rs.session_duration_minutes, 0) as session_duration_minutes
  FROM ranked_sessions rs
  WHERE rs.rn = 1
  ORDER BY rs.last_activity DESC;
END;
$$;

-- Also create a cleanup function to remove stale sessions
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- End sessions that haven't had activity in the last 30 minutes
  UPDATE user_sessions 
  SET 
    is_active = false,
    session_end = NOW(),
    updated_at = NOW()
  WHERE 
    is_active = true 
    AND last_activity < NOW() - INTERVAL '30 minutes';
    
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up stale sessions older than 30 minutes';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_users() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stale_sessions() TO authenticated;
