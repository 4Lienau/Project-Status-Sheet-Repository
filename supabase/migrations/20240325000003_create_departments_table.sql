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
