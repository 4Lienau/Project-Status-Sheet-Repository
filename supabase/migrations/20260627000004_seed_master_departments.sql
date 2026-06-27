-- Seed the 19 canonical master departments derived from Azure AD analysis
-- Uses INSERT ... ON CONFLICT DO NOTHING to be safe on re-runs
INSERT INTO public.departments (name) VALUES
  ('Technology'),
  ('Engineering'),
  ('Asset Management'),
  ('Collection Administration'),
  ('Human Resources'),
  ('Finance'),
  ('WRRF'),
  ('Laboratory'),
  ('Instrumentation'),
  ('Environmental Programs'),
  ('Communications'),
  ('Customer Service'),
  ('Business Services'),
  ('Facilities Management'),
  ('Fleet'),
  ('Warehouse'),
  ('Safety'),
  ('Board of Commissioners'),
  ('Executive')
ON CONFLICT (name) DO NOTHING;
