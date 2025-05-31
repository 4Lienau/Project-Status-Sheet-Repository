-- Create sync configuration table
CREATE TABLE IF NOT EXISTS sync_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL UNIQUE,
  frequency_hours INTEGER NOT NULL DEFAULT 6,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default Azure AD sync configuration
INSERT INTO sync_configurations (sync_type, frequency_hours, next_run_at)
VALUES ('azure_ad_sync', 6, NOW() + INTERVAL '6 hours')
ON CONFLICT (sync_type) DO NOTHING;

-- Realtime is automatically enabled for all tables in Supabase
-- No need to manually add tables to supabase_realtime publication

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sync_configurations_updated_at
    BEFORE UPDATE ON sync_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
