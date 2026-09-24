// Client-side regex parser for Nutrition Facts OCR text
function parseNutritionLabelText(rawText) {
  const text = rawText.replace(/\r/g, '').toLowerCase();

  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  // Energy / Calories regex (match 'calories', 'cal', 'kcal', 'energy')
  const calMatch = text.match(/(?:calories|kcal|energy|cal)[^\d]*(\d+)/i) || text.match(/(\d+)\s*(?:kcal|calories)/i);
  if (calMatch) {
    calories = parseFloat(calMatch[1]) || 0;
  }

  // Protein regex
  const proteinMatch = text.match(/protein[^\d]*(\d+(?:\.\d+)?)\s*g?/i) || text.match(/(\d+(?:\.\d+)?)\s*g?\s*protein/i);
  if (proteinMatch) {
    protein = parseFloat(proteinMatch[1]) || 0;
  }

  // Carbs regex
  const carbMatch = text.match(/(?:carbohydrate|carbohydrates|carbs|carb)[^\d]*(\d+(?:\.\d+)?)\s*g?/i);
  if (carbMatch) {
    carbs = parseFloat(carbMatch[1]) || 0;
  }

  // Fat regex
  const fatMatch = text.match(/(?:total fat|fat)[^\d]*(\d+(?:\.\d+)?)\s*g?/i);
  if (fatMatch) {
    fat = parseFloat(fatMatch[1]) || 0;
  }

  return {
    description: "Label OCR Result",
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
