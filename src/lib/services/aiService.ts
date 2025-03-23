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
      return `You are a professional project manager creating an executive summary. Analyze the provided project data and generate a concise executive summary in paragraph form that highlights:

- Do not list all of the milestones in the summary
- Do not create runon sentences
- Break the summary down into multiple paragraphs so it is easy to read
- Current project health and overall status
- Key observations about the project's progress and performance
- Any red flags, risks, or issues that executives should be aware of
- Budget performance concerns (if any)
- Critical milestones that are at risk

Format your response as a few concise paragraphs with minimal HTML formatting. Be direct and to the point, focusing only on the most important aspects an executive would need to know. Avoid bullet points, headings, or technical details. Write as if you're briefly summarizing the project status to a busy executive who has only 1 minute to read your summary.`;
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

    // For analysis, include all project data
    if (type === "analysis" && projectData) {
      userContent +=
        "\n\nProject Data: " + JSON.stringify(projectData, null, 2);
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
