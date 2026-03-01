ALTER TABLE accomplishments
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_accomplishments_source ON accomplishments(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_accomplishments_project_hidden ON accomplishments(project_id, is_hidden);
