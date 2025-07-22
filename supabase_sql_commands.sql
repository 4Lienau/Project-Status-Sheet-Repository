-- Add department column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;

-- Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing profiles with email from auth.users
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE public.profiles.id = auth.users.id AND public.profiles.email IS NULL;

-- Enable realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Create index on department for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Add department column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS department TEXT;

-- Create index on department for faster filtering
CREATE INDEX IF NOT EXISTS idx_projects_department ON public.projects(department);

-- Add department_access column to profiles table for admin access control
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_access TEXT[];

-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable realtime for departments table
ALTER PUBLICATION supabase_realtime ADD TABLE departments;

-- Insert some default departments
INSERT INTO public.departments (name, description)
VALUES 
  ('Engineering', 'Engineering and technical teams'),
  ('Finance', 'Financial and accounting teams'),
  ('HR', 'Human resources department'),
  ('Marketing', 'Marketing and communications'),
  ('Operations', 'Operations and logistics'),
  ('IT', 'Information technology'),
  ('Executive', 'Executive leadership team'),
  ('Project Management', 'Project management office')
ON CONFLICT (name) DO NOTHING;
