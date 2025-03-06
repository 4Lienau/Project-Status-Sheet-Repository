-- Add impact column to risks table
ALTER TABLE public.risks ADD COLUMN impact TEXT;

-- Enable realtime for risks table
ALTER PUBLICATION supabase_realtime ADD TABLE risks;