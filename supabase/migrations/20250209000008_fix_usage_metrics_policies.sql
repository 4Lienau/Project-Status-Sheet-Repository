-- Fix RLS policies for usage_metrics table
-- PostgreSQL doesn't support CREATE POLICY IF NOT EXISTS, so we drop and recreate

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "System can manage usage metrics for functions" ON usage_metrics;
DROP POLICY IF EXISTS "Users can view their own usage metrics" ON usage_metrics;
DROP POLICY IF EXISTS "Service role can manage all usage metrics" ON usage_metrics;

-- Create policies for usage_metrics table
CREATE POLICY "System can manage usage metrics for functions"
  ON usage_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own usage metrics"
  ON usage_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all usage metrics"
  ON usage_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable RLS on usage_metrics if not already enabled
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
