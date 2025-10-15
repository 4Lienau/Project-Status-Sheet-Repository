import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the request body
    const { message, projectId, projectTitle, projectContext } = await req.json();

    console.log("[Edge Function] Received request:", {
      projectId,
      projectTitle,
      messageLength: message?.length,
      hasProjectContext: !!projectContext,
      projectContextLength: projectContext?.length,
      projectContextPreview: projectContext?.substring(0, 200),
    });

    // Validate required fields
    if (!message || typeof message !== "string") {
      throw new Error("Message is required and must be a string");
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("[Edge Function] OPENAI_API_KEY not found in environment");
      throw new Error("OpenAI API key not configured");
    }

    // Check if we have actual project data (not just the "no data" message)
    const hasProjectData = projectContext && 
                          projectContext.includes("CURRENT PROJECT DETAILS:") &&
                          !projectContext.includes("No detailed project data is currently available");

    console.log("[Edge Function] Has project data:", hasProjectData);

    // Build system prompt based on whether we have project data
    let systemPrompt = `You are Project Pilot, an AI assistant specialized in project management.`;
    
    if (projectTitle) {
      systemPrompt += `\nYou are currently helping with a project titled "${projectTitle}"${projectId ? ` (ID: ${projectId})` : ""}.`;
    }

    systemPrompt += `\n\nYour role is to:
1. Answer general project management questions with practical, actionable advice
2. Help with project planning, risk management, milestone tracking, and team coordination
3. Provide insights based on project management best practices`;

    if (hasProjectData) {
      systemPrompt += `\n4. Reference specific details from the current project when relevant to the user's question

You have access to the following project information:

${projectContext}

When answering questions:
- Reference specific project details when they're relevant to the question
- Provide actionable recommendations based on the project's current state
- Be specific about milestones, risks, accomplishments, and activities when discussing them
- If asked about the project, use the actual data provided above`;
    } else {
      systemPrompt += `\n\nNote: You don't currently have access to specific project details. This could be because:
- The project is new and hasn't been saved yet
- The project data is still loading
- There was an issue retrieving the project data

You can still:
- Answer general project management questions
- Provide advice on project planning, execution, and monitoring
- Discuss best practices and methodologies
- Help with project management concepts and frameworks

If the user asks about their specific project, let them know you don't have access to the details and suggest they try refreshing the page or saving the project first.`;
    }

    console.log("[Edge Function] System prompt length:", systemPrompt.length);
    console.log("[Edge Function] Calling OpenAI API");

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("[Edge Function] OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    console.log("[Edge Function] OpenAI response received");

    const aiResponse = openaiData.choices?.[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("No response from OpenAI");
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        projectId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[Edge Function] Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An unexpected error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});