-- Department mapping table: maps raw Azure AD department names to master departments
CREATE TABLE IF NOT EXISTS public.ad_department_mappings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_name          TEXT NOT NULL UNIQUE,
  master_dept_id   UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_excluded      BOOLEAN NOT NULL DEFAULT false,
  exclusion_reason TEXT,
  mapped_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_dept_mappings_ad_name ON public.ad_department_mappings(ad_name);
CREATE INDEX IF NOT EXISTS idx_ad_dept_mappings_master_dept ON public.ad_department_mappings(master_dept_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_ad_dept_mappings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_ad_dept_mappings_updated_at
  BEFORE UPDATE ON public.ad_department_mappings
  FOR EACH ROW EXECUTE FUNCTION update_ad_dept_mappings_updated_at();

-- resolve_department: maps raw AD dept name to canonical master name
-- Returns: master name if mapped, NULL if excluded, raw name if unmapped
CREATE OR REPLACE FUNCTION public.resolve_department(ad_dept TEXT)
RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_is_excluded    BOOLEAN;
  v_master_name    TEXT;
BEGIN
  SELECT m.is_excluded, d.name
  INTO v_is_excluded, v_master_name
  FROM public.ad_department_mappings m
  LEFT JOIN public.departments d ON d.id = m.master_dept_id
  WHERE m.ad_name = ad_dept;

  IF NOT FOUND THEN
    RETURN ad_dept;   -- no mapping: return raw name as fallback
  END IF;

  IF v_is_excluded THEN
    RETURN NULL;      -- excluded entry: contractor/system account
  END IF;

  RETURN v_master_name;  -- resolved to master department name
END;
$$;
