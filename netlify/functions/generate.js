const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
});

exports.handler = async function (event, context) {
  // Handle CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    };
  }

  try {
    console.log("Request received");
    console.log(
      "API Key present:",
      !!process.env.VITE_OPENAI_API_KEY || !!process.env.OPENAI_API_KEY,
    );

    const body = JSON.parse(event.body);
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Invalid messages format");
    }

    console.log("Sending request to OpenAI...");
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });
    console.log("Received response from OpenAI");

    if (
      !completion.choices ||
      !completion.choices[0] ||
      !completion.choices[0].message
    ) {
      throw new Error("Invalid response from OpenAI");
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
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
    console.error("Error:", error.message);
    console.error("Error stack:", error.stack);
    if (error.response) {
      console.error("OpenAI API Error:", {
        status: error.response.status,
        data: error.response.data,
      });
    }

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: `Generation failed: ${error.message}`,
        details: error.response?.data || null,
      }),
    };
  }
};
