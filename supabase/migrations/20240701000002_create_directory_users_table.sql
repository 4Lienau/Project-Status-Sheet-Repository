-- Create directory_users table for Azure AD sync
CREATE TABLE IF NOT EXISTS directory_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azure_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT,
  job_title TEXT,
  department TEXT,
  user_principal_name TEXT,
  account_enabled BOOLEAN DEFAULT true,
  created_date_time TIMESTAMPTZ,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  sync_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_directory_users_azure_id ON directory_users(azure_user_id);
CREATE INDEX IF NOT EXISTS idx_directory_users_email ON directory_users(email);
CREATE INDEX IF NOT EXISTS idx_directory_users_department ON directory_users(department);
CREATE INDEX IF NOT EXISTS idx_directory_users_last_synced ON directory_users(last_synced);

-- Create sync_logs table to track sync operations
CREATE TABLE IF NOT EXISTS azure_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_started_at TIMESTAMPTZ DEFAULT NOW(),
  sync_completed_at TIMESTAMPTZ,
  users_processed INTEGER DEFAULT 0,
  users_created INTEGER DEFAULT 0,
  users_updated INTEGER DEFAULT 0,
  users_deactivated INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'running', -- running, completed, failed
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime is already enabled for all tables by default in Supabase
-- No need to explicitly add tables to the publication

-- Add updated_at trigger for directory_users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_directory_users_updated_at BEFORE UPDATE ON directory_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies (disabled by default as requested)
-- ALTER TABLE directory_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE azure_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
-- CREATE POLICY "Admin can view directory users" ON directory_users FOR SELECT USING (true);
-- CREATE POLICY "Admin can manage directory users" ON directory_users FOR ALL USING (true);
-- CREATE POLICY "Admin can view sync logs" ON azure_sync_logs FOR SELECT USING (true);
-- CREATE POLICY "Admin can manage sync logs" ON azure_sync_logs FOR ALL USING (true);
