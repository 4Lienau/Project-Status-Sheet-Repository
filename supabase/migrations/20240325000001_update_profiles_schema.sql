-- Add department column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;

-- Add email column if it doesn't exist
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
