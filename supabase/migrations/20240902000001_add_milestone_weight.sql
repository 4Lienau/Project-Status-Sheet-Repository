-- Add weight column to milestones table
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS weight smallint DEFAULT 3;

-- Update realtime publication (only if not already included)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'milestones'
  ) THEN
    alter publication supabase_realtime add table milestones;
  END IF;
END
$$;
