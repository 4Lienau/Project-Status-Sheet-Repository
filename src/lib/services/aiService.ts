/**
 * File: aiService.ts
 * Purpose: Service for AI-powered content generation
 * Description: This service provides functions for generating AI content for projects, including
 * descriptions, value statements, milestones, and analysis. It first attempts to use a Netlify
 * serverless function for generation, with a fallback to direct OpenAI API calls. The service
 * includes specialized processing for different content types and handles formatting of responses.
 *
 * Imports from:
 * - OpenAI client
 *
 * Used by:
 * - src/components/ProjectForm.tsx
 * - Other components that need AI-generated content
 *
 * Calls:
 * - netlify/functions/generate-content.ts (serverless function)
 */

import OpenAI from "openai";
import {
  aiUsageTrackingService,
  AIFeatureType,
} from "./aiUsageTrackingService";
import { supabase } from "../supabase";

// Function to get OpenAI client with current API key
const getOpenAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'The OPENAI_API_KEY environment variable is missing or empty; either provide it, or instantiate the OpenAI client with an apiKey option, like new OpenAI({ apiKey: "My API Key" })',
    );
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
};

const getPrompt = (
  type: "description" | "value" | "milestones" | "analysis",
) => {
  switch (type) {
    case "description":
      return "You are a professional project manager. Generate a concise but detailed project description focusing on purpose, goals, and expected outcomes based on the project title. Return ONLY the description text, no other content or formatting.";
    case "value":
      return "You are a professional project manager. Generate a clear value statement focusing on the project's business value, ROI, and strategic importance based on the project title. Return ONLY the value statement text, no other content or formatting.";
    case "milestones":
      return `You are a professional project manager. Generate key milestones based on the project title and description. Return ONLY a JSON array of milestones with the following structure, no other text:
[
  {
    "date": "YYYY-MM-DD",
    "milestone": "Milestone description",
    "owner": "Role title",
    "completion": 0,
    "status": "green"
  }
]

CRITICAL REQUIREMENTS:
- The FIRST milestone must ALWAYS be "Project Kickoff" with owner "Project Manager"
- The LAST milestone must ALWAYS be "Project Closeout" with owner "Project Manager"
- Generate 3-7 additional milestones between kickoff and closeout that are specific to the project
- Ensure dates are realistic starting from current date, spaced appropriately
- Status must ALWAYS be "green" for all milestones (representing "On Track" status)
- Total milestones should be 5-9 (including mandatory kickoff and closeout)
- NEVER use "yellow" or "red" status - ALL milestones should start as "green"`;
    case "analysis":
      return `You are a professional project manager creating a project status summary. Analyze the provided project data and generate a concise summary in paragraph form that highlights:

- Overall project health (based primarily on milestone completion percentages, not status fields)
- Budget context (note that zero actuals may simply indicate a new project, not a problem)
- Key milestone progress (use the completion percentage as the primary indicator of progress)
- Major accomplishments to date
- Critical risks and their potential impact
- Upcoming key activities

Interpretation guidelines:
- Milestone completion percentage (0-100%) is the true measure of progress, not the status field
- A milestone with 0% completion has NOT been achieved, regardless of status
- Budget actuals of zero are normal for new projects and not necessarily concerning
- Focus on measurable data rather than making assumptions

Format your response as HTML with 2-3 concise paragraphs (<p> tags). Use bullet points (<ul><li>) sparingly and only when absolutely necessary for clarity. The entire summary should be brief enough to read in under a minute. Focus on key insights rather than comprehensive details. Use a neutral, factual tone without addressing any specific audience (avoid phrases like "executives should"). Be direct and to the point, highlighting only the most critical information about the current state of the project.`;
    default:
      throw new Error("Invalid generation type");
  }
};

// Helper function to get current user ID
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

// Helper function to map AI service types to tracking feature types
const mapTypeToFeatureType = (
  type: "description" | "value" | "milestones" | "analysis",
): AIFeatureType | null => {
  switch (type) {
    case "description":
      return "description";
    case "value":
      return "value_statement";
    case "milestones":
      return "milestones";
    case "analysis":
      return "project_pilot"; // Analysis is used by Project Pilot
    default:
      return null;
  }
};

export const aiService = {
  async generateContent(
    type: "description" | "value" | "milestones" | "analysis",
    title: string,
    description?: string,
    projectData?: any,
  ) {
    // Try using Netlify function first with a timeout
    try {
      console.log(
        `Attempting to generate ${type} content via Netlify function`,
      );
      // Get the base URL from the current window location
      const baseUrl = window.location.origin;

      // Create an AbortController to handle timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        const response = await fetch(
          `${baseUrl}/.netlify/functions/generate-content`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type,
              title,
              description,
              projectData,
            }),
            signal: controller.signal,
          },
        );

        // Clear the timeout since the request completed
        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(
            `Successfully generated ${type} content via Netlify function`,
          );
          const data = await response.json();

          // Track AI usage - only track successful generations
          const userId = await getCurrentUserId();
          const featureType = mapTypeToFeatureType(type);
          if (userId && featureType) {
            await aiUsageTrackingService.logAIUsage({
              user_id: userId,
              feature_type: featureType,
              project_id: projectData?.id,
              metadata: {
                method: "netlify_function",
                title: title,
                success: true,
              },
            });
          }

          if (type === "milestones") {
            return this.processMilestones(data.content);
          }
          return data.content;
        } else {
          console.error(`Netlify function returned error: ${response.status}`);
          const errorText = await response.text();
          console.error(`Error details: ${errorText}`);
          throw new Error(
            `Netlify function error: ${response.status} - ${errorText}`,
          );
        }
      } catch (fetchError) {
        // Clear the timeout to prevent memory leaks
        clearTimeout(timeoutId);
        // Re-throw to be caught by the outer try/catch
        throw fetchError;
      }
    } catch (e) {
      // If Netlify function fails, fall back to direct OpenAI call
      console.log(
        `Netlify function failed: ${e.message}. Falling back to direct OpenAI call`,
      );

      // Direct OpenAI call as fallback
      // Prepare the content for the AI based on the type
      let userContent =
        title + (description ? "\n\nProject Description: " + description : "");

      // For analysis, include filtered project data with explanations
      if (type === "analysis" && projectData) {
        // Create a simplified version of the project data with explanations
        const filteredData = {
          title: projectData.title,
          status: projectData.status,
          description: projectData.description,
          budget: {
            total: projectData.budget?.total || 0,
            actuals: projectData.budget?.actuals || 0,
            forecast: projectData.budget?.forecast || 0,
            note: "Zero actuals may indicate a new project, not necessarily a problem",
          },
          milestones:
            projectData.milestones?.map((m) => ({
              milestone: m.milestone,
              completion: m.completion, // This is the primary indicator of progress (0-100%)
              status: m.status, // This is secondary to completion percentage
              date: m.date,
              owner: m.owner,
            })) || [],
          accomplishments: projectData.accomplishments || [],
          risks: projectData.risks || [],
          next_period_activities: projectData.nextPeriodActivities || [],
        };

        userContent +=
          "\n\nProject Data: " +
          JSON.stringify(filteredData, null, 2) +
          "\n\nIMPORTANT: Milestone completion percentage (0-100%) is the true measure of progress. A milestone with 0% completion has NOT been achieved, regardless of status.";
      }

      // Get OpenAI client - this will throw an error if API key is missing
      const openai = getOpenAIClient();

      try {
        console.log(`Making direct OpenAI API call for ${type} generation`);

        // Add a timeout for the OpenAI API call
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () =>
              reject(new Error("OpenAI API call timed out after 30 seconds")),
            30000,
          );
        });

        // Create the API call promise
        const apiCallPromise = openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: getPrompt(type) },
            { role: "user", content: userContent },
          ],
          max_tokens: type === "milestones" || type === "analysis" ? 1500 : 500,
          temperature: 0.7,
        });

        // Race the API call against the timeout
        const completion = await Promise.race([apiCallPromise, timeoutPromise]);
        console.log(`OpenAI API call successful for ${type} generation`);

        const content = completion.choices[0].message?.content || "";
        if (content.trim() === "") {
          throw new Error("OpenAI API returned empty content");
        }

        // Track AI usage for successful OpenAI API calls - only when fallback is used
        const userId = await getCurrentUserId();
        const featureType = mapTypeToFeatureType(type);
        if (userId && featureType) {
          await aiUsageTrackingService.logAIUsage({
            user_id: userId,
            feature_type: featureType,
            project_id: projectData?.id,
            metadata: {
              method: "openai_direct_fallback",
              title: title,
              success: true,
              model: "gpt-3.5-turbo",
              note: "Used as fallback after Netlify function failed",
            },
          });
        }

        if (type === "milestones") {
          return this.processMilestones(content);
        }
        return content;
      } catch (error) {
        console.error(`Error in OpenAI API call: ${error.message}`);
        // Provide fallback content in case of API error
        if (type === "analysis") {
          return `<p>Unable to generate analysis due to an API error: ${error.message}</p><p>Please try again later or check your API key configuration.</p>`;
        } else if (type === "milestones") {
          return this.processMilestones(
            JSON.stringify([
              {
                date: new Date().toISOString().split("T")[0],
                milestone: "Project Kickoff",
                owner: "Project Manager",
                completion: 0,
                status: "green",
              },
              {
                date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
                milestone: "Project Closeout",
                owner: "Project Manager",
                completion: 0,
                status: "green",
              },
            ]),
          );
        } else {
          return `Unable to generate content due to an API error. Please try again later.`;
        }
      }
    }
  },

  processMilestones(content: string) {
    try {
      // Parse the milestones from the AI response
      // First try to extract JSON if it's wrapped in text
      let jsonContent = content;

      // Try to find JSON array in the content if it's not pure JSON
      const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }

      // Parse the JSON content
      let milestones = JSON.parse(jsonContent);

      if (!Array.isArray(milestones)) {
        throw new Error("Parsed content is not an array");
      }

      // Validate milestone quality first
      const qualityCheck = this.validateMilestoneQuality(milestones);
      console.log("📊 Milestone quality assessment:", qualityCheck);

      // Ensure we always have Project Kickoff and Project Closeout milestones
      milestones = this.ensureMandatoryMilestones(milestones);

      // Log final milestone structure for debugging
      console.log("🎯 Final processed milestones:", {
        count: milestones.length,
        first: milestones[0]?.milestone,
        last: milestones[milestones.length - 1]?.milestone,
        qualityScore: qualityCheck.score,
      });

      // Get current date and add one week for the first milestone
      const today = new Date();
      const oneWeekFromToday = new Date(today);
      oneWeekFromToday.setDate(today.getDate() + 7); // Start first milestone one week from today

      // Process each milestone to set dates and status
      return JSON.stringify(
        milestones.map((milestone: any, index: number) => {
          // Calculate date: one week from today + (index * 2 weeks)
          const date = new Date(oneWeekFromToday);
          date.setDate(oneWeekFromToday.getDate() + index * 14); // Add two weeks (14 days) for each subsequent milestone

          return {
            ...milestone,
            date: milestone.date || date.toISOString().split("T")[0], // Use provided date or calculate one
            owner: milestone.owner || "Project Manager", // Provide default owner if missing
            completion:
              typeof milestone.completion === "number"
                ? milestone.completion
                : 0,
            status: "green", // ALWAYS set status to "green" (On Track) for all generated milestones
          };
        }),
      );
    } catch (error) {
      console.error("Error processing milestones:", error);
      // Return a default milestone array as fallback with mandatory milestones
      const today = new Date();
      const oneWeekFromToday = new Date(
        today.getTime() + 7 * 24 * 60 * 60 * 1000,
      );
      const defaultMilestones = [
        {
          date: oneWeekFromToday.toISOString().split("T")[0],
          milestone: "Project Kickoff",
          owner: "Project Manager",
          completion: 0,
          status: "green",
        },
        {
          date: new Date(oneWeekFromToday.getTime() + 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          milestone: "Requirements Gathering",
          owner: "Business Analyst",
          completion: 0,
          status: "green",
        },
        {
          date: new Date(oneWeekFromToday.getTime() + 28 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          milestone: "Design Phase Complete",
          owner: "Design Lead",
          completion: 0,
          status: "green",
        },
        {
          date: new Date(oneWeekFromToday.getTime() + 42 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          milestone: "Project Closeout",
          owner: "Project Manager",
          completion: 0,
          status: "green",
        },
      ];
      return JSON.stringify(defaultMilestones);
    }
  },

  // Helper method to validate milestone quality
  validateMilestoneQuality(milestones: any[]) {
    const issues = [];

    milestones.forEach((milestone, index) => {
      // Check for empty or generic milestone names
      if (!milestone.milestone || milestone.milestone.trim().length < 5) {
        issues.push(`Milestone ${index + 1}: Name too short or empty`);
      }

      // Check for missing owners
      if (!milestone.owner || milestone.owner.trim().length < 2) {
        issues.push(`Milestone ${index + 1}: Missing or invalid owner`);
      }

      // Check for invalid dates
      if (milestone.date && isNaN(new Date(milestone.date).getTime())) {
        issues.push(`Milestone ${index + 1}: Invalid date format`);
      }

      // Check for duplicate milestone names
      const duplicates = milestones.filter(
        (m) =>
          m.milestone &&
          m.milestone.toLowerCase() === milestone.milestone.toLowerCase(),
      );
      if (duplicates.length > 1) {
        issues.push(
          `Milestone "${milestone.milestone}": Duplicate milestone name`,
        );
      }
    });

    if (issues.length > 0) {
      console.warn("🚨 Milestone quality issues detected:", issues);
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, 100 - issues.length * 20), // Quality score out of 100
    };
  },

  // Helper method to ensure mandatory milestones are always present
  ensureMandatoryMilestones(milestones: any[]) {
    const hasKickoff = milestones.some(
      (m) => m.milestone && m.milestone.toLowerCase().includes("kickoff"),
    );
    const hasCloseout = milestones.some(
      (m) =>
        m.milestone &&
        (m.milestone.toLowerCase().includes("closeout") ||
          m.milestone.toLowerCase().includes("closure")),
    );

    let processedMilestones = [...milestones];

    // Add Project Kickoff if missing (at the beginning)
    if (!hasKickoff) {
      processedMilestones.unshift({
        milestone: "Project Kickoff",
        owner: "Project Manager",
        completion: 0,
        status: "green",
      });
    }

    // Add Project Closeout if missing (at the end)
    if (!hasCloseout) {
      processedMilestones.push({
        milestone: "Project Closeout",
        owner: "Project Manager",
        completion: 0,
        status: "green",
      });
    }

    // If we have kickoff but it's not first, move it to the beginning
    const kickoffIndex = processedMilestones.findIndex(
      (m) => m.milestone && m.milestone.toLowerCase().includes("kickoff"),
    );
    if (kickoffIndex > 0) {
      const kickoffMilestone = processedMilestones.splice(kickoffIndex, 1)[0];
      processedMilestones.unshift(kickoffMilestone);
    }

    // If we have closeout but it's not last, move it to the end
    const closeoutIndex = processedMilestones.findIndex(
      (m) =>
        m.milestone &&
        (m.milestone.toLowerCase().includes("closeout") ||
          m.milestone.toLowerCase().includes("closure")),
    );
    if (closeoutIndex >= 0 && closeoutIndex < processedMilestones.length - 1) {
      const closeoutMilestone = processedMilestones.splice(closeoutIndex, 1)[0];
      processedMilestones.push(closeoutMilestone);
    }

    return processedMilestones;
  },
};
