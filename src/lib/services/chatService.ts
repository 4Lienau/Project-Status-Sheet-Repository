import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export const chatService = {
  async sendMessage(message: string, projectId: string, projectTitle: string) {
    try {
      const systemPrompt = `You are Project Pilot, an AI assistant specialized in project management. 
      You are currently helping with a project titled "${projectTitle}" (ID: ${projectId}).
      Provide helpful, concise, and practical advice related to project management.
      If asked about technical implementation details, focus on high-level architecture and best practices.
      Always be professional, supportive, and solution-oriented.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      throw new Error("Failed to get response from AI service");
    }
  },
};
