-- Add primary key constraint to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_pkey' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD PRIMARY KEY (id);
  END IF;
END
$$;

-- Make sure the id column is NOT NULL
ALTER TABLE public.profiles ALTER COLUMN id SET NOT NULL;
