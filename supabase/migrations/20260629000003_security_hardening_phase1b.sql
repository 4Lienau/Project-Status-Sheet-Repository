-- Security hardening — Phase 1b: revoke SECURITY DEFINER function EXECUTE FROM PUBLIC
-- ============================================================================
-- Phase 1 (20260629000002) revoked function EXECUTE from `anon`/`authenticated`,
-- but those revokes were no-ops: Postgres grants EXECUTE to the pseudo-role PUBLIC
-- by default on CREATE FUNCTION, and anon/authenticated inherit it. The advisor's
-- has_function_privilege() check therefore still saw them as executable. (The anon
-- *table* revokes DID work, because table grants go to anon directly, not PUBLIC.)
--
-- Correct fix = deny-by-default, allow-list re-grant:
--   • REVOKE EXECUTE … FROM PUBLIC, anon, authenticated  (clean slate)
--   • GRANT  EXECUTE … TO service_role                   (keep backend/edge/cron working)
--   • GRANT  EXECUTE … TO authenticated  ONLY for the functions the app calls
--
-- The allow-list was built from a multi-line-aware scan of every supabase.rpc()
-- call in src/ (single-line greps miss calls where `.rpc(` and the name are on
-- separate lines), PLUS can_edit_project, which authenticated must execute during
-- RLS evaluation. Functions left off the allow-list have no direct caller in any
-- authenticated session — triggers fire as the table owner, schedulers run via
-- cron/service_role, and internal calls run as the SECURITY DEFINER owner — so
-- removing their authenticated/anon EXECUTE changes no app behavior.
--
-- Clears: all remaining anon_security_definer_function_executable, plus the
-- authenticated_security_definer_function_executable findings for every function
-- NOT on the allow-list. The ~18 allow-listed functions remain flagged by design
-- (the app legitimately calls them as an authenticated user).
--
-- Re-runnable; catalog-driven so overloads are all covered.
-- ============================================================================

DO $$
DECLARE
  r record;
  -- Functions the app legitimately calls as `authenticated` (keep executable):
  --   17 from supabase.rpc() in src/ + can_edit_project (used inside RLS policies).
  allowlist text[] := ARRAY[
    'admin_set_user_role',
    'can_edit_project',
    'cleanup_inactive_sessions',
    'cleanup_stale_sessions',
    'end_user_sessions',
    'get_ai_adoption_overview',
    'get_ai_usage_analytics',
    'get_ai_usage_trends',
    'get_auth_users_data',
    'get_comprehensive_user_stats',
    'get_database_size',
    'get_session_statistics',
    'get_table_sizes',
    'get_top_ai_users',
    'get_user_activity_summary',
    'test_project_creation_tracking',
    'trigger_sync_if_due',
    'update_daily_usage_metrics'
  ];
  -- All SECURITY DEFINER functions the advisor flagged, minus the 3 dropped in 1a
  -- (execute_sql, comprehensive_project_tracking_test, insert_daily_note_direct).
  flagged text[] := ARRAY[
    'admin_set_user_role',
    'can_edit_project',
    'check_and_log_sync_status',
    'check_and_trigger_due_syncs',
    'check_azure_sync_due',
    'cleanup_inactive_sessions',
    'cleanup_stale_sessions',
    'end_user_sessions',
    'get_active_users',
    'get_ai_adoption_overview',
    'get_ai_usage_analytics',
    'get_ai_usage_trends',
    'get_auth_users_data',
    'get_auth_users_login_data',
    'get_comprehensive_user_stats',
    'get_database_size',
    'get_project_creation_stats',
    'get_session_statistics',
    'get_table_sizes',
    'get_top_ai_users',
    'get_user_activity_summary',
    'handle_new_user',
    'invoke_sync_scheduler',
    'resolve_pending_project_editors',
    'sync_config_trigger_check',
    'sync_profile_department_from_directory',
    'test_project_creation_tracking',
    'trigger_azure_sync_if_due',
    'trigger_sync_if_due',
    'update_daily_usage_metrics'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(flagged)
  LOOP
    -- Clean slate: strip the inherited PUBLIC grant and any direct client grants.
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    -- Backend (edge functions, cron) keeps execute.
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);

    IF r.proname = ANY(allowlist) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
      RAISE NOTICE 'authenticated + service_role: %', r.sig;
    ELSE
      RAISE NOTICE 'service_role only (internal/trigger/scheduler): %', r.sig;
    END IF;
  END LOOP;
END $$;

-- Stop future functions from silently re-granting EXECUTE to anon via PUBLIC
-- defaults (objects created by the migration role going forward).
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
