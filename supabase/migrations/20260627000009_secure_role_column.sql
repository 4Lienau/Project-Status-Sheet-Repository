-- Block direct REST writes to the role column from authenticated users.
-- Role changes MUST go through admin_set_user_role() RPC below.
REVOKE UPDATE(role) ON public.profiles FROM authenticated;

-- SECURITY DEFINER RPC: only admins can change any user's role.
-- Runs as the DB owner, bypasses RLS, but enforces the admin check internally.
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  target_user_id UUID,
  new_role       TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must be an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required to change user roles';
  END IF;

  -- Guard against invalid role values (belt-and-suspenders on top of CHECK constraint)
  IF new_role NOT IN ('project_manager', 'department_director', 'admin') THEN
    RAISE EXCEPTION 'Invalid role value: %. Must be project_manager, department_director, or admin', new_role;
  END IF;

  UPDATE public.profiles
  SET role = new_role
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found', target_user_id;
  END IF;
END;
$$;

-- Restrict execute to authenticated users only (not anon)
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;
