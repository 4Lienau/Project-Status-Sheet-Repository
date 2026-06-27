-- RLS for ad_department_mappings
ALTER TABLE public.ad_department_mappings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read mappings (needed for resolve_department UI display)
CREATE POLICY "Authenticated users can read department mappings"
  ON public.ad_department_mappings FOR SELECT
  TO authenticated
  USING (true);

-- Admins have full write access
CREATE POLICY "Admins can manage department mappings"
  ON public.ad_department_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Department directors can update mappings for their own department only
CREATE POLICY "Directors can map to their own department"
  ON public.ad_department_mappings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.departments d ON d.name = p.department
      WHERE p.id = auth.uid()
        AND p.role = 'department_director'
        AND d.id = ad_department_mappings.master_dept_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.departments d ON d.name = p.department
      WHERE p.id = auth.uid()
        AND p.role = 'department_director'
        AND d.id = ad_department_mappings.master_dept_id
    )
  );
