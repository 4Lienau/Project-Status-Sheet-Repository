-- Cleanup Debug Functions Migration
-- This migration removes debugging functions that are no longer needed

-- Drop all the debugging and analysis functions created in previous migrations
DROP FUNCTION IF EXISTS analyze_project_versions(UUID) CASCADE;
DROP FUNCTION IF EXISTS test_version_creation_limit(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS check_version_cleanup_mechanisms() CASCADE;
DROP FUNCTION IF EXISTS check_version_constraints() CASCADE;
DROP FUNCTION IF EXISTS check_version_cleanup_triggers() CASCADE;
DROP FUNCTION IF EXISTS disable_version_cleanup_mechanisms() CASCADE;
DROP FUNCTION IF EXISTS comprehensive_version_analysis(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_all_project_versions_direct(UUID) CASCADE;
DROP FUNCTION IF EXISTS count_all_project_versions(UUID) CASCADE;
DROP FUNCTION IF EXISTS ensure_no_version_limits() CASCADE;

-- Keep only the simple get_version_count function as it might be useful
-- All other debugging functions are removed to improve performance

-- Log this cleanup migration
INSERT INTO public.migration_log (migration_name, executed_at) 
VALUES ('20250210000015_cleanup_debug_functions', NOW())
ON CONFLICT (migration_name) DO UPDATE SET executed_at = NOW();
