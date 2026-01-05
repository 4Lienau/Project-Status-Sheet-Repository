ALTER TABLE milestones ADD COLUMN IF NOT EXISTS end_date DATE;

UPDATE milestones 
SET end_date = date + INTERVAL '1 day' 
WHERE end_date IS NULL AND date IS NOT NULL;
