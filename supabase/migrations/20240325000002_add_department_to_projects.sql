-- Add department column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS department TEXT;

-- Create index on department for faster filtering
CREATE INDEX IF NOT EXISTS idx_projects_department ON public.projects(department);

-- Add department_access column to profiles table for admin access control
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_access TEXT[];
