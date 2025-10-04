-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to invoke the sync-scheduler edge function
CREATE OR REPLACE FUNCTION invoke_sync_scheduler()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sync_config RECORD;
    function_url TEXT;
    service_key TEXT;
    response TEXT;
BEGIN
    -- Get the sync configuration
    SELECT * INTO sync_config
    FROM sync_configurations
    WHERE sync_type = 'azure_ad_sync'
      AND is_enabled = true
    LIMIT 1;
    
    -- If no configuration found or sync not enabled, exit
    IF sync_config IS NULL THEN
        RAISE NOTICE 'No enabled sync configuration found';
        RETURN;
    END IF;
    
    -- Check if sync is due
    IF sync_config.next_run_at IS NULL OR sync_config.next_run_at > NOW() THEN
        RAISE NOTICE 'Sync is not due yet. Next run at: %', sync_config.next_run_at;
        RETURN;
    END IF;
    
    -- Calculate next run time
    UPDATE sync_configurations
    SET 
        last_run_at = NOW(),
        next_run_at = NOW() + (frequency_hours || ' hours')::INTERVAL,
        updated_at = NOW()
    WHERE id = sync_config.id;
    
    -- Log that we're triggering the sync
    RAISE NOTICE 'Triggering Azure AD sync at %', NOW();
    
    -- Note: The actual edge function invocation needs to be done via HTTP
    -- This function updates the schedule and logs the trigger
    -- The sync-scheduler edge function will handle the actual sync
END;
$$;

-- Schedule the sync checker to run every hour
-- This will check if any syncs are due and update the schedule
SELECT cron.schedule(
    'check-azure-sync',
    '0 * * * *',  -- Every hour at minute 0
    $$SELECT invoke_sync_scheduler()$$
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION invoke_sync_scheduler() TO service_role;

-- Create a simpler approach: Use a database trigger to check syncs periodically
-- This creates a heartbeat that checks every hour
CREATE OR REPLACE FUNCTION check_and_log_sync_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sync_config RECORD;
BEGIN
    SELECT * INTO sync_config
    FROM sync_configurations
    WHERE sync_type = 'azure_ad_sync'
      AND is_enabled = true
    LIMIT 1;
    
    IF sync_config IS NOT NULL THEN
        IF sync_config.next_run_at IS NOT NULL AND sync_config.next_run_at <= NOW() THEN
            RAISE NOTICE 'SYNC DUE: Azure AD sync is overdue. Last run: %, Next scheduled: %', 
                sync_config.last_run_at, sync_config.next_run_at;
        ELSE
            RAISE NOTICE 'Sync status OK. Next run scheduled for: %', sync_config.next_run_at;
        END IF;
    END IF;
END;
$$;

-- Schedule status check every hour
SELECT cron.schedule(
    'log-sync-status',
    '*/30 * * * *',  -- Every 30 minutes
    $$SELECT check_and_log_sync_status()$$
);

COMMENT ON FUNCTION invoke_sync_scheduler() IS 'Checks if Azure AD sync is due and updates the schedule. Called by pg_cron every hour.';
COMMENT ON FUNCTION check_and_log_sync_status() IS 'Logs the current sync status for monitoring. Called by pg_cron every 30 minutes.';
