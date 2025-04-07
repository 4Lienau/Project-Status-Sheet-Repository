-- Enable the moddatetime extension if not already enabled
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime (updated_at);
