function getEndpointUrl() {
  const baseUrl = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
  if (baseUrl.endsWith("/chat/completions")) return baseUrl;
  return baseUrl.replace(/\/+$/, "") + "/chat/completions";
}

const VISION_MODEL = process.env.LLM_VISION_MODEL || process.env.GROQ_VISION_MODEL || "llama-3.2-11b-vision-preview";

const SYSTEM_PROMPT_GENERAL = `You are a nutrition estimation assistant. You are shown a photo of food or packaging and told the quantity being eaten. Identify the product/food from the image, then estimate its TOTAL calories, protein, carbs, and fat scaled to EXACTLY the quantity described.

Respond with ONLY a JSON object in this exact shape, with numbers (not strings) except "description":
{"description": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}

"description" should be a short human-readable name for what you identified, including the quantity, e.g. "Nutella (30g)". Do not include any explanation beyond the JSON object.`;

const SYSTEM_PROMPT_LABEL = `You are an expert OCR and nutrition facts label parser supporting English, Japanese (栄養成分表示), and other languages. You are shown a photo that contains a Nutrition Facts / Values table or label.

Your task:
1. Carefully read the numbers printed on the nutrition label (e.g. Energy / Calories / 熱量 / エネルギー, Protein / たんぱく質, Carbohydrates / 炭水化物 / 糖質, Fat / 脂質, and Serving Size / 1包装あたり / Per 100g).
2. If the user specified a quantity (e.g. "150g" or "2 servings"), scale the values directly to that requested quantity.
3. If no quantity is specified, calculate for 1 serving or 100g as stated on the label.

Respond with ONLY a JSON object in this exact shape, with numbers (not strings) except "description":
{"description": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}

"description" should be a short product name or label identification with quantity, e.g. "Greek Yogurt (150g)" or "おにぎり (1個)". Do not include any text outside the JSON object.`;

function extractJson(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // ignore
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const body = req.body || {};
  const image = (body.image || "").toString();
  const quantity = (body.quantity || "").toString().trim();
  const mode = (body.mode || "auto").toString().toLowerCase(); // "label" or "meal"/"auto"

  if (!image.startsWith("data:image/")) {
    res.status(400).json({ error: "Missing or invalid 'image'." });
    return;
  }

  const apiKey = process.env.LLM_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing LLM_API_KEY or GROQ_API_KEY environment variable." });
    return;
  }

  const systemPrompt = mode === "label" ? SYSTEM_PROMPT_LABEL : SYSTEM_PROMPT_GENERAL;
  const quantityText = quantity || "one typical serving";

  // List of vision models to attempt in order if vision endpoint supports fallback
  const modelsToTry = [
    VISION_MODEL,
    "llama-3.2-11b-vision-preview",
    "llama-3.2-90b-vision-preview",
    "meta-llama/llama-4-scout-17b-16e-instruct"
  ];
  // Deduplicate array preserving order
  const uniqueModels = [...new Set(modelsToTry)];

  const endpointUrl = getEndpointUrl();
  let lastErrorText = "";

  for (const model of uniqueModels) {
    try {
      const payload = {
        model: model,
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Quantity / Serving: ${quantityText}` },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      };

      const groqRes = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!groqRes.ok) {
        lastErrorText = await groqRes.text();
        console.error(`Vision LLM API error with model ${model}:`, groqRes.status, lastErrorText);
        continue; // Try next model
      }

      const data = await groqRes.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        lastErrorText = "Empty response content from model";
        continue;
      }

      const parsed = extractJson(content);
      if (!parsed) {
        console.error("Could not parse JSON from content:", content);
        lastErrorText = "Failed to parse JSON response";
        continue;
      }

      return res.status(200).json({
        description: (parsed.description || "Food from photo").toString(),
        calories: Number(parsed.calories) || 0,
        protein_g: Number(parsed.protein_g) || 0,
        carbs_g: Number(parsed.carbs_g) || 0,
        fat_g: Number(parsed.fat_g) || 0,
      });
    } catch (err) {
      console.error(`Vision lookup attempt error for model ${model}:`, err);
      lastErrorText = err.message;
    }
  }

  // If all attempts failed
  res.status(502).json({
    error: `Vision service failed. (${lastErrorText || "Check API Key and endpoint settings"})`
  });
};
