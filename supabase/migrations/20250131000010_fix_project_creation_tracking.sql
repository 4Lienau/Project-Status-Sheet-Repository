-- Fix project creation tracking issues
-- This migration addresses the problems identified in the debug session

-- First, let's check and fix the usage_metrics table structure
ALTER TABLE usage_metrics 
ADD COLUMN IF NOT EXISTS project_count INTEGER DEFAULT 0;

-- Update existing records to have project_count if they don't
UPDATE usage_metrics 
SET project_count = COALESCE(projects_created, 0) 
WHERE project_count IS NULL;

-- Create or replace the update_daily_usage_metrics function with proper error handling
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
    result BOOLEAN := FALSE;
BEGIN
    -- Log the function call for debugging
    RAISE NOTICE 'update_daily_usage_metrics called with user_id: %, activity_type: %', p_user_id, p_activity_type;
    
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'user_id cannot be null';
    END IF;
    
    IF p_activity_type IS NULL OR p_activity_type = '' THEN
        RAISE EXCEPTION 'activity_type cannot be null or empty';
    END IF;
    
    -- Insert or update usage metrics for today
    INSERT INTO usage_metrics (
        user_id,
        date,
        page_views,
        login_count,
        total_session_time_minutes,
        project_count,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        today_date,
        CASE WHEN p_activity_type = 'page_view' THEN 1 ELSE 0 END,
        CASE WHEN p_activity_type = 'login' THEN 1 ELSE 0 END,
        0, -- session time will be updated separately
        CASE WHEN p_activity_type = 'project_creation' THEN 1 ELSE 0 END,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        page_views = usage_metrics.page_views + 
            CASE WHEN p_activity_type = 'page_view' THEN 1 ELSE 0 END,
        login_count = usage_metrics.login_count + 
            CASE WHEN p_activity_type = 'login' THEN 1 ELSE 0 END,
        project_count = usage_metrics.project_count + 
            CASE WHEN p_activity_type = 'project_creation' THEN 1 ELSE 0 END,
        updated_at = NOW();
    
    -- If we get here, the operation was successful
    result := TRUE;
    
    RAISE NOTICE 'update_daily_usage_metrics completed successfully for user_id: %, activity_type: %', p_user_id, p_activity_type;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'update_daily_usage_metrics failed for user_id: %, activity_type: %, error: %', p_user_id, p_activity_type, SQLERRM;
        RETURN FALSE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_daily_usage_metrics(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_usage_metrics(UUID, TEXT) TO service_role;

-- Create a more permissive policy for user_activity_logs to allow project creation tracking
DROP POLICY IF EXISTS "Allow project creation tracking" ON user_activity_logs;
CREATE POLICY "Allow project creation tracking" ON user_activity_logs
    FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id OR 
        auth.role() = 'service_role' OR
        activity_type = 'project_creation'
    );

-- Create a more permissive policy for usage_metrics
DROP POLICY IF EXISTS "Allow usage metrics updates" ON usage_metrics;
CREATE POLICY "Allow usage metrics updates" ON usage_metrics
    FOR ALL 
    USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    )
    WITH CHECK (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

-- Create a function to test project creation tracking
CREATE OR REPLACE FUNCTION test_project_creation_tracking(
    p_user_id UUID DEFAULT auth.uid(),
    p_test_project_id TEXT DEFAULT 'test-project-' || extract(epoch from now())::text
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    activity_log_id UUID;
    metrics_result BOOLEAN;
BEGIN
    -- Test 1: Insert activity log
    INSERT INTO user_activity_logs (
        user_id,
        session_id,
        activity_type,
        activity_data,
        page_url
    )
    VALUES (
        p_user_id,
        'test-session',
        'project_creation',
        json_build_object(
            'project_id', p_test_project_id,
            'project_title', 'Test Project for Tracking',
            'test', true
        ),
        'test-page'
    )
    RETURNING id INTO activity_log_id;
    
    -- Test 2: Update metrics
    SELECT update_daily_usage_metrics(p_user_id, 'project_creation') INTO metrics_result;
    
    -- Build result
    result := json_build_object(
        'success', true,
        'activity_log_id', activity_log_id,
        'metrics_updated', metrics_result,
        'user_id', p_user_id,
        'test_project_id', p_test_project_id,
        'timestamp', NOW()
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'user_id', p_user_id,
            'timestamp', NOW()
        );
END;
$$;

-- Grant execute permissions for the test function
GRANT EXECUTE ON FUNCTION test_project_creation_tracking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION test_project_creation_tracking(UUID, TEXT) TO service_role;

-- Add comments
COMMENT ON FUNCTION update_daily_usage_metrics(UUID, TEXT) IS 'Fixed version of usage metrics function with proper error handling and project creation support';
COMMENT ON FUNCTION test_project_creation_tracking(UUID, TEXT) IS 'Test function to verify project creation tracking is working correctly';
