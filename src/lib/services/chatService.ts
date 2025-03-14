import OpenAI from "openai";
import { supabase } from "../supabase";
import type { ProjectWithRelations } from "./project";

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
        "match_pm_knowledge",
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

  async sendMessage(
    message: string,
    projectId: string,
    projectTitle: string,
    projectData?: ProjectWithRelations | null,
  ) {
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

      // Prepare project data context if available
      let projectContext = "";
      if (projectData && projectData.id) {
        console.log(
          "[DEBUG] Building project context with data:",
          projectData.title,
        );
        console.log("[DEBUG] Project data ID:", projectData.id);
        console.log(
          "[DEBUG] Project data object structure:",
          Object.keys(projectData),
        );
        console.log("[DEBUG] Project data type:", typeof projectData);
        console.log("[DEBUG] Is projectData null?", projectData === null);
        console.log(
          "[DEBUG] Is projectData undefined?",
          projectData === undefined,
        );
        console.log(
          "[DEBUG] Project data stringified:",
          JSON.stringify(
            projectData,
            (key, value) => {
              if (
                key === "milestones" ||
                key === "risks" ||
                key === "accomplishments" ||
                key === "next_period_activities" ||
                key === "considerations" ||
                key === "changes"
              ) {
                return `[Array with ${value?.length || 0} items]`;
              }
              return value;
            },
            2,
          ),
        );

        projectContext = `\n\nCURRENT PROJECT DETAILS:\n`;
        projectContext += `- Project ID: ${projectData.id}\n`;
        projectContext += `- Title: ${projectData.title}\n`;
        projectContext += `- Description: ${projectData.description || "Not provided"}\n`;
        projectContext += `- Status: ${projectData.status || "active"}\n`;
        projectContext += `- Budget: Total ${projectData.budget_total || 0}, Actuals ${projectData.budget_actuals || 0}, Forecast ${projectData.budget_forecast || 0}\n`;
        projectContext += `- Project Manager: ${projectData.project_manager || "Not assigned"}\n`;
        projectContext += `- Department: ${projectData.department || "Not specified"}\n`;
        projectContext += `- Sponsors: ${projectData.sponsors || "Not specified"}\n`;
        projectContext += `- Business Leads: ${projectData.business_leads || "Not specified"}\n`;

        // Add milestones if available
        if (projectData.milestones && projectData.milestones.length > 0) {
          projectContext += `\nProject Milestones:\n`;
          projectData.milestones.forEach((milestone, index) => {
            projectContext += `${index + 1}. ${milestone.milestone} (${milestone.date}) - ${milestone.completion}% complete, Status: ${milestone.status}\n`;
          });
        }

        // Add risks if available
        if (projectData.risks && projectData.risks.length > 0) {
          projectContext += `\nProject Risks & Issues:\n`;
          projectData.risks.forEach((risk, index) => {
            const description =
              typeof risk === "string" ? risk : risk.description;
            const impact = typeof risk === "string" ? "" : risk.impact || "";
            projectContext += `${index + 1}. ${description}${impact ? ` - Impact: ${impact}` : ""}\n`;
          });
        }

        // Add accomplishments if available
        if (
          projectData.accomplishments &&
          projectData.accomplishments.length > 0
        ) {
          projectContext += `\nProject Accomplishments:\n`;
          projectData.accomplishments.forEach((item, index) => {
            const description =
              typeof item === "string" ? item : item.description;
            projectContext += `${index + 1}. ${description}\n`;
          });
        }

        // Add next period activities if available
        if (
          projectData.next_period_activities &&
          projectData.next_period_activities.length > 0
        ) {
          projectContext += `\nNext Period Activities:\n`;
          projectData.next_period_activities.forEach((item, index) => {
            const description =
              typeof item === "string" ? item : item.description;
            projectContext += `${index + 1}. ${description}\n`;
          });
        }

        console.log("[DEBUG] Successfully built project context with data");
      } else {
        console.warn("[DEBUG] No project data available for context");
        console.log("[DEBUG] projectData is null or undefined");
        console.log("[DEBUG] projectId:", projectId);
        console.log("[DEBUG] projectTitle:", projectTitle);
        projectContext =
          "\n\nNo detailed project data is currently available. I cannot access specific information about this project at this moment.\n";
      }

      const systemPrompt = `You are Project Pilot, an AI assistant specialized in project management. 
      You are currently helping with a project titled "${projectTitle}"${projectId ? ` (ID: ${projectId})` : ""}.
      
      IMPORTANT INSTRUCTIONS ABOUT PROJECT DATA ACCESS:
      1. You have access to the current project's details ONLY IF you see specific project information after "CURRENT PROJECT DETAILS:" below.
      2. If you see "No detailed project data is currently available" instead, you DO NOT have access to this project's data.
      3. When asked about the project, ONLY refer to the specific details provided in the CURRENT PROJECT DETAILS section.
      4. NEVER make up or assume any project information that is not explicitly provided.
      
      If the user asks about their project and you don't have access to project data, respond with:
      "I don't currently have access to the specific details of your project. This could happen if you're viewing a new project that hasn't been saved yet, or if there's an issue with data loading. Please try refreshing the page, saving your project, or reopening it to allow me to access your project data."
      
      If you DO have project data (indicated by seeing actual project details like title, description, etc.), then respond with that information.
      
      Provide helpful, concise, and practical advice related to project management.
      If asked about technical implementation details, focus on high-level architecture and best practices.
      Always be professional, supportive, and solution-oriented.${projectContext}${knowledgeContext}`;

      console.log(
        "[DEBUG] System prompt first 200 chars:",
        systemPrompt.substring(0, 200),
      );
      console.log(
        "[DEBUG] Does system prompt contain project details?",
        systemPrompt.includes("CURRENT PROJECT DETAILS"),
      );
      console.log(
        "[DEBUG] Does system prompt indicate no data available?",
        systemPrompt.includes(
          "No detailed project data is currently available",
        ),
      );

      console.log("[DEBUG] Sending request to OpenAI");
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });
      console.log("[DEBUG] Received response from OpenAI");

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      throw new Error("Failed to get response from AI service");
    }
  },
};
