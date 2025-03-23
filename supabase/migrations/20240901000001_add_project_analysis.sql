-- Add project_analysis column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_analysis TEXT;

-- Update realtime publication to include the new column
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
COMMIT;