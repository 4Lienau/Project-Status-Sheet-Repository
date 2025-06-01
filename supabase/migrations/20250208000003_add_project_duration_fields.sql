-- Add project duration tracking fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS calculated_start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS calculated_end_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_days INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS working_days INTEGER;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_calculated_dates ON projects(calculated_start_date, calculated_end_date);
CREATE INDEX IF NOT EXISTS idx_projects_duration ON projects(total_days, working_days);

-- Note: Realtime is already enabled for all tables, so no need to add specific table