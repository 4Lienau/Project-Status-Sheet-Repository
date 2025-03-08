-- Create the vector extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the pm_knowledge table for storing project management knowledge
CREATE TABLE IF NOT EXISTS pm_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create the chat_conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row level security
ALTER TABLE pm_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for pm_knowledge
CREATE POLICY "Admin users can insert pm_knowledge" ON pm_knowledge
  FOR INSERT TO authenticated
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE email IN ('4lienau@gmail.com', 'chrisl@re-wa.org')));

CREATE POLICY "Everyone can read pm_knowledge" ON pm_knowledge
  FOR SELECT USING (true);

-- Create policies for chat_conversations
CREATE POLICY "Users can create their own conversations" ON chat_conversations
  FOR INSERT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own conversations" ON chat_conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for chat_messages
CREATE POLICY "Users can insert messages to their conversations" ON chat_messages
  FOR INSERT TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM chat_conversations WHERE id = chat_messages.conversation_id
    )
  );

CREATE POLICY "Users can view messages from their conversations" ON chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE id = chat_messages.conversation_id AND user_id = auth.uid()
    )
  );

-- Add the vector search function
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

-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
