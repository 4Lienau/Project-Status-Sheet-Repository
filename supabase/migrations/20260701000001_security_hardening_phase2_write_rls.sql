-- Security hardening — Phase 2: enforce the owner/editor write model on project data
-- ============================================================================
-- The owner/editor policies added in 20260627000008 never took effect: that
-- migration left the old "Enable all operations for all users" policy (command =
-- ALL, USING/CHECK true) in place. RLS permissive policies are OR-ed together, so
-- `true OR can_edit_project(...)` = always true — any authenticated user can still
-- write every project's data. The advisor's rls_policy_always_true findings point
-- at that live hole.
--
-- This migration removes the blanket-true write policies and installs a complete,
-- canonical policy set on all 10 project-data tables:
--   • SELECT  — USING (true)                       (unchanged: users see all projects)
--   • INSERT  — WITH CHECK (can_edit_project(...))  (child) / owner-self (projects)
--   • UPDATE  — USING + CHECK (can_edit_project(...))
--   • DELETE  — USING (can_edit_project(...))
--
-- can_edit_project() (20260627000008) already returns true when:
--   owner_id IS NULL  → legacy/grandfathered projects stay editable by everyone
--   owner_id = auth.uid()  → the owner
--   caller is a designated editor, or an admin
-- So ONLY owned projects become restricted; every legacy project is unaffected.
--
-- Operational tables (usage_metrics, scheduler_logs) are intentionally left for
-- Phase 3 alongside the read-exposure and http-extension work.
--
-- Idempotent: existing write policies are enumerated from pg_policies and dropped,
-- then the canonical set is (re)created. Safe to re-run.
-- ============================================================================

-- ── Child tables: reads open, writes gated by can_edit_project(project_id) ────
DO $$
DECLARE
  t   text;
  pol record;
  child_tables text[] := ARRAY[
    'milestones', 'changes', 'risks', 'considerations',
    'accomplishments', 'next_period_activities', 'tasks',
    'project_summaries', 'project_versions'
  ];
BEGIN
  FOREACH t IN ARRAY child_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Drop every permissive write policy (blanket-true, and any command=ALL policy
    -- which also silently grants writes). SELECT policies are left untouched.
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
        AND permissive = 'PERMISSIVE'
        AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- Canonical policy set (drop-then-create so a re-run replaces cleanly).
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'read_all_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      'read_all_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (can_edit_project(project_id))',
      'editor_insert_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (can_edit_project(project_id)) WITH CHECK (can_edit_project(project_id))',
      'editor_update_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (can_edit_project(project_id))',
      'editor_delete_' || t, t);

    RAISE NOTICE 'Locked writes to editors on public.%', t;
  END LOOP;
END $$;

-- ── projects: reads open, create-as-self, edit/delete gated by can_edit_project ─
DO $$
DECLARE pol record;
BEGIN
  ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

  -- Drop the blanket ALL/true policy, duplicate INSERT-true policies, and the
  -- prior owner/editor UPDATE/DELETE policies (recreated canonically below).
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
      AND permissive = 'PERMISSIVE'
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
  END LOOP;

  -- Normalise the SELECT policy (drop the old name and any prior canonical one).
  DROP POLICY IF EXISTS "Authenticated users can view all projects" ON public.projects;
  DROP POLICY IF EXISTS "read_all_projects" ON public.projects;
  CREATE POLICY "read_all_projects" ON public.projects
    FOR SELECT TO authenticated USING (true);

  -- INSERT: any authenticated user may create a project, but only as themselves
  -- (or unowned). Blocks creating a project owned by someone else.
  CREATE POLICY "authenticated_create_project" ON public.projects
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

  CREATE POLICY "owner_or_editor_update_project" ON public.projects
    FOR UPDATE TO authenticated
    USING (can_edit_project(id)) WITH CHECK (can_edit_project(id));

  CREATE POLICY "owner_or_editor_delete_project" ON public.projects
    FOR DELETE TO authenticated
    USING (can_edit_project(id));

  RAISE NOTICE 'Locked writes to owner/editor on public.projects';
END $$;
