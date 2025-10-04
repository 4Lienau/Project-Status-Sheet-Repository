-- Create scheduler_logs table to track cron job executions
CREATE TABLE IF NOT EXISTS scheduler_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_was_due BOOLEAN NOT NULL DEFAULT false,
  sync_triggered BOOLEAN NOT NULL DEFAULT false,
  sync_result JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_scheduler_logs_run_at ON scheduler_logs(run_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduler_logs_sync_triggered ON scheduler_logs(sync_triggered);

-- Enable RLS
ALTER TABLE scheduler_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
DROP POLICY IF EXISTS "Admin users can view scheduler logs" ON scheduler_logs;
CREATE POLICY "Admin users can view scheduler logs"
ON scheduler_logs FOR SELECT
USING (
  auth.jwt() ->> 'email' IN ('4lienau@gmail.com', 'chrisl@re-wa.org')
);

-- Allow service role to insert logs
DROP POLICY IF EXISTS "Service role can insert scheduler logs" ON scheduler_logs;
CREATE POLICY "Service role can insert scheduler logs"
ON scheduler_logs FOR INSERT
WITH CHECK (true);

COMMENT ON TABLE scheduler_logs IS 'Tracks every execution of the sync-scheduler cron job';
COMMENT ON COLUMN scheduler_logs.run_at IS 'When the scheduler cron job ran';
COMMENT ON COLUMN scheduler_logs.sync_was_due IS 'Whether a sync was due based on configuration';
COMMENT ON COLUMN scheduler_logs.sync_triggered IS 'Whether the scheduler actually triggered a sync';
COMMENT ON COLUMN scheduler_logs.sync_result IS 'Result from the sync operation (if triggered)';
COMMENT ON COLUMN scheduler_logs.error_message IS 'Any error that occurred during execution';
COMMENT ON COLUMN scheduler_logs.execution_time_ms IS 'How long the scheduler execution took in milliseconds';