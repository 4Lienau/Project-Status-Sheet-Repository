-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  assignee TEXT,
  date DATE,
  completion INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add realtime support
alter publication supabase_realtime add table tasks;

-- Add RLS policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tasks" ON tasks;
CREATE POLICY "Users can view tasks"
  ON tasks
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert tasks" ON tasks;
CREATE POLICY "Users can insert tasks"
  ON tasks
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
CREATE POLICY "Users can update tasks"
  ON tasks
  FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can delete tasks" ON tasks;
CREATE POLICY "Users can delete tasks"
  ON tasks
  FOR DELETE
  USING (true);
