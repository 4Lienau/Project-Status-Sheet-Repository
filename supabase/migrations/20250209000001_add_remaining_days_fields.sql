-- Add remaining days fields to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS total_days_remaining INTEGER,
ADD COLUMN IF NOT EXISTS working_days_remaining INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN projects.total_days_remaining IS 'Total days remaining until project completion (including weekends)';
COMMENT ON COLUMN projects.working_days_remaining IS 'Working days remaining until project completion (excluding weekends)';
