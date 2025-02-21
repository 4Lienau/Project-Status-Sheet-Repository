import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const getPrompt = (type: "description" | "value" | "milestones") => {
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
  }
};

export const aiService = {
  async generateContent(
    type: "description" | "value" | "milestones",
    title: string,
    description?: string,
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
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        return data.content;
      }
    } catch (e) {
      // If Netlify function fails, fall back to direct OpenAI call
      console.log("Falling back to direct OpenAI call");
    }

    // Direct OpenAI call as fallback
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: getPrompt(type) },
        {
          role: "user",
          content:
            title +
            (description ? "\n\nProject Description: " + description : ""),
        },
      ],
      max_tokens: type === "milestones" ? 1000 : 500,
      temperature: 0.7,
    });

    return completion.choices[0].message?.content || "";
  },
};
