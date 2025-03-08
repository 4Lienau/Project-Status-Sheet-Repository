-- Create the pm_knowledge table with vector support
CREATE TABLE IF NOT EXISTS pm_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to match knowledge based on embedding similarity
CREATE OR REPLACE FUNCTION match_pm_knowledge(query_embedding VECTOR(1536), match_threshold FLOAT, match_count INT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm_knowledge.id,
    pm_knowledge.title,
    pm_knowledge.content,
    pm_knowledge.category,
    1 - (pm_knowledge.embedding <=> query_embedding) AS similarity
  FROM pm_knowledge
  WHERE 1 - (pm_knowledge.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Enable RLS on all tables
ALTER TABLE pm_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for pm_knowledge
DROP POLICY IF EXISTS "Admin users can insert knowledge" ON pm_knowledge;
CREATE POLICY "Admin users can insert knowledge"
ON pm_knowledge FOR INSERT
TO authenticated
USING (auth.uid() IN (SELECT id FROM auth.users WHERE email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')));

DROP POLICY IF EXISTS "Admin users can update knowledge" ON pm_knowledge;
CREATE POLICY "Admin users can update knowledge"
ON pm_knowledge FOR UPDATE
TO authenticated
USING (auth.uid() IN (SELECT id FROM auth.users WHERE email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')));

DROP POLICY IF EXISTS "Admin users can delete knowledge" ON pm_knowledge;
CREATE POLICY "Admin users can delete knowledge"
ON pm_knowledge FOR DELETE
TO authenticated
USING (auth.uid() IN (SELECT id FROM auth.users WHERE email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')));

DROP POLICY IF EXISTS "All users can read knowledge" ON pm_knowledge;
CREATE POLICY "All users can read knowledge"
ON pm_knowledge FOR SELECT
TO authenticated
USING (true);

-- Create policies for chat_conversations
DROP POLICY IF EXISTS "Users can create their own conversations" ON chat_conversations;
CREATE POLICY "Users can create their own conversations"
ON chat_conversations FOR INSERT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own conversations" ON chat_conversations;
CREATE POLICY "Users can view their own conversations"
ON chat_conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own conversations" ON chat_conversations;
CREATE POLICY "Users can update their own conversations"
ON chat_conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversations" ON chat_conversations;
CREATE POLICY "Users can delete their own conversations"
ON chat_conversations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create policies for chat_messages
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON chat_messages;
CREATE POLICY "Users can insert messages to their conversations"
ON chat_messages FOR INSERT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM chat_conversations WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view messages from their conversations" ON chat_messages;
CREATE POLICY "Users can view messages from their conversations"
ON chat_messages FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM chat_conversations WHERE user_id = auth.uid()
  )
);

-- Enable realtime for all tables
alter publication supabase_realtime add table pm_knowledge;
alter publication supabase_realtime add table chat_conversations;
alter publication supabase_realtime add table chat_messages;
