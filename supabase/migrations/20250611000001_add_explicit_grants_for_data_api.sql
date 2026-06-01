-- Migration: Add explicit GRANT statements for all public tables
-- Purpose: Prepare for Supabase Data API permission changes (enforced Oct 30, 2026)
-- Risk: None - GRANT statements are additive and do not affect existing data or schema
-- Rollback: REVOKE statements can instantly reverse any GRANT

DO $$
DECLARE
  tbl RECORD;
BEGIN
  -- Define grants for each table that exists in the database
  -- Pattern: full CRUD for authenticated, SELECT for anon (where applicable), ALL for service_role

  -- Core project tables (full access for authenticated users)
  FOR tbl IN
    SELECT unnest(ARRAY[
      'projects', 'milestones', 'accomplishments', 'next_period_activities',
      'risks', 'considerations', 'changes', 'tasks', 'project_summaries',
      'project_versions', 'profiles', 'departments', 'pm_knowledge'
    ]) AS table_name
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl.table_name) THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', tbl.table_name);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.table_name);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
      RAISE NOTICE 'Granted permissions on public.%', tbl.table_name;
    ELSE
      RAISE NOTICE 'Table public.% does not exist, skipping', tbl.table_name;
    END IF;
  END LOOP;

  -- Auth-only tables (no anon access needed)
  FOR tbl IN
    SELECT unnest(ARRAY[
      'chat_conversations', 'chat_messages', 'user_sessions',
      'user_activity_logs', 'pending_users'
    ]) AS table_name
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl.table_name) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.table_name);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
      RAISE NOTICE 'Granted permissions on public.%', tbl.table_name;
    ELSE
      RAISE NOTICE 'Table public.% does not exist, skipping', tbl.table_name;
    END IF;
  END LOOP;

  -- Limited-access tables (read + insert for authenticated, full for service_role)
  FOR tbl IN
    SELECT unnest(ARRAY[
      'ai_usage_tracking', 'scheduler_logs'
    ]) AS table_name
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl.table_name) THEN
      EXECUTE format('GRANT SELECT, INSERT ON public.%I TO authenticated', tbl.table_name);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
      RAISE NOTICE 'Granted permissions on public.%', tbl.table_name;
    ELSE
      RAISE NOTICE 'Table public.% does not exist, skipping', tbl.table_name;
    END IF;
  END LOOP;

  -- Usage metrics table (read + insert + update for authenticated)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usage_metrics') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.usage_metrics TO authenticated';
    EXECUTE 'GRANT ALL ON public.usage_metrics TO service_role';
    RAISE NOTICE 'Granted permissions on public.usage_metrics';
  END IF;

  -- Reminder emails table (read + insert + update for authenticated)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reminder_emails') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.reminder_emails TO authenticated';
    EXECUTE 'GRANT ALL ON public.reminder_emails TO service_role';
    RAISE NOTICE 'Granted permissions on public.reminder_emails';
  END IF;

  -- Admin/sync tables (read for authenticated, full for service_role)
  FOR tbl IN
    SELECT unnest(ARRAY[
      'sync_configurations', 'directory_users', 'azure_sync_logs', 'migration_log'
    ]) AS table_name
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl.table_name) THEN
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', tbl.table_name);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
      RAISE NOTICE 'Granted permissions on public.%', tbl.table_name;
    ELSE
      RAISE NOTICE 'Table public.% does not exist, skipping', tbl.table_name;
    END IF;
  END LOOP;

  -- Special case: sync_configurations needs INSERT/UPDATE for admin users
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sync_configurations') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_configurations TO authenticated';
    RAISE NOTICE 'Granted full CRUD on public.sync_configurations to authenticated';
  END IF;

  -- Special case: azure_sync_logs needs INSERT/UPDATE for sync operations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'azure_sync_logs') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.azure_sync_logs TO authenticated';
    RAISE NOTICE 'Granted SELECT, INSERT, UPDATE on public.azure_sync_logs to authenticated';
  END IF;

  -- Special case: directory_users needs read access for user selection
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'directory_users') THEN
    EXECUTE 'GRANT SELECT ON public.directory_users TO authenticated';
    RAISE NOTICE 'Granted SELECT on public.directory_users to authenticated';
  END IF;

END $$;
