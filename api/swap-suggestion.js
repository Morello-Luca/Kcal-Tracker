const { retrieve } = require("../rag/retrieve.js");
const { generateSwap } = require("../rag/generate.js");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function getEndpointUrl() {
  const baseUrl = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
  if (baseUrl.endsWith("/chat/completions")) return baseUrl;
  return baseUrl.replace(/\/+$/, "") + "/chat/completions";
}

module.exports = async (req, res) => {
  const food = (req.query?.food || "").toString().trim();

  if (!food) {
    res.status(400).json({ error: "Missing 'food' query parameter." });
    return;
  }

  const apiKey = process.env.LLM_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing LLM_API_KEY or GROQ_API_KEY environment variable." });
    return;
  }

  // If GEMINI_API_KEY is available, use RAG retrieval pipeline
  if (process.env.GEMINI_API_KEY) {
    try {
      const results = await retrieve(food, 5);
      const answer = await generateSwap(food, results);
      res.status(200).json({ answer });
      return;
    } catch (err) {
      console.warn("RAG retrieval failed, falling back to LLM swap generation:", err);
    }
  }

  // Fallback direct LLM swap suggestion when GEMINI_API_KEY is missing
  try {
    const model = process.env.LLM_MODEL || process.env.GROQ_MODEL || "openai/gpt-oss-120b";
    const endpointUrl = getEndpointUrl();

    const groqRes = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "You are a friendly nutrition coach. When given a food or meal, suggest 2 healthier, nutritionally balanced swaps with lower calories, higher protein, or better nutrients. Keep your answer brief, concise, and engaging (under 100 words).",
          },
          {
            role: "user",
            content: `Suggest a healthier alternative swap for: ${food}`,
          },
        ],
      }),
    });

    if (!groqRes.ok) {
      throw new Error(`LLM API status ${groqRes.status}`);
    }

    const data = await groqRes.json();
    const answer = data?.choices?.[0]?.message?.content || "Consider swapping with grilled chicken or fresh fruit salad for lower calories and higher nutrients!";
    res.status(200).json({ answer });
  } catch (err) {
    console.error("Swap suggestion error:", err);
    res.status(502).json({ error: "Couldn't generate a suggestion. Try again." });
  }
};
