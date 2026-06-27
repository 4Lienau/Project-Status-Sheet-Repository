-- Helper function: can the current user edit a given project?
-- Returns true if: unowned (NULL owner_id), is the owner, is a designated editor, or is admin
CREATE OR REPLACE FUNCTION public.can_edit_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id
      AND (
        p.owner_id IS NULL
        OR p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.project_editors pe
          WHERE pe.project_id = p.id AND pe.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.id = auth.uid() AND pr.role = 'admin'
        )
      )
  );
END;
$$;

-- ── projects ────────────────────────────────────────────────────────────────
-- Drop all existing UPDATE/DELETE policies on projects dynamically
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'projects' AND schemaname = 'public' AND cmd IN ('UPDATE', 'DELETE', 'r')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', r.policyname);
  END LOOP;
END;
$$;

-- SELECT: all authenticated users can read all projects (unchanged)
CREATE POLICY "Authenticated users can view all projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: all approved authenticated users can create projects
CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: owner, designated editor, or admin only
CREATE POLICY "Project owner or editor can update"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (can_edit_project(id))
  WITH CHECK (can_edit_project(id));

-- DELETE: same as UPDATE
CREATE POLICY "Project owner or editor can delete"
  ON public.projects FOR DELETE
  TO authenticated
  USING (can_edit_project(id));

-- ── milestones ───────────────────────────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'milestones' AND schemaname = 'public' AND cmd IN ('UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.milestones', r.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Project editor can update milestones"
  ON public.milestones FOR UPDATE
  TO authenticated
  USING (can_edit_project(project_id))
  WITH CHECK (can_edit_project(project_id));

CREATE POLICY "Project editor can delete milestones"
  ON public.milestones FOR DELETE
  TO authenticated
  USING (can_edit_project(project_id));

-- ── changes ──────────────────────────────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'changes' AND schemaname = 'public' AND cmd IN ('UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.changes', r.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Project editor can update changes"
  ON public.changes FOR UPDATE
  TO authenticated
  USING (can_edit_project(project_id))
  WITH CHECK (can_edit_project(project_id));

CREATE POLICY "Project editor can delete changes"
  ON public.changes FOR DELETE
  TO authenticated
  USING (can_edit_project(project_id));

-- ── risks ────────────────────────────────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'risks' AND schemaname = 'public' AND cmd IN ('UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.risks', r.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Project editor can update risks"
  ON public.risks FOR UPDATE
  TO authenticated
  USING (can_edit_project(project_id))
  WITH CHECK (can_edit_project(project_id));

CREATE POLICY "Project editor can delete risks"
  ON public.risks FOR DELETE
  TO authenticated
  USING (can_edit_project(project_id));

-- ── considerations ───────────────────────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'considerations' AND schemaname = 'public' AND cmd IN ('UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.considerations', r.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Project editor can update considerations"
  ON public.considerations FOR UPDATE
  TO authenticated
  USING (can_edit_project(project_id))
  WITH CHECK (can_edit_project(project_id));

CREATE POLICY "Project editor can delete considerations"
  ON public.considerations FOR DELETE
  TO authenticated
  USING (can_edit_project(project_id));

-- ── project_editors ──────────────────────────────────────────────────────────
ALTER TABLE public.project_editors ENABLE ROW LEVEL SECURITY;

-- All authenticated users can see who the editors are for any project
CREATE POLICY "Authenticated users can view project editors"
  ON public.project_editors FOR SELECT
  TO authenticated
  USING (true);

-- Only the project owner or admin can add/remove editors
CREATE POLICY "Project owner or admin can manage editors"
  ON public.project_editors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_editors.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() AND pr.role = 'admin'
          )
        )
    )
  );

CREATE POLICY "Project owner or admin can remove editors"
  ON public.project_editors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_editors.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() AND pr.role = 'admin'
          )
        )
    )
  );
