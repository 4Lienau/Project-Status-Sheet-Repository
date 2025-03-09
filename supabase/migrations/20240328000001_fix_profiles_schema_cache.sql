-- Drop and recreate the profiles table to ensure it's properly cached
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Recreate the profiles table with all required columns
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  department TEXT
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can update their own profiles" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own profiles" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Add the table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
