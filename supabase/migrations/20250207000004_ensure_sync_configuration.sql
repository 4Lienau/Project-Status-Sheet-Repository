-- Ensure sync configuration exists for Azure AD sync
INSERT INTO sync_configurations (
  sync_type,
  frequency_hours,
  is_enabled,
  next_run_at,
  created_at,
  updated_at
)
SELECT 
  'azure_ad_sync',
  6,
  true,
  NOW() + INTERVAL '6 hours',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM sync_configurations WHERE sync_type = 'azure_ad_sync'
);
