-- Improve session cleanup and active user detection

-- Create a function to cleanup stale sessions (sessions inactive for more than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- End sessions that haven't had activity in the last 5 minutes
  UPDATE user_sessions 
  SET 
    is_active = false,
    session_end = NOW(),
    updated_at = NOW()
  WHERE 
    is_active = true 
    AND last_activity < NOW() - INTERVAL '5 minutes';
    
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up stale sessions older than 5 minutes';
END;
$$;

-- Update the get_active_users function to be more strict about what constitutes "active"
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
  -- First cleanup stale sessions
  PERFORM cleanup_stale_sessions();
  
  -- Return only truly active users (activity within last 2 minutes)
  RETURN QUERY
  SELECT DISTINCT ON (s.user_id)
    s.user_id,
    COALESCE(p.email, 'Unknown') as email,
    COALESCE(p.full_name, 'Unknown User') as full_name,
    s.session_start,
    s.last_activity,
    EXTRACT(EPOCH FROM (s.last_activity - s.session_start))::integer / 60 as session_duration_minutes
  FROM user_sessions s
  LEFT JOIN profiles p ON s.user_id = p.id
  WHERE 
    s.is_active = true 
    AND s.last_activity >= NOW() - INTERVAL '2 minutes'
  ORDER BY s.user_id, s.last_activity DESC;
END;
$$;

-- Create a function to end all sessions for a specific user (useful for logout)
CREATE OR REPLACE FUNCTION end_user_sessions(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_sessions 
  SET 
    is_active = false,
    session_end = NOW(),
    updated_at = NOW()
  WHERE 
    user_id = p_user_id 
    AND is_active = true;
    
  RAISE NOTICE 'Ended all active sessions for user: %', p_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_stale_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_users() TO authenticated;
GRANT EXECUTE ON FUNCTION end_user_sessions(uuid) TO authenticated;
