CREATE TABLE IF NOT EXISTS changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  change TEXT NOT NULL,
  impact TEXT,
  disposition TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own changes";
CREATE POLICY "Users can view their own changes"
  ON changes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own changes";
CREATE POLICY "Users can insert their own changes"
  ON changes FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own changes";
CREATE POLICY "Users can update their own changes"
  ON changes FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can delete their own changes";
CREATE POLICY "Users can delete their own changes"
  ON changes FOR DELETE
  USING (true);

alter publication supabase_realtime add table changes;