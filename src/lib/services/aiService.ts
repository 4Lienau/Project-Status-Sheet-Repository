/**
 * File: aiService.ts
 * Purpose: Service for AI-powered content generation
 * Description: This service provides functions for generating AI content for projects, including
 * descriptions, value statements, milestones, and analysis. It uses a Netlify serverless function
 * for secure server-side OpenAI API calls, ensuring the API key is never exposed to the client.
 *
 * Imports from:
 * - AI usage tracking service
 * - Supabase client
 *
 * Used by:
 * - src/components/ProjectForm.tsx
 * - Other components that need AI-generated content
 *
 * Calls:
 * - netlify/functions/generate-content.ts (serverless function)
 */

import {
  aiUsageTrackingService,
  AIFeatureType,
} from "./aiUsageTrackingService";
import { supabase } from "../supabase";

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
    try {
      console.log(
        `Generating ${type} content via secure Netlify function`,
      );

      // Get the base URL from the current window location
      const baseUrl = window.location.origin;

      // Create an AbortController to handle timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Netlify function returned error: ${response.status}`);
          console.error(`Error details: ${errorText}`);
          throw new Error(
            `Server error: ${response.status} - ${errorText}`,
          );
        }

        const data = await response.json();
        console.log(
          `Successfully generated ${type} content via Netlify function`,
        );

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

      } catch (fetchError) {
        // Clear the timeout to prevent memory leaks
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error(`Error generating ${type} content:`, error.message);

      // Track failed AI usage attempts
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
            success: false,
            error: error.message,
          },
        });
      }

      // Provide fallback content based on type
      if (type === "analysis") {
        return `<p>Unable to generate analysis at this time. Please check your internet connection and try again.</p><p>If the problem persists, please contact support.</p>`;
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
        return `Unable to generate content at this time. Please check your internet connection and try again.`;
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