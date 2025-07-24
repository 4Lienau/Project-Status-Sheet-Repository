-- Investigation: Project Version Limitation Analysis
-- This migration creates functions to analyze version patterns and identify potential limitations

-- Function to check for any cleanup triggers or policies that might be limiting versions
CREATE OR REPLACE FUNCTION check_version_cleanup_triggers()
RETURNS TABLE (
  trigger_type TEXT,
  trigger_name TEXT,
  table_name TEXT,
  trigger_definition TEXT
) AS $
BEGIN
  -- Check for triggers on project_versions table
  RETURN QUERY
  SELECT 
    'table_trigger'::TEXT,
    t.trigger_name::TEXT,
    t.event_object_table::TEXT,
    t.action_statement::TEXT
  FROM information_schema.triggers t
  WHERE t.event_object_table = 'project_versions'
    AND t.trigger_schema = 'public';

  -- Check for any functions that might delete old versions
  RETURN QUERY
  SELECT 
    'cleanup_function'::TEXT,
    p.proname::TEXT,
    'functions'::TEXT,
    pg_get_functiondef(p.oid)::TEXT
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND (p.prosrc ILIKE '%project_versions%' AND p.prosrc ILIKE '%DELETE%')
    OR p.proname ILIKE '%cleanup%'
    OR p.proname ILIKE '%version%';

END;
$ LANGUAGE plpgsql;

-- Function to analyze version patterns for a specific project
CREATE OR REPLACE FUNCTION analyze_project_versions(project_uuid UUID)
RETURNS TABLE (
  analysis_type TEXT,
  result_value TEXT,
  details JSONB
) AS $
BEGIN
  -- Check total versions for this project
  RETURN QUERY
  SELECT 
    'total_versions'::TEXT,
    COUNT(*)::TEXT,
    jsonb_build_object(
      'project_id', project_uuid,
      'query_time', NOW()
    )
  FROM project_versions 
  WHERE project_id = project_uuid;

  -- Check version number range
  RETURN QUERY
  SELECT 
    'version_range'::TEXT,
    COALESCE(MIN(version_number)::TEXT || ' to ' || MAX(version_number)::TEXT, 'no_versions'),
    jsonb_build_object(
      'min_version', MIN(version_number),
      'max_version', MAX(version_number),
      'expected_count', CASE 
        WHEN MIN(version_number) IS NOT NULL AND MAX(version_number) IS NOT NULL 
        THEN MAX(version_number) - MIN(version_number) + 1
        ELSE 0
      END,
      'actual_count', COUNT(*)
    )
  FROM project_versions 
  WHERE project_id = project_uuid;

  -- Check for gaps in version sequence
  RETURN QUERY
  WITH version_gaps AS (
    SELECT 
      generate_series(
        COALESCE((SELECT MIN(version_number) FROM project_versions WHERE project_id = project_uuid), 1),
        COALESCE((SELECT MAX(version_number) FROM project_versions WHERE project_id = project_uuid), 1)
      ) AS expected_version
  ),
  missing_versions AS (
    SELECT expected_version
    FROM version_gaps
    WHERE expected_version NOT IN (
      SELECT version_number 
      FROM project_versions 
      WHERE project_id = project_uuid
    )
  )
  SELECT 
    'missing_versions'::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'none'
      ELSE array_to_string(array_agg(expected_version::TEXT ORDER BY expected_version), ', ')
    END,
    jsonb_build_object(
      'missing_count', COUNT(*),
      'missing_versions', array_agg(expected_version ORDER BY expected_version)
    )
  FROM missing_versions;

  -- Check creation timestamps to identify patterns
  RETURN QUERY
  SELECT 
    'creation_pattern'::TEXT,
    'timestamp_analysis',
    jsonb_build_object(
      'oldest_version', MIN(created_at),
      'newest_version', MAX(created_at),
      'time_span_hours', EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 3600,
      'versions_by_hour', (
        SELECT jsonb_object_agg(
          date_trunc('hour', created_at)::TEXT,
          COUNT(*)
        )
        FROM project_versions 
        WHERE project_id = project_uuid
      )
    )
  FROM project_versions 
  WHERE project_id = project_uuid;

END;
$ LANGUAGE plpgsql;

-- Function to test version creation limits
CREATE OR REPLACE FUNCTION test_version_creation_limit(project_uuid UUID, test_count INTEGER DEFAULT 15)
RETURNS TABLE (
  test_step INTEGER,
  action TEXT,
  success BOOLEAN,
  version_number INTEGER,
  total_versions_after INTEGER,
  error_message TEXT
) AS $$
DECLARE
  current_max_version INTEGER;
  test_version_number INTEGER;
  insert_success BOOLEAN;
  error_msg TEXT;
BEGIN
  -- Get current max version
  SELECT COALESCE(MAX(version_number), 0) INTO current_max_version
  FROM project_versions 
  WHERE project_id = project_uuid;

  -- Test creating versions beyond current limit
  FOR i IN 1..test_count LOOP
    test_version_number := current_max_version + i;
    insert_success := TRUE;
    error_msg := NULL;

    BEGIN
      -- Attempt to insert test version
      INSERT INTO project_versions (
        project_id,
        version_number,
        data,
        created_by
      ) VALUES (
        project_uuid,
        test_version_number,
        jsonb_build_object(
          'title', 'Test Version ' || test_version_number,
          'description', 'Test version created by limitation analysis',
          'test_marker', true,
          'created_at', NOW()
        ),
        '00000000-0000-0000-0000-000000000000'::UUID
      );
    EXCEPTION WHEN OTHERS THEN
      insert_success := FALSE;
      error_msg := SQLERRM;
    END;

    -- Return test result
    RETURN QUERY
    SELECT 
      i,
      'insert_test_version'::TEXT,
      insert_success,
      test_version_number,
      (SELECT COUNT(*)::INTEGER FROM project_versions WHERE project_id = project_uuid),
      error_msg;
  END LOOP;

  -- Clean up test versions
  DELETE FROM project_versions 
  WHERE project_id = project_uuid 
    AND data->>'test_marker' = 'true';

  RETURN QUERY
  SELECT 
    test_count + 1,
    'cleanup_test_versions'::TEXT,
    TRUE,
    0,
    (SELECT COUNT(*)::INTEGER FROM project_versions WHERE project_id = project_uuid),
    'Test versions cleaned up'::TEXT;

END;
$$ LANGUAGE plpgsql;

-- Function to check for any cleanup mechanisms or triggers
CREATE OR REPLACE FUNCTION check_version_cleanup_mechanisms()
RETURNS TABLE (
  mechanism_type TEXT,
  mechanism_name TEXT,
  details JSONB
) AS $$
BEGIN
  -- Check for triggers on project_versions table
  RETURN QUERY
  SELECT 
    'trigger'::TEXT,
    trigger_name::TEXT,
    jsonb_build_object(
      'event', event_manipulation,
      'timing', action_timing,
      'function', action_statement
    )
  FROM information_schema.triggers 
  WHERE event_object_table = 'project_versions';

  -- Check for functions that might delete versions
  RETURN QUERY
  SELECT 
    'function'::TEXT,
    routine_name::TEXT,
    jsonb_build_object(
      'routine_type', routine_type,
      'data_type', data_type,
      'routine_definition', routine_definition
    )
  FROM information_schema.routines 
  WHERE routine_definition ILIKE '%project_versions%' 
    AND routine_definition ILIKE '%DELETE%';

  -- Check for scheduled jobs or cron jobs (if any)
  RETURN QUERY
  SELECT 
    'scheduled_job'::TEXT,
    'pg_cron_check'::TEXT,
    jsonb_build_object(
      'cron_extension_exists', EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
      ),
      'note', 'Check for any scheduled cleanup jobs'
    );

END;
$$ LANGUAGE plpgsql;

-- Function to analyze database constraints and policies
CREATE OR REPLACE FUNCTION check_version_constraints()
RETURNS TABLE (
  constraint_type TEXT,
  constraint_name TEXT,
  details JSONB
) AS $$
BEGIN
  -- Check table constraints
  RETURN QUERY
  SELECT 
    'table_constraint'::TEXT,
    constraint_name::TEXT,
    jsonb_build_object(
      'constraint_type', constraint_type,
      'table_name', table_name,
      'column_name', column_name,
      'check_clause', check_clause
    )
  FROM information_schema.table_constraints tc
  LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
  LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_name = 'project_versions';

  -- Check RLS policies
  RETURN QUERY
  SELECT 
    'rls_policy'::TEXT,
    policyname::TEXT,
    jsonb_build_object(
      'permissive', permissive,
      'roles', roles,
      'cmd', cmd,
      'qual', qual,
      'with_check', with_check
    )
  FROM pg_policies 
  WHERE tablename = 'project_versions';

END;
$$ LANGUAGE plpgsql;

-- Function to disable any version cleanup mechanisms
CREATE OR REPLACE FUNCTION disable_version_cleanup_mechanisms()
RETURNS TABLE (
  action_type TEXT,
  action_target TEXT,
  success BOOLEAN,
  message TEXT
) AS $
DECLARE
  trigger_record RECORD;
  function_record RECORD;
BEGIN
  -- Check for and disable any triggers that might be cleaning up versions
  FOR trigger_record IN 
    SELECT trigger_name, event_object_table
    FROM information_schema.triggers 
    WHERE event_object_table = 'project_versions'
      AND trigger_schema = 'public'
      AND (trigger_name ILIKE '%cleanup%' OR trigger_name ILIKE '%limit%' OR trigger_name ILIKE '%delete%')
  LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trigger_record.trigger_name, trigger_record.event_object_table);
      
      RETURN QUERY
      SELECT 
        'trigger_removal'::TEXT,
        trigger_record.trigger_name::TEXT,
        TRUE,
        format('Removed trigger %s from %s', trigger_record.trigger_name, trigger_record.event_object_table)::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY
      SELECT 
        'trigger_removal'::TEXT,
        trigger_record.trigger_name::TEXT,
        FALSE,
        format('Failed to remove trigger %s: %s', trigger_record.trigger_name, SQLERRM)::TEXT;
    END;
  END LOOP;

  -- Check for and disable any cleanup functions
  FOR function_record IN 
    SELECT p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND (p.proname ILIKE '%version_cleanup%' OR p.proname ILIKE '%cleanup_old_versions%')
  LOOP
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS %I() CASCADE', function_record.proname);
      
      RETURN QUERY
      SELECT 
        'function_removal'::TEXT,
        function_record.proname::TEXT,
        TRUE,
        format('Removed cleanup function %s', function_record.proname)::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY
      SELECT 
        'function_removal'::TEXT,
        function_record.proname::TEXT,
        FALSE,
        format('Failed to remove function %s: %s', function_record.proname, SQLERRM)::TEXT;
    END;
  END LOOP;

  -- Return success message if no cleanup mechanisms found
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'no_cleanup_found'::TEXT,
      'none'::TEXT,
      TRUE,
      'No version cleanup mechanisms found to disable'::TEXT;
  END IF;

END;
$ LANGUAGE plpgsql;

-- Create a comprehensive analysis function
CREATE OR REPLACE FUNCTION comprehensive_version_analysis(project_uuid UUID)
RETURNS TABLE (
  section TEXT,
  analysis_type TEXT,
  result_value TEXT,
  details JSONB
) AS $
BEGIN
  -- Project version analysis
  RETURN QUERY
  SELECT 
    'project_analysis'::TEXT,
    analysis_type,
    result_value,
    details
  FROM analyze_project_versions(project_uuid);

  -- Cleanup mechanism check
  RETURN QUERY
  SELECT 
    'cleanup_mechanisms'::TEXT,
    mechanism_type,
    mechanism_name,
    details
  FROM check_version_cleanup_mechanisms();

  -- Constraint analysis
  RETURN QUERY
  SELECT 
    'constraints'::TEXT,
    constraint_type,
    constraint_name,
    details
  FROM check_version_constraints();

  -- Cleanup trigger analysis
  RETURN QUERY
  SELECT 
    'cleanup_triggers'::TEXT,
    trigger_type,
    trigger_name,
    jsonb_build_object(
      'table_name', table_name,
      'definition', trigger_definition
    )
  FROM check_version_cleanup_triggers();

END;
$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION analyze_project_versions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION test_version_creation_limit(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_version_cleanup_mechanisms() TO authenticated;
GRANT EXECUTE ON FUNCTION check_version_constraints() TO authenticated;
GRANT EXECUTE ON FUNCTION check_version_cleanup_triggers() TO authenticated;
GRANT EXECUTE ON FUNCTION disable_version_cleanup_mechanisms() TO authenticated;
GRANT EXECUTE ON FUNCTION comprehensive_version_analysis(UUID) TO authenticated;

-- Create migration_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.migration_log (
  migration_name TEXT PRIMARY KEY,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create direct SQL functions to bypass potential ORM limitations
CREATE OR REPLACE FUNCTION get_all_project_versions_direct(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  version_number INTEGER,
  data JSONB,
  created_at TIMESTAMPTZ,
  created_by UUID
) AS $
BEGIN
  -- Use direct SQL to return ALL versions without any potential limits
  RETURN QUERY
  EXECUTE format('
    SELECT 
      pv.id,
      pv.project_id,
      pv.version_number,
      pv.data,
      pv.created_at,
      pv.created_by
    FROM project_versions pv
    WHERE pv.project_id = $1
    ORDER BY pv.version_number DESC
  ') USING p_project_id;
END;
$ LANGUAGE plpgsql;

-- Create function to count all versions
CREATE OR REPLACE FUNCTION count_all_project_versions(p_project_id UUID)
RETURNS INTEGER AS $
DECLARE
  version_count INTEGER;
BEGIN
  -- Use direct SQL to count ALL versions
  EXECUTE format('
    SELECT COUNT(*) FROM project_versions WHERE project_id = $1
  ') INTO version_count USING p_project_id;
  
  RETURN version_count;
END;
$ LANGUAGE plpgsql;

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION get_all_project_versions_direct(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION count_all_project_versions(UUID) TO authenticated;

-- Log the migration
INSERT INTO public.migration_log (migration_name, executed_at) 
VALUES ('20250210000013_investigate_version_limitation', NOW())
ON CONFLICT (migration_name) DO UPDATE SET executed_at = NOW();
