UPDATE milestones m
SET end_date = (
  SELECT MIN(m2.date)
  FROM milestones m2
  WHERE m2.project_id = m.project_id
    AND m2.date > m.date
)
WHERE end_date IS NOT NULL
  AND end_date = (m.date + INTERVAL '1 day')::date
  AND EXISTS (
    SELECT 1 FROM milestones m3 
    WHERE m3.project_id = m.project_id 
      AND m3.date > m.date
  );
