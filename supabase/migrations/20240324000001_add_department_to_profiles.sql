-- Add department column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;

-- Enable realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
