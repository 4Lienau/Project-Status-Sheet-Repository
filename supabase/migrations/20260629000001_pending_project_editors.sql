-- Deferred ("pending") project-editor grants.
-- Lets a project owner/admin pre-authorize an AD user who has not logged in yet
-- (and therefore has no auth.users id). The grant is staged by email and is
-- auto-materialized into project_editors when that user first authenticates.

-- ── table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pending_project_editors (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,                                    -- stored lowercased
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, email)
);

CREATE INDEX IF NOT EXISTS idx_pending_project_editors_email
  ON public.pending_project_editors (email);

-- Data API needs explicit grants in addition to RLS (PostgREST).
GRANT SELECT, INSERT, DELETE ON public.pending_project_editors TO authenticated;

-- ── RLS (mirrors project_editors) ────────────────────────────────────────────
ALTER TABLE public.pending_project_editors ENABLE ROW LEVEL SECURITY;

-- Pending rows contain raw email addresses (unlike project_editors, which exposes
-- only opaque user ids), so SELECT is restricted to the project owner or an admin —
-- the only roles that can open Manage Editors.
DROP POLICY IF EXISTS "Authenticated users can view pending editors" ON public.pending_project_editors;
DROP POLICY IF EXISTS "Project owner or admin can view pending editors" ON public.pending_project_editors;
CREATE POLICY "Project owner or admin can view pending editors"
  ON public.pending_project_editors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = pending_project_editors.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() AND pr.role = 'admin'
          )
        )
    )
  );

-- Only the project owner or an admin can pre-authorize an editor.
DROP POLICY IF EXISTS "Project owner or admin can add pending editors" ON public.pending_project_editors;
CREATE POLICY "Project owner or admin can add pending editors"
  ON public.pending_project_editors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = pending_project_editors.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() AND pr.role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Project owner or admin can remove pending editors" ON public.pending_project_editors;
CREATE POLICY "Project owner or admin can remove pending editors"
  ON public.pending_project_editors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = pending_project_editors.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() AND pr.role = 'admin'
          )
        )
    )
  );

-- ── auto-activation on first login ───────────────────────────────────────────
-- Separate from handle_new_user() so a failure here can never block signup/login.
-- The project_editors FK references auth.users(id), which exists at AFTER INSERT,
-- so this is independent of profile-creation order.
CREATE OR REPLACE FUNCTION public.resolve_pending_project_editors()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only materialize grants for a verified email. Azure AD OAuth sets
  -- email_confirmed_at at insert time; email/password sets it on confirmation
  -- (handled by the companion UPDATE trigger). This prevents an unverified signup
  -- using someone else's email from inheriting their pending grants.
  IF NEW.email IS NULL OR NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.project_editors (project_id, user_id, granted_by)
  SELECT ppe.project_id, NEW.id, ppe.granted_by
  FROM public.pending_project_editors ppe
  WHERE lower(ppe.email) = lower(NEW.email)
  ON CONFLICT (project_id, user_id) DO NOTHING;

  DELETE FROM public.pending_project_editors ppe
  WHERE lower(ppe.email) = lower(NEW.email);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never abort the auth.users insert because of editor resolution.
  RAISE WARNING 'resolve_pending_project_editors failed for user % (%): %', NEW.id, NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

-- Fires on OAuth/SSO first sign-in (email_confirmed_at already set at insert).
DROP TRIGGER IF EXISTS on_auth_user_created_resolve_editors ON auth.users;
CREATE TRIGGER on_auth_user_created_resolve_editors
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.resolve_pending_project_editors();

-- Fires when an email/password user confirms their email after signup.
DROP TRIGGER IF EXISTS on_auth_user_confirmed_resolve_editors ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_resolve_editors
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.resolve_pending_project_editors();
