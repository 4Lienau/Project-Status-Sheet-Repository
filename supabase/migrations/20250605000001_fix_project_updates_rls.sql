-- Enable RLS
ALTER TABLE IF EXISTS changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS considerations ENABLE ROW LEVEL SECURITY;

-- Changes Table Policies
DROP POLICY IF EXISTS "Users can insert their own changes" ON changes;
DROP POLICY IF EXISTS "Users can update their own changes" ON changes;
DROP POLICY IF EXISTS "Users can delete their own changes" ON changes;
DROP POLICY IF EXISTS "Users can view their own changes" ON changes;

DROP POLICY IF EXISTS "Authenticated users can insert changes" ON changes;
DROP POLICY IF EXISTS "Authenticated users can update changes" ON changes;
DROP POLICY IF EXISTS "Authenticated users can delete changes" ON changes;
DROP POLICY IF EXISTS "Authenticated users can view changes" ON changes;

CREATE POLICY "Authenticated users can insert changes"
ON changes FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update changes"
ON changes FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete changes"
ON changes FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view changes"
ON changes FOR SELECT
TO authenticated
USING (true);

-- Risks Table Policies
DROP POLICY IF EXISTS "Users can insert their own risks" ON risks;
DROP POLICY IF EXISTS "Users can update their own risks" ON risks;
DROP POLICY IF EXISTS "Users can delete their own risks" ON risks;
DROP POLICY IF EXISTS "Users can view their own risks" ON risks;

DROP POLICY IF EXISTS "Authenticated users can insert risks" ON risks;
DROP POLICY IF EXISTS "Authenticated users can update risks" ON risks;
DROP POLICY IF EXISTS "Authenticated users can delete risks" ON risks;
DROP POLICY IF EXISTS "Authenticated users can view risks" ON risks;

CREATE POLICY "Authenticated users can insert risks"
ON risks FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update risks"
ON risks FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete risks"
ON risks FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view risks"
ON risks FOR SELECT
TO authenticated
USING (true);

-- Considerations Table Policies
DROP POLICY IF EXISTS "Users can insert their own considerations" ON considerations;
DROP POLICY IF EXISTS "Users can update their own considerations" ON considerations;
DROP POLICY IF EXISTS "Users can delete their own considerations" ON considerations;
DROP POLICY IF EXISTS "Users can view their own considerations" ON considerations;

DROP POLICY IF EXISTS "Authenticated users can insert considerations" ON considerations;
DROP POLICY IF EXISTS "Authenticated users can update considerations" ON considerations;
DROP POLICY IF EXISTS "Authenticated users can delete considerations" ON considerations;
DROP POLICY IF EXISTS "Authenticated users can view considerations" ON considerations;

CREATE POLICY "Authenticated users can insert considerations"
ON considerations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update considerations"
ON considerations FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete considerations"
ON considerations FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view considerations"
ON considerations FOR SELECT
TO authenticated
USING (true);
