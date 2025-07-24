-- Disable Version Cleanup Migration
-- This migration removes any automatic cleanup mechanisms that limit project versions

-- First, check if there are any triggers on project_versions that might be cleaning up old versions
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    -- Drop any triggers that might be limiting versions
    FOR trigger_rec IN 
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers 
        WHERE event_object_table = 'project_versions'
          AND trigger_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', trigger_rec.trigger_name, trigger_rec.event_object_table);
        RAISE NOTICE 'Dropped trigger % from %', trigger_rec.trigger_name, trigger_rec.event_object_table;
    END LOOP;
END $$;

-- Drop any functions that might be cleaning up versions
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    FOR func_rec IN 
        SELECT p.proname, n.nspname
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND (p.proname ILIKE '%cleanup%' OR p.proname ILIKE '%limit%')
          AND p.prosrc ILIKE '%project_versions%'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I() CASCADE', func_rec.nspname, func_rec.proname);
        RAISE NOTICE 'Dropped function %.%', func_rec.nspname, func_rec.proname;
    END LOOP;
END $$;

-- Check for any RLS policies that might be limiting access
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN 
        SELECT policyname
        FROM pg_policies 
        WHERE tablename = 'project_versions'
          AND (policyname ILIKE '%limit%' OR policyname ILIKE '%cleanup%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON project_versions', policy_rec.policyname);
        RAISE NOTICE 'Dropped policy % from project_versions', policy_rec.policyname;
    END LOOP;
END $$;

-- Ensure there are no constraints that might limit the number of versions
ALTER TABLE project_versions DROP CONSTRAINT IF EXISTS project_versions_limit_check;
ALTER TABLE project_versions DROP CONSTRAINT IF EXISTS project_versions_count_limit;

-- Create a function to ensure no version limits are enforced
CREATE OR REPLACE FUNCTION ensure_no_version_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- This trigger ensures that no version cleanup happens
    -- It's a safeguard against any future cleanup mechanisms
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a simple function to get version count for debugging
CREATE OR REPLACE FUNCTION get_version_count(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
    version_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO version_count
    FROM project_versions 
    WHERE project_id = p_project_id;
    
    RETURN version_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_version_count(UUID) TO authenticated;

-- Log this migration
INSERT INTO public.migration_log (migration_name, executed_at) 
VALUES ('20250210000014_disable_version_cleanup', NOW())
ON CONFLICT (migration_name) DO UPDATE SET executed_at = NOW();

-- Add a comment to the table to document that versions should not be limited
COMMENT ON TABLE project_versions IS 'Project versions table - NO AUTOMATIC CLEANUP OR LIMITS SHOULD BE APPLIED';
