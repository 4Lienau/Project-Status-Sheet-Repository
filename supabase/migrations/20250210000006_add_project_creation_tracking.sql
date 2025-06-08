-- Migration: Add project creation tracking support
-- Purpose: Ensure the usage tracking system properly handles project creation events
-- Date: 2025-02-10

-- Add project_creation as a recognized activity type in the update_daily_usage_metrics function
-- This ensures that project creation events are properly counted in daily metrics

-- Update the function to handle project_creation activity type
CREATE OR REPLACE FUNCTION update_daily_usage_metrics(
    p_user_id UUID,
    p_activity_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Get today's date
    DECLARE
        today_date DATE := CURRENT_DATE;
    BEGIN
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
    END;
END;
$$;

-- Add a comment to document the function
COMMENT ON FUNCTION update_daily_usage_metrics(UUID, TEXT) IS 'Updates daily usage metrics for a user, including project creation tracking';

-- Create an index on user_activity_logs for project creation queries
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_project_creation 
ON user_activity_logs (activity_type, user_id, created_at) 
WHERE activity_type = 'project_creation';

-- Add a comment to document the index
COMMENT ON INDEX idx_user_activity_logs_project_creation IS 'Optimizes queries for project creation activity tracking';

-- Create a function to get project creation statistics
CREATE OR REPLACE FUNCTION get_project_creation_stats()
RETURNS TABLE (
    total_projects_created BIGINT,
    unique_project_creators BIGINT,
    projects_created_last_7_days BIGINT,
    projects_created_last_30_days BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_projects_created,
        COUNT(DISTINCT user_id) as unique_project_creators,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as projects_created_last_7_days,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as projects_created_last_30_days
    FROM user_activity_logs 
    WHERE activity_type = 'project_creation';
END;
$$;

-- Add a comment to document the function
COMMENT ON FUNCTION get_project_creation_stats() IS 'Returns comprehensive project creation statistics for analytics';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_project_creation_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_usage_metrics(UUID, TEXT) TO authenticated;
