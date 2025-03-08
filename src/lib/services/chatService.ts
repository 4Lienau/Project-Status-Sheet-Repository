import OpenAI from "openai";
import { supabase } from "../supabase";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export const chatService = {
  async searchKnowledgeBase(query: string, limit = 3) {
    try {
      // Generate embedding for the query
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: query,
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Search for similar content in the knowledge base
      const { data: knowledgeItems, error } = await supabase.rpc(
        "match_knowledge_items",
        {
          query_embedding: embedding,
          match_threshold: 0.5,
          match_count: limit,
        },
      );

      if (error) {
        console.error("Error searching knowledge base:", error);
        return [];
      }

      return knowledgeItems || [];
    } catch (error) {
      console.error("Error generating embedding or searching:", error);
      return [];
    }
  },

  async sendMessage(message: string, projectId: string, projectTitle: string) {
    try {
      // Search for relevant knowledge items
      const knowledgeItems = await this.searchKnowledgeBase(message);

      // Prepare context from knowledge items
      let knowledgeContext = "";
      if (knowledgeItems.length > 0) {
        knowledgeContext = "\n\nRelevant knowledge from our database:\n";
        knowledgeItems.forEach((item, index) => {
          knowledgeContext += `\n${index + 1}. ${item.title}:\n${item.content}\n`;
        });
      }

      const systemPrompt = `You are Project Pilot, an AI assistant specialized in project management. 
      You are currently helping with a project titled "${projectTitle}" (ID: ${projectId}).
      Provide helpful, concise, and practical advice related to project management.
      If asked about technical implementation details, focus on high-level architecture and best practices.
      Always be professional, supportive, and solution-oriented.${knowledgeContext}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      throw new Error("Failed to get response from AI service");
    }
  },
};
