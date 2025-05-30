/**
 * File: generate-content.ts
 * Purpose: Serverless function that provides AI content generation capabilities using OpenAI API
 * Description: This Netlify function handles requests to generate various types of content (descriptions,
 * value statements, milestones, analysis) for projects using OpenAI's API. It processes incoming
 * requests, validates them, calls OpenAI, and returns the generated content.
 *
 * Called by: src/lib/services/aiService.ts
 */

import { Handler } from "@netlify/functions";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Allowed origins for CORS - restricted to production domains for security
const allowedOrigins = [
  "https://projects.re-wa.org",
  "https://rewapss.lienau.tech",
];

// Function to get CORS headers based on request origin
const getCorsHeaders = (origin: string | undefined) => {
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
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
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const { type, title, description, projectData } = JSON.parse(
      event.body || "{}",
    );

    if (!type || !title) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    let prompt = "";
    let maxTokens = 500;

    switch (type) {
      case "description":
        prompt =
          "You are a professional project manager. Generate a concise but detailed project description focusing on purpose, goals, and expected outcomes based on the project title. Return ONLY the description text, no other content or formatting.";
        maxTokens = 500;
        break;
      case "value":
        prompt =
          "You are a professional project manager. Generate a clear value statement focusing on the project's business value, ROI, and strategic importance based on the project title. Return ONLY the value statement text, no other content or formatting.";
        maxTokens = 300;
        break;
      case "milestones":
        prompt = `You are a professional project manager. Generate key milestones based on the project title and description. Return ONLY a JSON array of milestones with the following structure, no other text:
[
  {
    "date": "YYYY-MM-DD",
    "milestone": "Milestone description",
    "owner": "Role title",
    "completion": 0,
    "status": "green"
  }
]

Ensure dates are realistic starting from current date. Status should be one of: green, yellow, red.`;
        maxTokens = 1000;
        break;
      case "analysis":
        prompt = `You are a professional project manager creating an executive summary. Analyze the provided project data and generate a comprehensive executive summary that highlights:

1. Overall project health and status
2. Budget performance (comparing actuals vs forecast vs total)
3. Key milestone progress and any at-risk items
4. Major accomplishments to date
5. Critical risks and their potential impact
6. Upcoming key activities
7. Any considerations that need executive attention

Format your response as HTML with appropriate headings, paragraphs, and bullet points for readability. Be concise but thorough, focusing on the most important aspects an executive would need to understand about the current state of the project.`;
        maxTokens = 1500;
        break;
      default:
        throw new Error("Invalid generation type");
    }

    console.log("Making OpenAI request..."); // Debug log

    // Prepare the content for the AI based on the type
    let userContent =
      title + (description ? "\n\nProject Description: " + description : "");

    // For analysis, include all project data
    if (type === "analysis" && projectData) {
      userContent +=
        "\n\nProject Data: " + JSON.stringify(projectData, null, 2);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userContent },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    console.log("OpenAI response received"); // Debug log

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: completion.choices[0].message?.content || "",
      }),
    };
  } catch (error) {
    console.error("Error:", error); // Debug log

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Failed to generate content",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
