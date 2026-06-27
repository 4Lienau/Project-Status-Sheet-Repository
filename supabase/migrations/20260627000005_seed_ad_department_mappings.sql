-- Seed all known Azure AD department name mappings
-- Discovered from directory_users analysis (46 entries: 42 mapped + 4 excluded)

-- Helper: insert mappings by joining department name to get the UUID
-- Mapped entries
INSERT INTO public.ad_department_mappings (ad_name, master_dept_id, is_excluded)
SELECT ad_name, d.id, false
FROM (VALUES
  -- Technology group (9 AD names → 1 master)
  ('IT Administration',        'Technology'),
  ('IT Operations',            'Technology'),
  ('IT Support',               'Technology'),
  ('IT Support - Adaptive',    'Technology'),
  ('Information Technology',   'Technology'),
  ('Technology Services',      'Technology'),
  ('Technology',               'Technology'),
  ('Application Support',      'Technology'),
  ('Business Applications',    'Technology'),
  -- Engineering
  ('Engineering',              'Engineering'),
  -- Asset Management (includes GIS/Cityworks contractors with re-wa domain accounts)
  ('Asset Management',         'Asset Management'),
  ('502 – Geospatial Services','Asset Management'),
  ('511 – Geospatial Utilities','Asset Management'),
  -- Collection Administration
  ('Collection Administration','Collection Administration'),
  -- Human Resources
  ('Human Resources',          'Human Resources'),
  -- Finance
  ('Finance',                  'Finance'),
  -- WRRF (plant facilities + operational departments)
  ('Mauldin Road',             'WRRF'),
  ('Lower Reedy',              'WRRF'),
  ('WRRF Maintenance',         'WRRF'),
  ('Gilder Creek',             'WRRF'),
  ('Durbin Creek',             'WRRF'),
  ('Georges Creek',            'WRRF'),
  ('Pelham',                   'WRRF'),
  ('Piedmont Regional',        'WRRF'),
  ('Maintenance',              'WRRF'),
  ('Biosolids and Residuals Management', 'WRRF'),
  ('Process Optimization',     'WRRF'),
  ('Operations',               'WRRF'),
  -- Laboratory
  ('Laboratory',               'Laboratory'),
  -- Instrumentation
  ('Instrumentation',          'Instrumentation'),
  ('ICS Automated',            'Instrumentation'),
  -- Environmental Programs
  ('Environmental Programs',   'Environmental Programs'),
  ('Pretreatment',             'Environmental Programs'),
  -- Communications
  ('Communications',           'Communications'),
  -- Customer Service
  ('Customer Service',         'Customer Service'),
  -- Business Services
  ('Purchasing',               'Business Services'),
  -- Facilities Management
  ('Facilities Management',    'Facilities Management'),
  -- Fleet
  ('Fleet',                    'Fleet'),
  -- Warehouse
  ('Warehouse',                'Warehouse'),
  -- Safety (corrects "Saftety" misspelling in Azure AD)
  ('Saftety',                  'Safety'),
  -- Board of Commissioners
  ('Board of Commissioners',   'Board of Commissioners'),
  -- Executive
  ('Officers Administration',  'Executive')
) AS m(ad_name, dept_name)
JOIN public.departments d ON d.name = m.dept_name
ON CONFLICT (ad_name) DO UPDATE
  SET master_dept_id = EXCLUDED.master_dept_id,
      is_excluded    = EXCLUDED.is_excluded,
      updated_at     = now();

-- Excluded entries (contractors, test accounts, system accounts)
INSERT INTO public.ad_department_mappings (ad_name, master_dept_id, is_excluded, exclusion_reason)
VALUES
  ('Woolpert',          NULL, true, 'External contractor — Woolpert engineering firm'),
  ('Collection System', NULL, true, 'Test account only (Sync Test / wdtest@re-wa.org)'),
  ('WRRF',              NULL, true, 'System/automated accounts only (z_CR plant confirmation emails)'),
  ('Administration',    NULL, true, 'Duplicate contractor accounts (Joel Jones — Joel.Jones@re-wa.org and Joeljo@re-wa.org)')
ON CONFLICT (ad_name) DO UPDATE
  SET is_excluded      = EXCLUDED.is_excluded,
      exclusion_reason = EXCLUDED.exclusion_reason,
      master_dept_id   = NULL,
      updated_at       = now();
