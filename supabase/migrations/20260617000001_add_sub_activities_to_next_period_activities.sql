ALTER TABLE next_period_activities
ADD COLUMN IF NOT EXISTS sub_activities JSONB DEFAULT '[]'::jsonb;
