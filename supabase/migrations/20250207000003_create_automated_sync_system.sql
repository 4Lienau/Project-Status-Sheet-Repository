-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create a function to check and trigger Azure AD sync
CREATE OR REPLACE FUNCTION check_azure_sync_due()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sync_config RECORD;
    next_run_time TIMESTAMPTZ;
BEGIN
    -- Get the Azure AD sync configuration
    SELECT * INTO sync_config
    FROM sync_configurations
    WHERE sync_type = 'azure_ad_sync'
      AND is_enabled = true
    LIMIT 1;
    
    -- If no configuration found, return false
    IF sync_config IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if sync is due (next_run_at is in the past or null)
    IF sync_config.next_run_at IS NULL OR sync_config.next_run_at <= NOW() THEN
        -- Calculate next run time
        next_run_time := NOW() + (sync_config.frequency_hours || ' hours')::INTERVAL;
        
        -- Update the sync configuration to prevent duplicate runs
        UPDATE sync_configurations
        SET 
            last_run_at = NOW(),
            next_run_at = next_run_time,
            updated_at = NOW()
        WHERE id = sync_config.id;
        
        -- Log the sync trigger
        RAISE NOTICE 'Azure AD sync is due. Updated next run time to: %', next_run_time;
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- Create a function that can be called from the application to trigger sync if due
CREATE OR REPLACE FUNCTION trigger_sync_if_due()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_due boolean;
    result json;
BEGIN
    -- Check if sync is due
    SELECT check_azure_sync_due() INTO is_due;
    
    IF is_due THEN
        result := json_build_object(
            'sync_triggered', true,
            'message', 'Azure AD sync was due and has been scheduled',
            'timestamp', NOW()
        );
    ELSE
        result := json_build_object(
            'sync_triggered', false,
            'message', 'Azure AD sync is not due yet',
            'timestamp', NOW()
        );
    END IF;
    
    RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_azure_sync_due() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION trigger_sync_if_due() TO authenticated, service_role;
