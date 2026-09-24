function getEndpointUrl() {
  const baseUrl = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
  if (baseUrl.endsWith("/chat/completions")) return baseUrl;
  return baseUrl.replace(/\/+$/, "") + "/chat/completions";
}

const VISION_MODEL = process.env.LLM_VISION_MODEL || process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPT_GENERAL = `You are a nutrition estimation assistant. You are shown a photo of food or packaging and told the quantity being eaten. Identify the product/food from the image, then estimate its TOTAL calories, protein, carbs, and fat scaled to EXACTLY the quantity described.

Respond with ONLY a JSON object in this exact shape, with numbers (not strings) except "description":
{"description": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}

"description" should be a short human-readable name for what you identified, including the quantity, e.g. "Nutella (30g)". Do not include any explanation beyond the JSON object.`;

const SYSTEM_PROMPT_LABEL = `You are an expert OCR and nutrition facts label parser. You are shown a photo that contains a Nutrition Facts / Values table or label.

Your task:
1. Carefully read the numbers printed on the nutrition label (e.g. Energy / Calories, Protein, Carbohydrates / Sugars, Fat / Saturated Fat, and Serving Size / Per 100g).
2. If the user specified a quantity (e.g. "150g" or "2 servings"), scale the values directly to that requested quantity.
3. If no quantity is specified, calculate for 1 serving or 100g as stated on the label.

Respond with ONLY a JSON object in this exact shape, with numbers (not strings) except "description":
{"description": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}

"description" should be a short product name or label identification with quantity, e.g. "Greek Yogurt (150g)". Do not include any text outside the JSON object.`;

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
    res.status(500).json({ error: "Server is missing LLM_API_KEY or GROQ_API_KEY." });
    return;
  }

  const systemPrompt = mode === "label" ? SYSTEM_PROMPT_LABEL : SYSTEM_PROMPT_GENERAL;

  const quantityText = quantity || "one typical serving";

  try {
    const endpointUrl = getEndpointUrl();
    const groqRes = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
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
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Vision LLM API error:", groqRes.status, errText);
      res.status(502).json({ error: "Vision lookup service failed." });
      return;
    }

    const data = await groqRes.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      res.status(502).json({ error: "No response from vision lookup." });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      res.status(502).json({ error: "Could not parse vision lookup result." });
      return;
    }

    res.status(200).json({
      description: (parsed.description || "Food from photo").toString(),
      calories: Number(parsed.calories) || 0,
      protein_g: Number(parsed.protein_g) || 0,
      carbs_g: Number(parsed.carbs_g) || 0,
      fat_g: Number(parsed.fat_g) || 0,
    });
  } catch (err) {
    console.error("Vision lookup handler error:", err);
    res.status(500).json({ error: "Unexpected server error." });
  }
};
