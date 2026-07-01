-- Security hardening — Phase 1 (safe; zero app-behavior change)
-- ============================================================================
-- Clears the Supabase Security Advisor findings that carry NO functional risk.
-- Every change here was verified against the app: no client `.rpc()` caller and
-- no pre-login data path is affected. The app requires login + admin approval,
-- so the `anon` (no-JWT) role never reads a table or calls a function.
--
-- Clears:
--   • anon_security_definer_function_executable        (33)  — revoke anon EXECUTE
--   • pg_graphql_anon_table_exposed                    (28)  — revoke anon SELECT
--   • function_search_path_mutable                     (4)   — pin search_path / drop orphan
--   • ~12 of authenticated_security_definer_function_executable — drop backdoor/test,
--        revoke internal trigger/scheduler funcs from `authenticated`
--
-- Deliberately NOT touched here (Phase 2 / accepted-by-design):
--   • rls_policy_always_true (21) — write policies. MUST keep legacy ownerless
--     projects editable; that rewrite is a separate, tested change.
--   • authenticated reads on operational tables — the "users see all projects" model.
--   • SECURITY DEFINER analytics RPCs the client legitimately calls (kept, by design).
--   • extension_in_public (`http`) — schema move, separate change.
-- ============================================================================

-- ── 1. Drop the execute_sql backdoor + orphaned / test functions ─────────────
-- execute_sql(text): SECURITY DEFINER, runs arbitrary SELECT as the owner
--   (bypasses ALL RLS), reachable by anon+authenticated, ZERO callers in src/.
-- insert_daily_note_direct: orphan — the daily_notes table was removed in 2024.
-- comprehensive_project_tracking_test: debugging helper, never called by the app.
-- NOTE: test_project_creation_tracking is deliberately NOT dropped — despite its
--   name, project.ts calls it via supabase.rpc() on every project creation, so it
--   stays (and keeps its authenticated EXECUTE). Its advisor warning is accepted.
-- Looked up by catalog so unknown signatures/overloads are handled; re-runnable.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'execute_sql',
        'insert_daily_note_direct',
        'comprehensive_project_tracking_test')
  LOOP
    EXECUTE format('DROP FUNCTION %s', r.sig);
    RAISE NOTICE 'Dropped %', r.sig;
  END LOOP;
END $$;

-- ── 2. Pin search_path on the remaining mutable-search_path functions ────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'handle_updated_at',
        'resolve_department',
        'update_ad_dept_mappings_updated_at')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
    RAISE NOTICE 'Pinned search_path on %', r.sig;
  END LOOP;
END $$;

-- ── 3. Remove ALL pre-login (anon) access ───────────────────────────────────
-- `anon` = requests with only the publishable key and no user JWT. This app never
-- operates in that state past the login screen. Signup goes through GoTrue (auth
-- schema), and the handle_new_user trigger fires irrespective of caller EXECUTE
-- rights, so dropping anon's grants is invisible to real flows.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE SELECT   ON ALL TABLES    IN SCHEMA public FROM anon;

-- Stop future objects from silently re-granting to anon (objects created by the
-- migration role going forward).
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT  ON TABLES    FROM anon;

-- ── 4. Revoke EXECUTE on internal SECURITY DEFINER funcs from `authenticated` ─
-- These are trigger + scheduler functions with NO client `.rpc()` caller (verified
-- against src/). Trigger functions fire as part of the table operation and do not
-- require the session role to hold EXECUTE, so this does not affect any trigger.
-- (Functions the client genuinely calls — analytics RPCs, can_edit_project,
-- admin_set_user_role, trigger_sync_if_due, session cleanup — are intentionally
-- left executable; their advisor warnings are accepted as by-design.)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'handle_new_user',
        'resolve_pending_project_editors',
        'sync_profile_department_from_directory',
        'sync_config_trigger_check',
        'trigger_azure_sync_if_due',
        'check_azure_sync_due',
        'check_and_trigger_due_syncs',
        'check_and_log_sync_status',
        'invoke_sync_scheduler')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
    RAISE NOTICE 'Revoked authenticated EXECUTE on %', r.sig;
  END LOOP;
END $$;
