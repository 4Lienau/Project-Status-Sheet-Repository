const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
});

const handler = async (event) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    console.log("Request received");
    console.log("OpenAI API Key present:", !!openai.apiKey);

    const { messages } = JSON.parse(event.body);

    if (!messages?.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid or missing messages" }),
      };
    }

    console.log("Sending request to OpenAI...");
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    if (!completion.choices?.[0]?.message?.content) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Invalid response from OpenAI" }),
      };
    }

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
    if (error.response) {
      console.error("OpenAI API Error:", {
        status: error.response.status,
        data: error.response.data,
      });
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Generation failed: ${error.message}`,
        details: error.response?.data || null,
      }),
    };
  }
};

exports.handler = handler;
