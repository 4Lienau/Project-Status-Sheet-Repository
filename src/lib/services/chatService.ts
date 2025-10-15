import { supabase } from "../supabase";
import type { ProjectWithRelations } from "./project";

export const chatService = {
  async sendMessage(
    message: string,
    projectId: string,
    projectTitle: string,
    projectData?: ProjectWithRelations | null,
  ) {
    try {
      console.log("[DEBUG] Preparing to call project-chat edge function");
      console.log("[DEBUG] Project ID:", projectId);
      console.log("[DEBUG] Project Title:", projectTitle);
      console.log("[DEBUG] Has project data:", !!projectData);

      // Prepare project context if available
      let projectContext = "";
      if (projectData && projectData.id) {
        console.log("[DEBUG] Building project context with data:", projectData.title);
        
        projectContext = `CURRENT PROJECT DETAILS:\n`;
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
            const description = typeof risk === "string" ? risk : risk.description;
            const impact = typeof risk === "string" ? "" : risk.impact || "";
            projectContext += `${index + 1}. ${description}${impact ? ` - Impact: ${impact}` : ""}\n`;
          });
        }

        // Add accomplishments if available
        if (projectData.accomplishments && projectData.accomplishments.length > 0) {
          projectContext += `\nProject Accomplishments:\n`;
          projectData.accomplishments.forEach((item, index) => {
            const description = typeof item === "string" ? item : item.description;
            projectContext += `${index + 1}. ${description}\n`;
          });
        }

        // Add next period activities if available
        if (projectData.next_period_activities && projectData.next_period_activities.length > 0) {
          projectContext += `\nNext Period Activities:\n`;
          projectData.next_period_activities.forEach((item, index) => {
            const description = typeof item === "string" ? item : item.description;
            projectContext += `${index + 1}. ${description}\n`;
          });
        }

        console.log("[DEBUG] Successfully built project context");
      } else {
        console.warn("[DEBUG] No project data available for context");
        projectContext = "No detailed project data is currently available.";
      }

      // Call the Supabase Edge Function
      console.log("[DEBUG] Calling supabase.functions.invoke for project-chat");
      
      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-project-chat",
        {
          body: {
            message,
            projectId,
            projectTitle,
            projectContext,
          },
        }
      );

      console.log("[DEBUG] Edge function response:", { data, error });

      if (error) {
        console.error("[DEBUG] Edge function error:", error);
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data || !data.response) {
        console.error("[DEBUG] Invalid response from edge function:", data);
        throw new Error("Invalid response from AI service");
      }

      console.log("[DEBUG] Successfully received AI response");
      return data.response;
    } catch (error) {
      console.error("Error calling project-chat edge function:", error);
      throw new Error("Failed to get response from AI service");
    }
  },
};