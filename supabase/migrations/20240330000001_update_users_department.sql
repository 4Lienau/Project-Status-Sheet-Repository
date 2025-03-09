-- Update all existing profiles to have 'Technology' as their department
UPDATE public.profiles
SET department = 'Technology'
WHERE department IS NULL OR department = '';

-- Make sure the Technology department exists
INSERT INTO public.departments (name)
VALUES ('Technology')
ON CONFLICT (name) DO NOTHING;
