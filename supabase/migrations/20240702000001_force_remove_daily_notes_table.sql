-- Drop all policies first
DROP POLICY IF EXISTS "Users can view their own departments daily notes" ON public.daily_notes;
DROP POLICY IF EXISTS "Users can insert their own departments daily notes" ON public.daily_notes;
DROP POLICY IF EXISTS "Users can update their own departments daily notes" ON public.daily_notes;
DROP POLICY IF EXISTS "Users can delete their own departments daily notes" ON public.daily_notes;

-- Drop the table
DROP TABLE IF EXISTS public.daily_notes;
