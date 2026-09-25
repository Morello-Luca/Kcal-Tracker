function getEndpointUrl() {
  const baseUrl = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
  if (baseUrl.endsWith("/chat/completions")) return baseUrl;
  return baseUrl.replace(/\/+$/, "") + "/chat/completions";
}

const MODEL = process.env.LLM_MODEL || process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const SCALING_RULES = `Follow these steps:
1. Identify the food item(s) and any quantity, weight, volume, or size word mentioned (e.g. "2 slices", "200g", "a large bowl").
2. Estimate the nutrition for ONE standard reference unit of that food (e.g. one slice, 100g).
3. Account for restaurant/takeout context if mentioned or implied (e.g., hidden oils, butter, rich sauces, generous restaurant portions add ~15-25% more fat/calories than home-cooked equivalents).
4. Scale that reference linearly to the exact quantity described. For weights, scale from a 100g reference rather than defaulting to a typical serving size.
5. Only assume a single typical serving if no quantity, weight, or size is mentioned at all.

Worked examples:
- "2 slices of pizza": one slice of pepperoni pizza is roughly 285 kcal, 12g protein, 36g carbs, 10g fat. Two slices scales all four numbers by 2x: ~570 kcal, ~24g protein, ~66g carbs, ~20g fat.
- "200g chicken breast": grilled chicken breast is roughly 165 kcal, 31g protein, 0g carbs, 3.6g fat per 100g. 200g is 2x that reference: ~330 kcal, ~62g protein, 0g carbs, ~7g fat.
- "Restaurant pad thai": typical diner/restaurant portion fried in soybean oil: ~750 kcal, ~22g protein, ~92g carbs, ~32g fat (accounting for restaurant oil/sauce).`;

const INITIAL_SYSTEM_PROMPT = `You are a nutrition estimation assistant with granular knowledge of home-cooked foods, restaurant meals, local food items, and hidden oils/fats. Given a plain-English description of a food or meal, decide whether you have enough information to give an accurate estimate, or whether the answer would vary too much without more detail.

Ask a clarifying question ONLY when the missing detail would meaningfully change the result. Examples where you SHOULD ask:
- Pizza: crust type/size and toppings vary hugely. "2 slices of pizza" -> ask about size/style, e.g. thin 10-inch vs deep-pan 12-inch, or a specific chain.
- Sandwiches, burgers, local or restaurant dishes: ingredients, preparation method (e.g. restaurant vs home cooked, deep-fried vs grilled), or portion size vary a lot.
- Branded or packaged foods named without size/variant. "a bag of chips", "a chocolate bar" -> ask brand/size if not given.

Examples where you should NOT ask, just estimate directly — these have a well-defined, low-variance typical serving:
- "one medium banana", "a chicken breast", "a boiled egg", "a cup of white rice", "an apple", "200g chicken breast".

If quantity/weight/size is already given, still ask about what's genuinely ambiguous beyond that — e.g. "200g of pizza" still doesn't tell you the style/toppings — but "2 slices of a 10-inch thin crust cheese pizza from a restaurant" is specific enough to answer directly.

When you DO have enough information, apply these scaling rules:
${SCALING_RULES}

Respond with ONLY a JSON object, one of these two shapes:
- Final result: {"type": "result", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}
- Needs clarification: {"type": "clarify", "question": string}

The "question" should be ONE short, specific question (under 20 words) that would let you give an accurate estimate. Do not include any explanation beyond the JSON object.`;

const FINAL_SYSTEM_PROMPT = `You are a nutrition estimation assistant with granular knowledge of home-cooked foods, restaurant dishes, local food items, and realistic cooking oil/fat additions. Given a plain-English description of a food or meal (which may include added clarifying detail), estimate its TOTAL calories, protein, carbs, and fat — scaled to the exact quantity described, accounting for restaurant preparations where applicable. Give your best reasonable estimate even if some ambiguity remains; do not ask any further questions.

${SCALING_RULES}

Respond with ONLY a JSON object in this exact shape, with numbers (not strings) except "type":
{"type": "result", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}

Use reasonable real-world nutrition estimates. Do not include any explanation, only the JSON object.`;

function toResult(parsed) {
  return {
    type: "result",
    calories: Number(parsed.calories) || 0,
    protein_g: Number(parsed.protein_g) || 0,
    carbs_g: Number(parsed.carbs_g) || 0,
    fat_g: Number(parsed.fat_g) || 0,
  };
}

module.exports = async (req, res) => {
  const food = (req.query?.food || "").toString().trim();
  const isFinal = req.query?.final === "true" || req.query?.final === "1";

  if (!food) {
    res.status(400).json({ error: "Missing 'food' query parameter." });
    return;
  }

  const apiKey = process.env.LLM_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing LLM_API_KEY or GROQ_API_KEY environment variable." });
    return;
  }

  const systemPrompt = isFinal ? FINAL_SYSTEM_PROMPT : INITIAL_SYSTEM_PROMPT;

  try {
    const endpointUrl = getEndpointUrl();
    const groqRes = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: food },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("LLM API error:", groqRes.status, errText);
      res.status(502).json({ error: "Nutrition lookup service failed." });
      return;
    }

    const data = await groqRes.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      res.status(502).json({ error: "No response from nutrition lookup." });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      res.status(502).json({ error: "Could not parse nutrition data." });
      return;
    }

    // The `final` request is structurally capped to a single-shape prompt/parse
    // path (FINAL_SYSTEM_PROMPT never offers a "clarify" branch), so a caller
    // passing final=true always gets back a result — this is what guarantees
    // at most one round of clarification, regardless of model compliance.
    if (!isFinal && parsed?.type === "clarify" && typeof parsed.question === "string" && parsed.question.trim()) {
      res.status(200).json({ type: "clarify", question: parsed.question.trim() });
      return;
    }

    res.status(200).json(toResult(parsed));
  } catch (err) {
    console.error("Lookup handler error:", err);
    res.status(500).json({ error: "Unexpected server error." });
  }
};
