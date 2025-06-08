-- Comprehensive test for project creation tracking system

-- Create a comprehensive test function
CREATE OR REPLACE FUNCTION comprehensive_project_tracking_test(
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_user_id UUID;
  test_session_id UUID;
  test_project_id TEXT;
  result JSON;
  test_results JSONB := '{}'::jsonb;
  error_count INTEGER := 0;
  success_count INTEGER := 0;
BEGIN
  -- Use provided user_id or get current authenticated user
  test_user_id := COALESCE(p_user_id, auth.uid());
  
  IF test_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No user ID provided and no authenticated user found',
      'timestamp', now()
    );
  END IF;
  
  -- Generate test IDs
  test_session_id := gen_random_uuid();
  test_project_id := 'test-project-' || extract(epoch from now());
  
  RAISE NOTICE 'Starting comprehensive project tracking test for user: %', test_user_id;
  
  -- Test 1: Check if user_activity_logs table exists and is accessible
  BEGIN
    PERFORM 1 FROM user_activity_logs LIMIT 1;
    test_results := test_results || jsonb_build_object('user_activity_logs_accessible', true);
    success_count := success_count + 1;
  EXCEPTION WHEN OTHERS THEN
    test_results := test_results || jsonb_build_object(
      'user_activity_logs_accessible', false,
      'user_activity_logs_error', SQLERRM
    );
    error_count := error_count + 1;
  END;
  
  -- Test 2: Check if usage_metrics table exists and is accessible
  BEGIN
    PERFORM 1 FROM usage_metrics LIMIT 1;
    test_results := test_results || jsonb_build_object('usage_metrics_accessible', true);
    success_count := success_count + 1;
  EXCEPTION WHEN OTHERS THEN
    test_results := test_results || jsonb_build_object(
      'usage_metrics_accessible', false,
      'usage_metrics_error', SQLERRM
    );
    error_count := error_count + 1;
  END;
  
  -- Test 3: Insert a test project creation log
  BEGIN
    INSERT INTO user_activity_logs (
      user_id,
      session_id,
      activity_type,
      activity_data,
      page_url
    ) VALUES (
      test_user_id,
      test_session_id,
      'project_creation',
      jsonb_build_object(
        'project_id', test_project_id,
        'project_title', 'Comprehensive Test Project',
        'department', 'Test Department',
        'timestamp', now(),
        'test', true
      ),
      'test-comprehensive-page'
    );
    
    test_results := test_results || jsonb_build_object('activity_log_insert', true);
    success_count := success_count + 1;
  EXCEPTION WHEN OTHERS THEN
    test_results := test_results || jsonb_build_object(
      'activity_log_insert', false,
      'activity_log_error', SQLERRM
    );
    error_count := error_count + 1;
  END;
  
  -- Test 4: Test the update_daily_usage_metrics function
  BEGIN
    PERFORM update_daily_usage_metrics(test_user_id, 'project_creation');
    test_results := test_results || jsonb_build_object('usage_metrics_function', true);
    success_count := success_count + 1;
  EXCEPTION WHEN OTHERS THEN
    test_results := test_results || jsonb_build_object(
      'usage_metrics_function', false,
      'usage_metrics_function_error', SQLERRM
    );
    error_count := error_count + 1;
  END;
  
  -- Test 5: Verify the activity log was created
  BEGIN
    PERFORM 1 FROM user_activity_logs 
    WHERE user_id = test_user_id 
      AND activity_type = 'project_creation'
      AND session_id = test_session_id;
    
    IF FOUND THEN
      test_results := test_results || jsonb_build_object('activity_log_verification', true);
      success_count := success_count + 1;
    ELSE
      test_results := test_results || jsonb_build_object(
        'activity_log_verification', false,
        'activity_log_verification_error', 'Activity log entry not found'
      );
      error_count := error_count + 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    test_results := test_results || jsonb_build_object(
      'activity_log_verification', false,
      'activity_log_verification_error', SQLERRM
    );
    error_count := error_count + 1;
  END;
  
  -- Test 6: Verify usage metrics were updated
  BEGIN
    PERFORM 1 FROM usage_metrics 
    WHERE user_id = test_user_id 
      AND date = CURRENT_DATE
      AND project_count > 0;
    
    IF FOUND THEN
      test_results := test_results || jsonb_build_object('usage_metrics_verification', true);
      success_count := success_count + 1;
    ELSE
      test_results := test_results || jsonb_build_object(
        'usage_metrics_verification', false,
        'usage_metrics_verification_error', 'Usage metrics not updated or project_count is 0'
      );
      error_count := error_count + 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    test_results := test_results || jsonb_build_object(
      'usage_metrics_verification', false,
      'usage_metrics_verification_error', SQLERRM
    );
    error_count := error_count + 1;
  END;
  
  -- Get current project creation count
  DECLARE
    current_count INTEGER := 0;
  BEGIN
    SELECT COUNT(*) INTO current_count
    FROM user_activity_logs
    WHERE activity_type = 'project_creation';
    
    test_results := test_results || jsonb_build_object('total_project_creation_count', current_count);
  EXCEPTION WHEN OTHERS THEN
    test_results := test_results || jsonb_build_object('total_project_creation_count', 'error');
  END;
  
  -- Build final result
  result := jsonb_build_object(
    'success', error_count = 0,
    'summary', jsonb_build_object(
      'total_tests', success_count + error_count,
      'passed', success_count,
      'failed', error_count
    ),
    'test_user_id', test_user_id,
    'test_session_id', test_session_id,
    'test_project_id', test_project_id,
    'test_results', test_results,
    'timestamp', now()
  );
  
  RAISE NOTICE 'Comprehensive test completed. Success: %, Errors: %', success_count, error_count;
  
  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION comprehensive_project_tracking_test(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION comprehensive_project_tracking_test(UUID) TO service_role;
