-- Fix missing database functions for project creation tracking

-- Create the test_project_creation_tracking function
CREATE OR REPLACE FUNCTION test_project_creation_tracking(
  p_user_id UUID,
  p_test_project_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_session_id UUID;
  result JSON;
  test_success BOOLEAN := FALSE;
  error_message TEXT := NULL;
BEGIN
  -- Generate a test session ID
  test_session_id := gen_random_uuid();
  
  -- Log the test attempt
  RAISE NOTICE 'Testing project creation tracking for user: %, test_project_id: %', p_user_id, COALESCE(p_test_project_id, 'auto-generated');
  
  BEGIN
    -- Insert a test project creation log entry
    INSERT INTO user_activity_logs (
      user_id,
      session_id,
      activity_type,
      activity_data,
      page_url
    ) VALUES (
      p_user_id,
      test_session_id,
      'project_creation',
      jsonb_build_object(
        'project_id', COALESCE(p_test_project_id, 'test-project-' || extract(epoch from now())),
        'project_title', 'Test Project Creation Tracking',
        'department', 'Test Department',
        'timestamp', now(),
        'test', true
      ),
      'test-page'
    );
    
    -- Try to update daily usage metrics
    PERFORM update_daily_usage_metrics(p_user_id, 'project_creation');
    
    test_success := TRUE;
    
  EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;
    RAISE NOTICE 'Error in test_project_creation_tracking: %', error_message;
  END;
  
  -- Build result JSON
  result := jsonb_build_object(
    'success', test_success,
    'user_id', p_user_id,
    'test_session_id', test_session_id,
    'test_project_id', COALESCE(p_test_project_id, 'auto-generated'),
    'error', error_message,
    'timestamp', now()
  );
  
  RETURN result;
END;
$$;

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS update_daily_usage_metrics(UUID, TEXT);

-- Fix the update_daily_usage_metrics function to handle project_creation properly
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
  existing_record RECORD;
BEGIN
  -- Log the function call
  RAISE NOTICE 'update_daily_usage_metrics called with user_id: %, activity_type: %', p_user_id, p_activity_type;
  
  -- Check if record exists for today
  SELECT * INTO existing_record
  FROM usage_metrics
  WHERE user_id = p_user_id AND date = today_date;
  
  IF existing_record IS NULL THEN
    -- Create new record
    RAISE NOTICE 'Creating new usage_metrics record for user: % on date: %', p_user_id, today_date;
    
    INSERT INTO usage_metrics (
      user_id,
      date,
      login_count,
      page_views,
      session_time_minutes,
      project_count,
      last_login
    ) VALUES (
      p_user_id,
      today_date,
      CASE WHEN p_activity_type = 'login' THEN 1 ELSE 0 END,
      CASE WHEN p_activity_type = 'page_view' THEN 1 ELSE 0 END,
      0, -- session_time_minutes will be updated separately
      CASE WHEN p_activity_type = 'project_creation' THEN 1 ELSE 0 END,
      CASE WHEN p_activity_type = 'login' THEN NOW() ELSE NULL END
    );
    
  ELSE
    -- Update existing record
    RAISE NOTICE 'Updating existing usage_metrics record for user: % on date: %', p_user_id, today_date;
    
    UPDATE usage_metrics
    SET
      login_count = CASE 
        WHEN p_activity_type = 'login' THEN login_count + 1 
        ELSE login_count 
      END,
      page_views = CASE 
        WHEN p_activity_type = 'page_view' THEN page_views + 1 
        ELSE page_views 
      END,
      project_count = CASE 
        WHEN p_activity_type = 'project_creation' THEN project_count + 1 
        ELSE project_count 
      END,
      last_login = CASE 
        WHEN p_activity_type = 'login' THEN NOW() 
        ELSE last_login 
      END,
      updated_at = NOW()
    WHERE user_id = p_user_id AND date = today_date;
    
  END IF;
  
  RAISE NOTICE 'Successfully updated usage_metrics for user: %, activity_type: %', p_user_id, p_activity_type;
  RETURN TRUE;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in update_daily_usage_metrics: %', SQLERRM;
  RETURN FALSE;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION test_project_creation_tracking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_usage_metrics(UUID, TEXT) TO authenticated;

-- Ensure the usage_metrics table has the correct structure
DO $$
BEGIN
  -- Add project_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usage_metrics' AND column_name = 'project_count'
  ) THEN
    ALTER TABLE usage_metrics ADD COLUMN project_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added project_count column to usage_metrics table';
  END IF;
END
$$;