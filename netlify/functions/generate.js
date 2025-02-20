const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    console.log("Request body:", event.body);
    const body = JSON.parse(event.body);
    const { messages } = body;
    console.log("Parsed messages:", messages);
    console.log("API Key present:", !!process.env.OPENAI_API_KEY);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return {
      statusCode: 200,
      headers: {
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
    console.error("Error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error response:", error.response?.data);
    console.log("OpenAI API Key present:", !!process.env.OPENAI_API_KEY);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "An error occurred during content generation",
      }),
    };
  }
};
