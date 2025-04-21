-- Create project_summaries table to store AI-generated executive summaries with timestamps
CREATE TABLE IF NOT EXISTS project_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_current BOOLEAN DEFAULT TRUE
);

-- Add index for faster lookups by project_id
CREATE INDEX IF NOT EXISTS project_summaries_project_id_idx ON project_summaries(project_id);

-- Add index for faster lookups of current summaries
CREATE INDEX IF NOT EXISTS project_summaries_is_current_idx ON project_summaries(is_current);

-- Enable row-level security
ALTER TABLE project_summaries ENABLE ROW LEVEL SECURITY;

-- Create policy for selecting summaries
DROP POLICY IF EXISTS "Users can view project summaries" ON project_summaries;
CREATE POLICY "Users can view project summaries"
  ON project_summaries FOR SELECT
  USING (true);

-- Create policy for inserting summaries
DROP POLICY IF EXISTS "Users can insert project summaries" ON project_summaries;
CREATE POLICY "Users can insert project summaries"
  ON project_summaries FOR INSERT
  WITH CHECK (true);

-- Create policy for updating summaries
DROP POLICY IF EXISTS "Users can update project summaries" ON project_summaries;
CREATE POLICY "Users can update project summaries"
  ON project_summaries FOR UPDATE
  USING (true);

-- Create policy for deleting summaries
DROP POLICY IF EXISTS "Users can delete project summaries" ON project_summaries;
CREATE POLICY "Users can delete project summaries"
  ON project_summaries FOR DELETE
  USING (true);