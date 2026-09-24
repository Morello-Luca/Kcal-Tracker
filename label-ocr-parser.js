// Client-side regex parser for English and Japanese Nutrition Facts OCR text
function parseNutritionLabelText(rawText) {
  if (!rawText) return { description: "Label OCR Result", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, rawText: "" };

  const text = rawText.replace(/\r/g, '').toLowerCase();

  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  // 1. Calories / Energy (English + Japanese: エネルギー, 熱量, カロリー, kcal)
  const calMatch =
    text.match(/(?:エネルギー|熱量|カロリー|calories|kcal|energy|cal)[^\d]*(\d+(?:\.\d+)?)/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*(?:kcal|カロリー|エネルギー)/i);
  if (calMatch) {
    calories = parseFloat(calMatch[1]) || 0;
  }

  // 2. Protein (English + Japanese: たんぱく質, タンパク質, 蛋白)
  const proteinMatch =
    text.match(/(?:たんぱく質|タンパク質|蛋白質|protein)[^\d]*(\d+(?:\.\d+)?)\s*g?/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:たんぱく質|タンパク質|protein)/i);
  if (proteinMatch) {
    protein = parseFloat(proteinMatch[1]) || 0;
  }

  // 3. Carbohydrates / Carbs / Sugars (English + Japanese: 炭水化物, 糖質)
  const carbMatch =
    text.match(/(?:炭水化物|糖質|carbohydrate|carbohydrates|carbs|carb)[^\d]*(\d+(?:\.\d+)?)\s*g?/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:炭水化物|糖質|carbohydrate)/i);
  if (carbMatch) {
    carbs = parseFloat(carbMatch[1]) || 0;
  }

  // 4. Fat (English + Japanese: 脂質)
  const fatMatch =
    text.match(/(?:脂質|total fat|fat)[^\d]*(\d+(?:\.\d+)?)\s*g?/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:脂質|fat)/i);
  if (fatMatch) {
    fat = parseFloat(fatMatch[1]) || 0;
  }

  return {
    description: "栄養成分 (Label OCR Result)",
    calories: calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    rawText: rawText
  };
}

if (typeof module !== 'undefined') {
  module.exports = { parseNutritionLabelText };
}
