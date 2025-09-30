/**
 * File: generate-content.ts
 * Purpose: Secure serverless function for AI content generation using OpenAI API
 * Description: This Netlify function handles requests to generate various types of content 
 * (descriptions, value statements, milestones, analysis) for projects using OpenAI's API. 
 * The API key is securely stored in Netlify environment variables and never exposed to the client.
 *
 * Security Features:
 * - API key stored server-side only
 * - CORS restrictions to allowed domains
 * - Request validation and sanitization
 * - Error handling without exposing sensitive information
 *
 * Called by: src/lib/services/aiService.ts
 */

import { Handler } from "@netlify/functions";
import OpenAI from "openai";

// Initialize OpenAI client with server-side API key
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
};

// Allowed origins for CORS - add your domains here
const allowedOrigins = [
  "https://projects.re-wa.org",
  "https://rewapss.lienau.tech",
  "http://localhost:5173", // For local development
  "http://localhost:3000", // Alternative local development port
];

// Function to get CORS headers based on request origin
const getCorsHeaders = (origin: string | undefined) => {
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "frame-ancestors 'none';",
  };
};

// Function to get the appropriate prompt for each content type
const getPrompt = (type: string) => {
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
      throw new Error(`Invalid generation type: ${type}`);
  }
};

export const handler: Handler = async (event) => {
  // Get CORS headers based on request origin
  const origin = event.headers.origin || event.headers.Origin;
  const corsHeaders = getCorsHeaders(origin);

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // Validate that OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY environment variable is not set");
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Server configuration error",
          details: "AI service is not properly configured"
        }),
      };
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || "{}");
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Invalid JSON in request body",
          details: "Request body must be valid JSON"
        }),
      };
    }

    const { type, title, description, projectData } = requestBody;

    // Validate required fields
    if (!type || !title) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Missing required fields",
          details: "Both 'type' and 'title' are required"
        }),
      };
    }

    // Validate type
    const validTypes = ["description", "value", "milestones", "analysis"];
    if (!validTypes.includes(type)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Invalid content type",
          details: `Type must be one of: ${validTypes.join(", ")}`
        }),
      };
    }

    console.log(`Processing ${type} generation request for: ${title}`);

    // Get the appropriate prompt and token limit
    const prompt = getPrompt(type);
    const maxTokens = type === "analysis" ? 1500 : type === "milestones" ? 1000 : 500;

    // Prepare the content for the AI
    let userContent = title + (description ? `\n\nProject Description: ${description}` : "");

    // For analysis, include filtered project data with explanations
    if (type === "analysis" && projectData) {
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
        milestones: projectData.milestones?.map((m) => ({
          milestone: m.milestone,
          completion: m.completion, // Primary indicator of progress (0-100%)
          status: m.status, // Secondary to completion percentage
          date: m.date,
          owner: m.owner,
        })) || [],
        accomplishments: projectData.accomplishments || [],
        risks: projectData.risks || [],
        next_period_activities: projectData.nextPeriodActivities || [],
      };

      userContent += `\n\nProject Data: ${JSON.stringify(filteredData, null, 2)}`;
      userContent += "\n\nIMPORTANT: Milestone completion percentage (0-100%) is the true measure of progress. A milestone with 0% completion has NOT been achieved, regardless of status.";
    }

    // Initialize OpenAI client and make the API call
    const openai = getOpenAIClient();
    
    console.log("Making OpenAI API request...");
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userContent },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    const content = completion.choices[0].message?.content || "";
    
    if (!content.trim()) {
      throw new Error("OpenAI API returned empty content");
    }

    console.log(`Successfully generated ${type} content`);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: content,
        usage: completion.usage, // Include usage stats for monitoring
      }),
    };

  } catch (error) {
    console.error("Error in generate-content function:", error);

    // Don't expose internal error details to the client
    const isOpenAIError = error.message?.includes("OpenAI") || error.code;
    const clientError = isOpenAIError 
      ? "AI service temporarily unavailable" 
      : "Failed to generate content";

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: clientError,
        details: "Please try again in a few moments"
      }),
    };
  }
};