const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "community-barcodes.json");

// In-memory cache for fallback if filesystem is read-only in serverless environment
let inMemoryDb = null;

function loadCommunityDb() {
  if (inMemoryDb) return inMemoryDb;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      inMemoryDb = JSON.parse(raw);
      return inMemoryDb;
    }
  } catch (err) {
    console.warn("Could not read community-barcodes.json, starting empty:", err);
  }
  inMemoryDb = {};
  return inMemoryDb;
}

function saveCommunityDb(db) {
  inMemoryDb = db;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.warn("Could not persist community-barcodes.json to disk (read-only environment):", err);
  }
}

async function fetchOffProductV2(code) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const prod = data.product;
    const n = prod.nutriments || {};
    const cals = Number(n["energy-kcal_100g"]) || Number(n["energy-kcal"]) || 0;
    if (!cals) return null;

    return {
      code,
      name: prod.product_name || prod.product_name_en || `Product ${code}`,
      brand: prod.brands || "",
      per100g: {
        calories: cals,
        protein_g: Number(n.proteins_100g) || Number(n.proteins) || 0,
        carbs_g: Number(n.carbohydrates_100g) || Number(n.carbohydrates) || 0,
        fat_g: Number(n.fat_100g) || Number(n.fat) || 0,
      },
      serving_quantity: Number(prod.serving_quantity) > 0 ? Math.round(Number(prod.serving_quantity)) : 100,
      unit: "g",
      source: "Open Food Facts",
      confirmations: 0,
    };
  } catch (err) {
    console.warn("OFF V2 lookup error:", err);
    return null;
  }
}

async function fetchOffProductV0(code) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const prod = data.product;
    const n = prod.nutriments || {};
    const cals = Number(n["energy-kcal_100g"]) || Number(n["energy-kcal"]) || 0;
    if (!cals) return null;

    return {
      code,
      name: prod.product_name || prod.product_name_en || `Product ${code}`,
      brand: prod.brands || "",
      per100g: {
        calories: cals,
        protein_g: Number(n.proteins_100g) || Number(n.proteins) || 0,
        carbs_g: Number(n.carbohydrates_100g) || Number(n.carbohydrates) || 0,
        fat_g: Number(n.fat_100g) || Number(n.fat) || 0,
      },
      serving_quantity: Number(prod.serving_quantity) > 0 ? Math.round(Number(prod.serving_quantity)) : 100,
      unit: "g",
      source: "Open Food Facts",
      confirmations: 0,
    };
  } catch (err) {
    console.warn("OFF V0 lookup error:", err);
    return null;
  }
}

async function fetchOffSearch(code) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?code=${encodeURIComponent(code)}&json=1`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.products || data.products.length === 0) return null;

    const prod = data.products.find((p) => p.nutriments && (p.nutriments["energy-kcal_100g"] > 0 || p.nutriments["energy-kcal"] > 0));
    if (!prod) return null;

    const n = prod.nutriments || {};
    const cals = Number(n["energy-kcal_100g"]) || Number(n["energy-kcal"]) || 0;

    return {
      code,
      name: prod.product_name || prod.product_name_en || `Product ${code}`,
      brand: prod.brands || "",
      per100g: {
        calories: cals,
        protein_g: Number(n.proteins_100g) || Number(n.proteins) || 0,
        carbs_g: Number(n.carbohydrates_100g) || Number(n.carbohydrates) || 0,
        fat_g: Number(n.fat_100g) || Number(n.fat) || 0,
      },
      serving_quantity: Number(prod.serving_quantity) > 0 ? Math.round(Number(prod.serving_quantity)) : 100,
      unit: "g",
      source: "Open Food Facts Search",
      confirmations: 0,
    };
  } catch (err) {
    console.warn("OFF Search error:", err);
    return null;
  }
}

async function fetchUsdaGtin(code) {
  try {
    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(code)}&api_key=DEMO_KEY`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.foods || data.foods.length === 0) return null;

    const food = data.foods[0];
    const nutrients = food.foodNutrients || [];

    const getNutrient = (namePatterns) => {
      const match = nutrients.find((n) => namePatterns.some((p) => n.nutrientName && n.nutrientName.toLowerCase().includes(p.toLowerCase())));
      return match ? Number(match.value) || 0 : 0;
    };

    const cals = getNutrient(["energy", "kcal"]);
    if (!cals) return null;

    return {
      code,
      name: food.description || `Product ${code}`,
      brand: food.brandOwner || food.brandName || "",
      per100g: {
        calories: cals,
        protein_g: getNutrient(["protein"]),
        carbs_g: getNutrient(["carbohydrate"]),
        fat_g: getNutrient(["total lipid", "fat"]),
      },
      serving_quantity: Number(food.servingSize) > 0 ? Math.round(Number(food.servingSize)) : 100,
      unit: food.servingSizeUnit || "g",
      source: "USDA FoodData Central",
      confirmations: 0,
    };
  } catch (err) {
    console.warn("USDA GTIN lookup error:", err);
    return null;
  }
}

module.exports = async (req, res) => {
  const method = req.method || "GET";
  const query = req.query || {};

  if (method === "GET") {
    const db = loadCommunityDb();

    if (query.list === "true" || query.list === "1" || query.search) {
      const searchTerm = (query.search || "").trim().toLowerCase();
      let list = Object.values(db);

      if (searchTerm) {
        list = list.filter(
          (item) =>
            item.code.includes(searchTerm) ||
            item.name.toLowerCase().includes(searchTerm) ||
            (item.brand && item.brand.toLowerCase().includes(searchTerm))
        );
      }

      list.sort((a, b) => (b.confirmations || 0) - (a.confirmations || 0));

      res.status(200).json({ success: true, count: list.length, products: list });
      return;
    }

    const code = (query.code || "").toString().trim();
    if (!code) {
      res.status(400).json({ error: "Missing 'code' query parameter." });
      return;
    }

    // 1. Check Community Database
    if (db[code]) {
      const item = db[code];
      res.status(200).json({
        found: true,
        product: {
          ...item,
          source: "Community Database",
        },
      });
      return;
    }

    // 2. Fallback: Open Food Facts V2
    let product = await fetchOffProductV2(code);

    // 3. Fallback: Open Food Facts V0
    if (!product) {
      product = await fetchOffProductV0(code);
    }

    // 4. Fallback: Open Food Facts Search
    if (!product) {
      product = await fetchOffSearch(code);
    }

    // 5. Fallback: USDA FoodData Central
    if (!product) {
      product = await fetchUsdaGtin(code);
    }

    if (product) {
      res.status(200).json({ found: true, product });
      return;
    }

    res.status(200).json({ found: false, code });
    return;
  }

  if (method === "POST") {
    const body = req.body || {};
    const action = body.action || "upload";
    const db = loadCommunityDb();

    if (action === "confirm") {
      const code = (body.code || "").toString().trim();
      if (!code) {
        res.status(400).json({ error: "Missing product code to confirm." });
        return;
      }

      if (db[code]) {
        db[code].confirmations = (db[code].confirmations || 0) + 1;
        db[code].updatedAt = new Date().toISOString();
        saveCommunityDb(db);
        res.status(200).json({ success: true, product: db[code] });
        return;
      }

      // If confirming an entry from OFF/USDA that wasn't in community DB yet
      if (body.product && body.product.name) {
        const p = body.product;
        const newEntry = {
          code,
          name: p.name.trim(),
          brand: (p.brand || "").trim(),
          per100g: {
            calories: Number(p.per100g?.calories) || 0,
            protein_g: Number(p.per100g?.protein_g) || 0,
            carbs_g: Number(p.per100g?.carbs_g) || 0,
            fat_g: Number(p.per100g?.fat_g) || 0,
          },
          serving_quantity: Number(p.serving_quantity) || 100,
          unit: p.unit || "g",
          confirmations: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db[code] = newEntry;
        saveCommunityDb(db);
        res.status(200).json({ success: true, product: newEntry });
        return;
      }

      res.status(404).json({ error: "Product not found to confirm." });
      return;
    }

    if (action === "upload") {
      const code = (body.code || "").toString().trim();
      const name = (body.name || "").toString().trim();

      if (!code || !name) {
        res.status(400).json({ error: "Missing required product 'code' or 'name'." });
        return;
      }

      const existingCount = db[code]?.confirmations || 0;
      const newEntry = {
        code,
        name,
        brand: (body.brand || "").toString().trim(),
        per100g: {
          calories: Math.max(0, Number(body.calories) || 0),
          protein_g: Math.max(0, Number(body.protein_g) || 0),
          carbs_g: Math.max(0, Number(body.carbs_g) || 0),
          fat_g: Math.max(0, Number(body.fat_g) || 0),
        },
        serving_quantity: Math.max(1, Number(body.serving_quantity) || 100),
        unit: body.unit === "ml" ? "ml" : "g",
        confirmations: existingCount + 1,
        createdAt: db[code]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db[code] = newEntry;
      saveCommunityDb(db);

      res.status(200).json({ success: true, product: newEntry });
      return;
    }

    res.status(400).json({ error: "Invalid action." });
    return;
  }

  res.status(405).json({ error: "Method not allowed." });
};
