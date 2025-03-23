import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

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

Ensure dates are realistic starting from current date. Status should be one of: green, yellow, red.`;
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

export const aiService = {
  async generateContent(
    type: "description" | "value" | "milestones" | "analysis",
    title: string,
    description?: string,
    projectData?: any,
  ) {
    // Try using Netlify function first
    try {
      // Get the base URL from the current window location
      const baseUrl = window.location.origin;
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
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (type === "milestones") {
          return this.processMilestones(data.content);
        }
        return data.content;
      }
    } catch (e) {
      // If Netlify function fails, fall back to direct OpenAI call
      console.log("Falling back to direct OpenAI call");
    }

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

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: getPrompt(type) },
        { role: "user", content: userContent },
      ],
      max_tokens: type === "milestones" || type === "analysis" ? 1500 : 500,
      temperature: 0.7,
    });

    const content = completion.choices[0].message?.content || "";
    if (type === "milestones") {
      return this.processMilestones(content);
    }
    return content;
  },

  processMilestones(content: string) {
    try {
      // Parse the milestones from the AI response
      const milestones = JSON.parse(content);

      // Get current date
      const today = new Date();

      // Process each milestone to set dates and status
      return JSON.stringify(
        milestones.map((milestone: any, index: number) => {
          // Calculate date: today + (index * 2 weeks)
          const date = new Date(today);
          date.setDate(today.getDate() + index * 14); // Add two weeks (14 days) for each subsequent milestone

          return {
            ...milestone,
            date: date.toISOString().split("T")[0], // Format as YYYY-MM-DD
            status: "green", // Set status to "On Track" (green)
          };
        }),
      );
    } catch (error) {
      console.error("Error processing milestones:", error);
      return content; // Return original content if processing fails
    }
  },
};
