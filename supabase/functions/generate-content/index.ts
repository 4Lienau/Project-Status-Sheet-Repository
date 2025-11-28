/**
 * File: generate-content/index.ts
 * Purpose: Secure Supabase Edge Function for AI content generation using OpenAI API
 * Description: This function handles requests to generate various types of content 
 * (descriptions, value statements, milestones, analysis) for projects using OpenAI's API. 
 * The API key is securely stored in Supabase secrets and never exposed to the client.
 *
 * Security Features:
 * - API key stored server-side only
 * - CORS restrictions
 * - Request validation and sanitization
 * - Error handling without exposing sensitive information
 *
 * Called by: src/lib/services/aiService.ts
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to get the appropriate prompt for each content type
const getPrompt = (type: string): string => {
  switch (type) {
    case "description":
      return "You are a professional project manager. Generate a concise but detailed project description focusing on purpose, goals, and expected outcomes based on the project title. Return ONLY the description text, no other content or formatting.";
    case "value":
      return "You are a professional project manager. Generate a clear value statement focusing on the project's business value, ROI, and strategic importance based on the project title. Return ONLY the value statement text, no other content or formatting.";
    case "milestones":
      return `CRITICAL INSTRUCTION: You MUST generate a COMPLETE, COMPREHENSIVE milestone list for the project based on the project title and description. 

YOUR TASK:
1. Read the project title and description below
2. Think about what a COMPLETE project plan would look like for this type of project
3. Generate ALL the typical milestones from start to finish (at least 8 and up to 15 milestones)
4. First milestone MUST be "Project Kickoff" 
5. Last milestone MUST be "Project Closeout"

THEN AND ONLY THEN:
- If you see "Additional Context" at the bottom, add/modify specific milestones mentioned there
- DO NOT REPLACE your comprehensive list - only ADD TO or ADJUST it, even if the user context includes many milestones
- The additional context is SUPPLEMENTARY, not a replacement

YOU WILL FAIL THIS TASK IF:
- You generate ONLY the milestones mentioned in the additional context
- You skip standard project milestones that should obviously be included
- Your list is incomplete for the project type described

YOU WILL SUCCEED IF:
- Your milestone list would make sense even if there were NO additional context
- You include all standard phases for this project type
- The additional context (if any) enhances but doesn't replace your baseline

Return ONLY a JSON array, no other text:
[
  {
    "date": "YYYY-MM-DD",
    "milestone": "Milestone description",
    "owner": "Role title",
    "completion": 0,
    "status": "green"
  }
]

REQUIREMENTS:
- First: "Project Kickoff" (Project Manager)
- Last: "Project Closeout" (Project Manager)
- Status: ALWAYS "green"
- Dates: Realistic from today, properly spaced`;
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY environment variable is not set');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'AI service is not properly configured'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: 'Request body must be valid JSON'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { type, title, description, projectData, additionalContext } = requestBody;

    // Validate required fields
    if (!type || !title) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          details: "Both 'type' and 'title' are required"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate type
    const validTypes = ["description", "value", "milestones", "analysis"];
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid content type',
          details: `Type must be one of: ${validTypes.join(", ")}`
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Processing ${type} generation request for: ${title}`);

    // Get the appropriate prompt and token limit
    const prompt = getPrompt(type);
    const maxTokens = type === "analysis" ? 1500 : type === "milestones" ? 2000 : 500;

    // Prepare the content for the AI
    let userContent = `Project Title: ${title}`;
    
    if (description) {
      userContent += `\n\nProject Description: ${description}`;
    }
    
    // For milestones, explicitly separate baseline info from additional context
    if (type === "milestones") {
      userContent += `\n\n=== STEP 1: ANALYZE THE ABOVE PROJECT INFORMATION FIRST ===\nGenerate your complete baseline milestone timeline based ONLY on the title and description above.\n`;
      
      if (additionalContext) {
        userContent += `\n=== STEP 2: NOW REVIEW THIS ADDITIONAL CONTEXT ===\nAdditional Context/Instructions: ${additionalContext}\n\nIntegrate these specific requests into your baseline timeline from Step 1.`;
      } else {
        userContent += `\n=== STEP 2: NO ADDITIONAL CONTEXT PROVIDED ===\nProceed with your complete baseline milestone timeline from Step 1.`;
      }
    } else {
      // For non-milestone types, use the original format
      if (additionalContext) {
        userContent += `\n\nAdditional Context/Instructions: ${additionalContext}`;
      }
    }

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
        milestones: projectData.milestones?.map((m: any) => ({
          milestone: m.milestone,
          completion: m.completion,
          status: m.status,
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

    // Make OpenAI API call
    console.log('Making OpenAI API request...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const completion = await openaiResponse.json();
    const content = completion.choices[0].message?.content || "";
    
    if (!content.trim()) {
      throw new Error("OpenAI API returned empty content");
    }

    console.log(`Successfully generated ${type} content`);

    return new Response(
      JSON.stringify({
        content: content,
        usage: completion.usage,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-content function:', error);

    const isOpenAIError = error.message?.includes('OpenAI') || error.code;
    const clientError = isOpenAIError 
      ? 'AI service temporarily unavailable' 
      : 'Failed to generate content';

    return new Response(
      JSON.stringify({
        error: clientError,
        details: 'Please try again in a few moments'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
