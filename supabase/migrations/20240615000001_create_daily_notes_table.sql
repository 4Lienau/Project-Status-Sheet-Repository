-- Create daily notes table
CREATE TABLE IF NOT EXISTS public.daily_notes (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    date date NOT NULL,
    note text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.daily_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own departments daily notes" ON public.daily_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.profiles pr ON p.department = pr.department
            WHERE p.id = project_id AND pr.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own departments daily notes" ON public.daily_notes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.profiles pr ON p.department = pr.department
            WHERE p.id = project_id AND pr.id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own departments daily notes" ON public.daily_notes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.profiles pr ON p.department = pr.department
            WHERE p.id = project_id AND pr.id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own departments daily notes" ON public.daily_notes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.profiles pr ON p.department = pr.department
            WHERE p.id = project_id AND pr.id = auth.uid()
        )
    );
