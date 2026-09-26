/* Verified 100g / 100ml Local Food Database (USDA / Official Standard Values) */

export const VERIFIED_LOCAL_FOODS = [
  // Staples & Grains
  { name: "pasta (raw)", keywords: ["pasta", "spaghetti", "penne", "macaroni", "fusilli"], per100g: { calories: 357, protein_g: 13, carbs_g: 71, fat_g: 1.5 }, unit: "g" },
  { name: "pasta (cooked)", keywords: ["cooked pasta", "cooked spaghetti", "pasta cotta"], per100g: { calories: 131, protein_g: 5, carbs_g: 25, fat_g: 1.1 }, unit: "g" },
  { name: "white rice (raw)", keywords: ["rice", "white rice", "risotto", "basmati", "jasmine"], per100g: { calories: 365, protein_g: 7.1, carbs_g: 80, fat_g: 0.7 }, unit: "g" },
  { name: "white rice (cooked)", keywords: ["cooked rice", "cooked white rice", "riso cotto"], per100g: { calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3 }, unit: "g" },
  { name: "brown rice (cooked)", keywords: ["brown rice", "cooked brown rice"], per100g: { calories: 112, protein_g: 2.6, carbs_g: 24, fat_g: 0.9 }, unit: "g" },
  { name: "rolled oats (raw)", keywords: ["oats", "oatmeal", "rolled oats", "avena"], per100g: { calories: 389, protein_g: 16.9, carbs_g: 66, fat_g: 6.9 }, unit: "g" },
  { name: "white bread", keywords: ["bread", "white bread", "pane", "toast"], per100g: { calories: 265, protein_g: 9, carbs_g: 49, fat_g: 3.2 }, unit: "g" },
  { name: "whole wheat bread", keywords: ["whole wheat bread", "wholemeal bread", "pane integrale"], per100g: { calories: 247, protein_g: 13, carbs_g: 41, fat_g: 3.4 }, unit: "g" },

  // Meats & Fish
  { name: "chicken breast (raw)", keywords: ["chicken breast", "chicken", "petto di pollo", "pollo"], per100g: { calories: 120, protein_g: 22.5, carbs_g: 0, fat_g: 2.6 }, unit: "g" },
  { name: "chicken breast (cooked/grilled)", keywords: ["cooked chicken", "grilled chicken", "pollo cotto"], per100g: { calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 }, unit: "g" },
  { name: "ground beef 90% lean (raw)", keywords: ["ground beef", "beef", "macinato", "manzo"], per100g: { calories: 176, protein_g: 20, carbs_g: 0, fat_g: 10 }, unit: "g" },
  { name: "beef steak (raw)", keywords: ["steak", "beef steak", "bistecca"], per100g: { calories: 217, protein_g: 26.1, carbs_g: 0, fat_g: 11.8 }, unit: "g" },
  { name: "pork loin (cooked)", keywords: ["pork", "pork loin", "maiale"], per100g: { calories: 242, protein_g: 27, carbs_g: 0, fat_g: 14 }, unit: "g" },
  { name: "salmon fillet (raw)", keywords: ["salmon", "salmon fillet", "salmone"], per100g: { calories: 208, protein_g: 20.4, carbs_g: 0, fat_g: 13.4 }, unit: "g" },
  { name: "canned tuna (in water)", keywords: ["tuna", "canned tuna", "tonno al naturale", "tonno"], per100g: { calories: 116, protein_g: 26, carbs_g: 0, fat_g: 1 }, unit: "g" },
  { name: "canned tuna (in olive oil)", keywords: ["tuna in oil", "tonno all'olio d'oliva"], per100g: { calories: 198, protein_g: 29, carbs_g: 0, fat_g: 9 }, unit: "g" },
  { name: "cod fillet (raw)", keywords: ["cod", "cod fillet", "merluzzo"], per100g: { calories: 82, protein_g: 18, carbs_g: 0, fat_g: 0.7 }, unit: "g" },

  // Eggs & Dairy
  { name: "whole egg", keywords: ["egg", "eggs", "whole egg", "uovo", "uova"], per100g: { calories: 143, protein_g: 12.6, carbs_g: 0.7, fat_g: 9.5 }, unit: "g" },
  { name: "egg whites", keywords: ["egg white", "egg whites", "albume"], per100g: { calories: 52, protein_g: 11, carbs_g: 0.7, fat_g: 0.2 }, unit: "g" },
  { name: "whole milk", keywords: ["milk", "whole milk", "latte intero", "latte"], per100g: { calories: 61, protein_g: 3.2, carbs_g: 4.8, fat_g: 3.3 }, unit: "ml" },
  { name: "skim milk", keywords: ["skim milk", "latte scremato"], per100g: { calories: 35, protein_g: 3.4, carbs_g: 5, fat_g: 0.1 }, unit: "ml" },
  { name: "greek yogurt 0%", keywords: ["greek yogurt", "nonfat greek yogurt", "yogurt greco 0%", "yogurt"], per100g: { calories: 59, protein_g: 10, carbs_g: 3.6, fat_g: 0.4 }, unit: "g" },
  { name: "greek yogurt 5%", keywords: ["whole greek yogurt", "yogurt greco intero"], per100g: { calories: 97, protein_g: 9, carbs_g: 3.9, fat_g: 5 }, unit: "g" },
  { name: "parmesan cheese", keywords: ["parmesan", "parmigiano", "parmigiano reggiano", "grana"], per100g: { calories: 431, protein_g: 38, carbs_g: 4.1, fat_g: 29 }, unit: "g" },
  { name: "mozzarella cheese", keywords: ["mozzarella"], per100g: { calories: 280, protein_g: 28, carbs_g: 3.1, fat_g: 17 }, unit: "g" },
  { name: "whey protein powder", keywords: ["whey protein", "protein powder", "proteine in polvere"], per100g: { calories: 370, protein_g: 80, carbs_g: 6, fat_g: 3 }, unit: "g" },

  // Fats & Oils
  { name: "extra virgin olive oil", keywords: ["olive oil", "extra virgin olive oil", "olio d'oliva", "olio"], per100g: { calories: 884, protein_g: 0, carbs_g: 0, fat_g: 100 }, unit: "ml" },
  { name: "butter", keywords: ["butter", "burro"], per100g: { calories: 717, protein_g: 0.9, carbs_g: 0.1, fat_g: 81 }, unit: "g" },
  { name: "peanut butter", keywords: ["peanut butter", "burro d'arachidi"], per100g: { calories: 588, protein_g: 25, carbs_g: 20, fat_g: 50 }, unit: "g" },
  { name: "almonds", keywords: ["almonds", "mandorle"], per100g: { calories: 579, protein_g: 21, carbs_g: 22, fat_g: 50 }, unit: "g" },
  { name: "walnuts", keywords: ["walnuts", "noci"], per100g: { calories: 654, protein_g: 15, carbs_g: 14, fat_g: 65 }, unit: "g" },

  // Fruits & Vegetables
  { name: "apple", keywords: ["apple", "mela"], per100g: { calories: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2 }, unit: "g" },
  { name: "banana", keywords: ["banana"], per100g: { calories: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3 }, unit: "g" },
  { name: "orange", keywords: ["orange", "arancia"], per100g: { calories: 47, protein_g: 0.9, carbs_g: 12, fat_g: 0.1 }, unit: "g" },
  { name: "strawberries", keywords: ["strawberries", "fragole"], per100g: { calories: 32, protein_g: 0.7, carbs_g: 7.7, fat_g: 0.3 }, unit: "g" },
  { name: "blueberries", keywords: ["blueberries", "mirtilli"], per100g: { calories: 57, protein_g: 0.7, carbs_g: 14.5, fat_g: 0.3 }, unit: "g" },
  { name: "avocado", keywords: ["avocado"], per100g: { calories: 160, protein_g: 2, carbs_g: 8.5, fat_g: 14.7 }, unit: "g" },
  { name: "potato (raw)", keywords: ["potato", "potatoes", "patata", "patate"], per100g: { calories: 77, protein_g: 2, carbs_g: 17, fat_g: 0.1 }, unit: "g" },
  { name: "sweet potato (raw)", keywords: ["sweet potato", "patata dolce"], per100g: { calories: 86, protein_g: 1.6, carbs_g: 20, fat_g: 0.1 }, unit: "g" },
  { name: "broccoli (raw)", keywords: ["broccoli"], per100g: { calories: 34, protein_g: 2.8, carbs_g: 6.6, fat_g: 0.4 }, unit: "g" },
  { name: "spinach (raw)", keywords: ["spinach", "spinaci"], per100g: { calories: 23, protein_g: 2.9, carbs_g: 3.6, fat_g: 0.4 }, unit: "g" },
  { name: "tomato", keywords: ["tomato", "tomatoes", "pomodoro", "pomodori"], per100g: { calories: 18, protein_g: 0.9, carbs_g: 3.9, fat_g: 0.2 }, unit: "g" },
];

/**
 * Match a query string against the local verified food database
 * @param {string} query
 * @returns {object|null}
 */
export function searchLocalVerifiedFood(query) {
  if (!query || typeof query !== "string") return null;
  const clean = query.trim().toLowerCase();

  // Direct keyword match
  for (const item of VERIFIED_LOCAL_FOODS) {
    if (item.name.toLowerCase() === clean || item.keywords.some(k => k.toLowerCase() === clean)) {
      return item;
    }
  }

  // Partial match
  for (const item of VERIFIED_LOCAL_FOODS) {
    if (item.keywords.some(k => clean.includes(k.toLowerCase()) || k.toLowerCase().includes(clean))) {
      return item;
    }
  }

  return null;
}

/**
 * Fetch verified nutritional data from Open Food Facts API (per 100g)
 * @param {string} query
 * @returns {Promise<object|null>}
 */
export async function fetchOpenFoodFacts(query) {
  if (!query) return null;
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=3`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.products || data.products.length === 0) return null;

    // Pick first product with valid 100g calories
    const prod = data.products.find(p => p.nutriments && (p.nutriments["energy-kcal_100g"] > 0 || p.nutriments["energy-kcal"] > 0));
    if (!prod) return null;

    const nut = prod.nutriments;
    const cals = Math.round(nut["energy-kcal_100g"] || nut["energy-kcal"] || 0);
    const prot = Math.round((nut["proteins_100g"] || nut["proteins"] || 0) * 10) / 10;
    const carbs = Math.round((nut["carbohydrates_100g"] || nut["carbohydrates"] || 0) * 10) / 10;
    const fat = Math.round((nut["fat_100g"] || nut["fat"] || 0) * 10) / 10;

    if (cals <= 0 && prot <= 0 && carbs <= 0) return null;

    return {
      name: prod.product_name || query,
      per100g: { calories: cals, protein_g: prot, carbs_g: carbs, fat_g: fat },
      unit: "g",
      source: "Open Food Facts",
    };
  } catch (err) {
    console.warn("Open Food Facts lookup failed:", err);
    return null;
  }
}

/**
 * Search local database first, then Open Food Facts API fallback
 * @param {string} query
 * @returns {Promise<object|null>}
 */
export async function getVerifiedFood100g(query) {
  const localMatch = searchLocalVerifiedFood(query);
  if (localMatch) {
    return { ...localMatch, source: "Official Local Database" };
  }

  // Fallback to Open Food Facts
  const offMatch = await fetchOpenFoodFacts(query);
  if (offMatch) {
    return offMatch;
  }

  return null;
}

/**
 * Calculate exact macros for a verified food item by gram/ml weight
 * @param {object} verifiedItem
 * @param {number} gramsOrMl
 * @returns {object}
 */
export function calculateMacrosForWeight(verifiedItem, gramsOrMl) {
  const factor = (gramsOrMl || 100) / 100;
  return {
    description: `${verifiedItem.name} (${gramsOrMl}${verifiedItem.unit})`,
    calories: Math.round(verifiedItem.per100g.calories * factor),
    protein_g: Math.round(verifiedItem.per100g.protein_g * factor * 10) / 10,
    carbs_g: Math.round(verifiedItem.per100g.carbs_g * factor * 10) / 10,
    fat_g: Math.round(verifiedItem.per100g.fat_g * factor * 10) / 10,
    verified: true,
    unit: verifiedItem.unit,
  };
}
