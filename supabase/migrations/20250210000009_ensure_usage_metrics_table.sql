-- Ensure usage_metrics table exists with correct structure for project creation tracking

-- Create usage_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  login_count INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  session_time_minutes INTEGER DEFAULT 0,
  project_count INTEGER DEFAULT 0,
  milestones_created INTEGER DEFAULT 0,
  projects_created INTEGER DEFAULT 0,
  projects_updated INTEGER DEFAULT 0,
  total_session_time_minutes INTEGER DEFAULT 0,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add project_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usage_metrics' AND column_name = 'project_count'
  ) THEN
    ALTER TABLE usage_metrics ADD COLUMN project_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added project_count column to usage_metrics table';
  END IF;
  
  -- Add projects_created column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usage_metrics' AND column_name = 'projects_created'
  ) THEN
    ALTER TABLE usage_metrics ADD COLUMN projects_created INTEGER DEFAULT 0;
    RAISE NOTICE 'Added projects_created column to usage_metrics table';
  END IF;
  
  -- Add projects_updated column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usage_metrics' AND column_name = 'projects_updated'
  ) THEN
    ALTER TABLE usage_metrics ADD COLUMN projects_updated INTEGER DEFAULT 0;
    RAISE NOTICE 'Added projects_updated column to usage_metrics table';
  END IF;
  
  -- Add milestones_created column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usage_metrics' AND column_name = 'milestones_created'
  ) THEN
    ALTER TABLE usage_metrics ADD COLUMN milestones_created INTEGER DEFAULT 0;
    RAISE NOTICE 'Added milestones_created column to usage_metrics table';
  END IF;
  
  -- Add total_session_time_minutes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usage_metrics' AND column_name = 'total_session_time_minutes'
  ) THEN
    ALTER TABLE usage_metrics ADD COLUMN total_session_time_minutes INTEGER DEFAULT 0;
    RAISE NOTICE 'Added total_session_time_minutes column to usage_metrics table';
  END IF;
END
$$;

-- Enable RLS
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own usage metrics" ON usage_metrics;
CREATE POLICY "Users can view their own usage metrics"
  ON usage_metrics FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own usage metrics" ON usage_metrics;
CREATE POLICY "Users can insert their own usage metrics"
  ON usage_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own usage metrics" ON usage_metrics;
CREATE POLICY "Users can update their own usage metrics"
  ON usage_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow service role to access all records
DROP POLICY IF EXISTS "Service role can access all usage metrics" ON usage_metrics;
CREATE POLICY "Service role can access all usage metrics"
  ON usage_metrics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE usage_metrics;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_date ON usage_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_date ON usage_metrics(date);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_id ON usage_metrics(user_id);
