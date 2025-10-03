-- Create reminder_emails table to track sent reminders
CREATE TABLE IF NOT EXISTS reminder_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_manager_email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  days_since_update INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reminder_emails_project_id ON reminder_emails(project_id);
CREATE INDEX IF NOT EXISTS idx_reminder_emails_sent_at ON reminder_emails(sent_at);
CREATE INDEX IF NOT EXISTS idx_reminder_emails_status ON reminder_emails(status);

-- Disable RLS (since edge functions will manage this)
ALTER TABLE reminder_emails DISABLE ROW LEVEL SECURITY;