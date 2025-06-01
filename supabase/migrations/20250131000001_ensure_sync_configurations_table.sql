-- Ensure sync_configurations table exists
CREATE TABLE IF NOT EXISTS sync_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL UNIQUE,
  frequency_hours INTEGER NOT NULL DEFAULT 6,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default Azure AD sync configuration (disabled by default)
INSERT INTO sync_configurations (sync_type, frequency_hours, is_enabled, next_run_at)
VALUES ('azure_ad_sync', 6, false, null)
ON CONFLICT (sync_type) DO NOTHING;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_sync_configurations_updated_at ON sync_configurations;
CREATE TRIGGER update_sync_configurations_updated_at
    BEFORE UPDATE ON sync_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
