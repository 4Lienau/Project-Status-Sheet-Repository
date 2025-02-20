const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
});

exports.handler = async function (event, context) {
  // Handle CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    console.log("Request body:", event.body);
    const body = JSON.parse(event.body);
    const { messages } = body;
    console.log("Parsed messages:", messages);
    console.log("API Key present:", !!openai.apiKey);

    if (!openai.apiKey) {
      throw new Error("OpenAI API key is missing");
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: body.max_tokens || 500,
      temperature: body.temperature || 0.7,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        choices: [
          {
            message: {
              content: completion.choices[0].message.content,
            },
          },
        ],
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error response:", error.response?.data);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to generate content",
        details: error.message,
      }),
    };
  }
};
