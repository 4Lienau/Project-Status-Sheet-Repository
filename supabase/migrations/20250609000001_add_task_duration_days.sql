-- Add duration_days column to tasks table
-- This represents the duration of a task in days
-- The task "date" field becomes the start date, and end date = date + duration_days
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 1;
