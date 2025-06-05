-- Add project_id field to projects table
ALTER TABLE projects ADD COLUMN project_id TEXT;

-- Add comment to describe the field
COMMENT ON COLUMN projects.project_id IS 'External project identifier, typically from Workday or other project management systems';

-- Note: Realtime is already enabled for all tables via FOR ALL TABLES publication
-- No need to explicitly add tables to supabase_realtime publication
