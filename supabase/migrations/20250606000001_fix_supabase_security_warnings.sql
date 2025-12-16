CREATE SCHEMA IF NOT EXISTS extensions;

ALTER EXTENSION IF EXISTS http SET SCHEMA extensions;
ALTER EXTENSION IF EXISTS moddatetime SET SCHEMA extensions;
ALTER EXTENSION IF EXISTS vector SET SCHEMA extensions;

DROP TRIGGER IF EXISTS handle_updated_at ON projects;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE PROCEDURE extensions.moddatetime (updated_at);

ALTER FUNCTION IF EXISTS public.get_ai_usage_trends(integer) SET search_path = public;
