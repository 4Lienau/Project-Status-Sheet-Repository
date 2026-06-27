-- Add role column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'project_manager'
  CHECK (role IN ('project_manager', 'department_director', 'admin'));

-- Set known admin accounts
UPDATE public.profiles
SET role = 'admin'
WHERE email IN ('4lienau@gmail.com', 'chrisl@re-wa.org');
