-- Update all existing profiles to have 'Technology' as their department if not set
UPDATE public.profiles
SET department = 'Technology'
WHERE department IS NULL OR department = '';

-- Make sure the Technology department exists
INSERT INTO public.departments (name)
VALUES ('Technology')
ON CONFLICT (name) DO NOTHING;

-- Create a function to sync user emails from auth to profiles
CREATE OR REPLACE FUNCTION sync_user_emails()
RETURNS void AS $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT id, email FROM auth.users
  LOOP
    -- Insert or update profile with email
    INSERT INTO public.profiles (id, email, department, updated_at)
    VALUES (auth_user.id, auth_user.email, 'Technology', now())
    ON CONFLICT (id) 
    DO UPDATE SET 
      email = auth_user.email,
      department = COALESCE(public.profiles.department, 'Technology'),
      updated_at = now()
    WHERE public.profiles.id = auth_user.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to sync all users
SELECT sync_user_emails();

-- Create a trigger to automatically sync new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, department, updated_at)
  VALUES (NEW.id, NEW.email, 'Technology', now())
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = NEW.email,
    department = COALESCE(public.profiles.department, 'Technology'),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
