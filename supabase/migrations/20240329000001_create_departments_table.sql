-- Create departments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to select departments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'departments' 
    AND policyname = 'Allow authenticated users to select departments'
  ) THEN
    CREATE POLICY "Allow authenticated users to select departments" ON public.departments
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END
$$;

-- Create policy to allow admins to insert, update, delete departments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'departments' 
    AND policyname = 'Allow admins to manage departments'
  ) THEN
    CREATE POLICY "Allow admins to manage departments" ON public.departments
      USING (auth.email() IN ('4lienau@gmail.com', 'chrisl@re-wa.org'))
      WITH CHECK (auth.email() IN ('4lienau@gmail.com', 'chrisl@re-wa.org'));
  END IF;
END
$$;

-- Insert default departments if table is empty
INSERT INTO public.departments (name)
SELECT name FROM (
  VALUES
    ('Engineering'),
    ('Finance'),
    ('HR'),
    ('Marketing'),
    ('Operations'),
    ('IT'),
    ('Executive'),
    ('Project Management')
) AS default_departments(name)
WHERE NOT EXISTS (SELECT 1 FROM public.departments LIMIT 1);
