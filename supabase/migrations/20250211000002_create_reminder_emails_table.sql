CREATE TABLE IF NOT EXISTS public.reminder_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  project_manager_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  days_since_update INTEGER,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_emails_project_id ON public.reminder_emails(project_id);
CREATE INDEX IF NOT EXISTS idx_reminder_emails_sent_at ON public.reminder_emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminder_emails_status ON public.reminder_emails(status);

ALTER TABLE public.reminder_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read reminder emails" ON public.reminder_emails;
CREATE POLICY "Allow authenticated users to read reminder emails"
ON public.reminder_emails FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow service role to insert reminder emails" ON public.reminder_emails;
CREATE POLICY "Allow service role to insert reminder emails"
ON public.reminder_emails FOR INSERT
TO service_role
WITH CHECK (true);