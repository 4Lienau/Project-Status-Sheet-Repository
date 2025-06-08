-- Create test function for project creation tracking debugging
CREATE OR REPLACE FUNCTION test_project_creation_tracking(
  p_user_id UUID,
  p_test_project_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_session_id UUID;
  v_activity_log_id UUID;
  v_metrics_updated BOOLEAN := FALSE;
  v_error_message TEXT;
BEGIN
  -- Generate a proper UUID for the test session
  v_session_id := gen_random_uuid();
  
  BEGIN
    -- Test 1: Insert into user_activity_logs
    INSERT INTO user_activity_logs (
      user_id,
      session_id,
      activity_type,
      activity_data,
      page_url
    ) VALUES (
      p_user_id,
      v_session_id,
      'project_creation',
      jsonb_build_object(
        'project_id', p_test_project_id,
        'project_title', 'Test Project for Tracking',
        'department', 'Test Department',
        'test', true,
        'timestamp', NOW()
      ),
      '/test-page'
    )
    RETURNING id INTO v_activity_log_id;
    
    -- Test 2: Update daily usage metrics
    SELECT update_daily_usage_metrics(p_user_id, 'project_creation') INTO v_metrics_updated;
    
    -- Test 3: Verify the activity log was created
    IF v_activity_log_id IS NULL THEN
      RAISE EXCEPTION 'Failed to create activity log entry';
    END IF;
    
    -- Test 4: Check if metrics were updated
    IF v_metrics_updated IS NOT TRUE THEN
      RAISE WARNING 'Metrics update returned false or null';
    END IF;
    
    -- Return success result
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Project creation tracking test completed successfully',
      'details', jsonb_build_object(
        'activity_log_id', v_activity_log_id,
        'session_id', v_session_id,
        'metrics_updated', v_metrics_updated,
        'test_project_id', p_test_project_id,
        'user_id', p_user_id
      )
    );
    
  EXCEPTION WHEN OTHERS THEN
    v_error_message := SQLERRM;
    
    -- Return error result
    v_result := jsonb_build_object(
      'success', false,
      'error', v_error_message,
      'error_code', SQLSTATE,
      'details', jsonb_build_object(
        'test_project_id', p_test_project_id,
        'user_id', p_user_id,
        'session_id', v_session_id
      )
    );
  END;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION test_project_creation_tracking(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION test_project_creation_tracking(UUID, TEXT) IS 'Test function for debugging project creation tracking system';
