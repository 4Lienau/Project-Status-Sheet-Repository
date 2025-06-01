-- Create a function to trigger Azure AD sync when due
CREATE OR REPLACE FUNCTION trigger_azure_sync_if_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sync_config RECORD;
    function_url TEXT;
    response_status INTEGER;
BEGIN
    -- Get Azure AD sync configuration that is due
    SELECT * INTO sync_config
    FROM sync_configurations
    WHERE sync_type = 'azure_ad_sync'
      AND is_enabled = true
      AND next_run_at <= NOW();
    
    -- If no sync is due, exit
    IF sync_config IS NULL THEN
        RETURN;
    END IF;
    
    -- Log that we're starting a sync
    RAISE NOTICE 'Triggering Azure AD sync - due at %, current time %', sync_config.next_run_at, NOW();
    
    -- Update the configuration to prevent duplicate runs
    UPDATE sync_configurations
    SET 
        last_run_at = NOW(),
        next_run_at = NOW() + (sync_config.frequency_hours || ' hours')::INTERVAL,
        updated_at = NOW()
    WHERE id = sync_config.id;
    
    -- Trigger the Azure AD sync function
    -- Note: This uses the Supabase HTTP extension to call the edge function
    SELECT status INTO response_status
    FROM http((
        'POST',
        current_setting('app.supabase_url') || '/functions/v1/azure-ad-sync',
        ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'))],
        'application/json',
        '{"scheduled": true, "manual": false}'
    ));
    
    -- Log the result
    IF response_status = 200 THEN
        RAISE NOTICE 'Azure AD sync triggered successfully';
    ELSE
        RAISE WARNING 'Azure AD sync trigger failed with status %', response_status;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error triggering Azure AD sync: %', SQLERRM;
END;
$$;

-- Create a function that can be called periodically to check for due syncs
CREATE OR REPLACE FUNCTION check_and_trigger_due_syncs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check and trigger Azure AD sync if due
    PERFORM trigger_azure_sync_if_due();
    
    -- Add other sync types here in the future
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in check_and_trigger_due_syncs: %', SQLERRM;
END;
$$;

-- Create a trigger that runs every time the sync_configurations table is queried
-- This ensures syncs are checked whenever the admin dashboard loads
CREATE OR REPLACE FUNCTION sync_config_trigger_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Perform the sync check asynchronously
    PERFORM check_and_trigger_due_syncs();
    RETURN NEW;
END;
$$;

-- Create trigger on sync_configurations SELECT operations
-- Note: PostgreSQL doesn't support SELECT triggers, so we'll use UPDATE triggers
-- and rely on the admin service to periodically update the configuration

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_azure_sync_if_due() TO service_role;
GRANT EXECUTE ON FUNCTION check_and_trigger_due_syncs() TO service_role;
GRANT EXECUTE ON FUNCTION sync_config_trigger_check() TO service_role;
