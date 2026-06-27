-- Trigger: sync profiles.department when directory_users is updated by Azure AD sync
-- Uses SECURITY DEFINER so it can write to profiles regardless of caller's RLS context

CREATE OR REPLACE FUNCTION public.sync_profile_department_from_directory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resolved TEXT;
BEGIN
  -- Only run when department or sync_status changed
  IF (OLD.department IS NOT DISTINCT FROM NEW.department) AND
     (OLD.sync_status IS NOT DISTINCT FROM NEW.sync_status) THEN
    RETURN NEW;
  END IF;

  v_resolved := public.resolve_department(NEW.department);

  -- Update matching profile only when resolved value differs from stored value
  UPDATE public.profiles
  SET
    department = v_resolved,
    updated_at = now()
  WHERE lower(email) = lower(NEW.email)
    AND (department IS DISTINCT FROM v_resolved);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_sync_profile_department
  AFTER UPDATE ON public.directory_users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_department_from_directory();
