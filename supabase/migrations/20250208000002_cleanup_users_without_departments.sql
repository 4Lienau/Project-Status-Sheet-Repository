-- Clean up users without departments from directory_users table
-- This removes users that have null, empty, or whitespace-only departments

-- First, let's see how many users will be affected (for logging)
DO $$
DECLARE
    users_to_remove INTEGER;
BEGIN
    SELECT COUNT(*) INTO users_to_remove
    FROM directory_users 
    WHERE department IS NULL 
       OR department = '' 
       OR TRIM(department) = '';
    
    RAISE NOTICE 'Found % users without valid departments to be removed', users_to_remove;
END $$;

-- Remove users without valid departments
DELETE FROM directory_users 
WHERE department IS NULL 
   OR department = '' 
   OR TRIM(department) = '';

-- Log the cleanup
INSERT INTO azure_sync_logs (
    sync_status,
    sync_started_at,
    sync_completed_at,
    users_processed,
    users_created,
    users_updated,
    users_deactivated,
    error_message
) VALUES (
    'completed',
    NOW(),
    NOW(),
    0,
    0,
    0,
    (SELECT COUNT(*) FROM directory_users WHERE department IS NULL OR department = '' OR TRIM(department) = ''),
    'Manual cleanup: Removed users without valid departments'
);
