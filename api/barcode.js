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

async function fetchUpcItemDb(code) {
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;

    const item = data.items[0];
    const name = item.title || item.model || `Product ${code}`;
    const brand = item.brand || "";

    return {
      code,
      name,
      brand,
      per100g: {
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
      },
      serving_quantity: 100,
      unit: "g",
      source: "UPC Item DB (Free)",
      confirmations: 0,
    };
  } catch (err) {
    console.warn("UPC Item DB lookup error:", err);
    return null;
  }
}

async function fetchWikidataGtin(code) {
  try {
    const sparql = `SELECT ?item ?itemLabel ?brandLabel WHERE {
      { ?item wdt:P2399 "${code}". } UNION { ?item wdt:P2398 "${code}". } UNION { ?item wdt:P4012 "${code}". }
      OPTIONAL { ?item wdt:P1716 ?brand. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 1`;

    const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`, {
      headers: { "User-Agent": "KcalTrackerPWA/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const binding = data?.results?.bindings?.[0];
    if (!binding || !binding.itemLabel) return null;

    return {
      code,
      name: binding.itemLabel.value,
      brand: binding.brandLabel?.value || "",
      per100g: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      serving_quantity: 100,
      unit: "g",
      source: "Wikidata Open DB",
      confirmations: 0,
    };
  } catch (err) {
    console.warn("Wikidata GTIN lookup error:", err);
    return null;
  }
}

async function fetchLlmBarcodeLookup(code) {
  const apiKey = process.env.LLM_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const baseUrl = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
    const endpoint = baseUrl.endsWith("/chat/completions") ? baseUrl : baseUrl.replace(/\/+$/, "") + "/chat/completions";
    const model = process.env.LLM_MODEL || process.env.GROQ_MODEL || "openai/gpt-oss-120b";

    const prompt = `Identify the exact food product for barcode / GTIN / UPC "${code}".
If you recognize this barcode, provide its product name, brand, serving size in grams, and per 100g calories, protein (g), carbs (g), and fat (g).
Respond ONLY with a JSON object in this exact shape:
{"found": true, "name": "...", "brand": "...", "serving_quantity": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}
If you do not recognize this barcode number, respond ONLY with:
{"found": false}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    if (!parsed.found || !parsed.name || !parsed.calories) return null;

    return {
      code,
      name: parsed.name,
      brand: parsed.brand || "",
      per100g: {
        calories: Number(parsed.calories) || 0,
        protein_g: Number(parsed.protein_g) || 0,
        carbs_g: Number(parsed.carbs_g) || 0,
        fat_g: Number(parsed.fat_g) || 0,
      },
      serving_quantity: Number(parsed.serving_quantity) || 100,
      unit: "g",
      source: "AI Barcode Database",
      confirmations: 1,
    };
  } catch (err) {
    console.warn("LLM Barcode lookup error:", err);
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

    if (query.list === "true" || query.list === "1" || query.search || query.filter) {
      const searchTerm = (query.search || "").trim().toLowerCase();
      const filter = (query.filter || "all").trim().toLowerCase();
      let list = Object.values(db);

      if (searchTerm) {
        list = list.filter(
          (item) =>
            item.code.includes(searchTerm) ||
            item.name.toLowerCase().includes(searchTerm) ||
            (item.brand && item.brand.toLowerCase().includes(searchTerm))
        );
      }

      if (filter === "verified") {
        list = list.filter((item) => (item.status || "verified") === "verified");
      } else if (filter === "pending") {
        list = list.filter((item) => item.status === "pending_review" || item.status === "flagged" || (item.suggestedEdits && item.suggestedEdits.length > 0));
      }

      list.sort((a, b) => (b.confirmations || 0) + (b.upvotes || 0) - ((a.confirmations || 0) + (a.upvotes || 0)));

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

    // 6. Fallback: UPC Item DB
    if (!product) {
      product = await fetchUpcItemDb(code);
    }

    // 7. Fallback: Wikidata SPARQL
    if (!product) {
      product = await fetchWikidataGtin(code);
    }

    // 8. Fallback: AI LLM Barcode Knowledge
    if (!product) {
      product = await fetchLlmBarcodeLookup(code);
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

    if (action === "vote") {
      const code = (body.code || "").toString().trim();
      const vote = body.vote; // "up" or "down"
      if (!code || !db[code]) {
        res.status(404).json({ error: "Product not found to vote on." });
        return;
      }

      const prod = db[code];
      if (vote === "up") {
        prod.upvotes = (prod.upvotes || 0) + 1;
        prod.confirmations = (prod.confirmations || 0) + 1;
        if (prod.upvotes >= 2 && prod.status !== "flagged") {
          prod.status = "verified";
        }
      } else if (vote === "down") {
        prod.downvotes = (prod.downvotes || 0) + 1;
        prod.status = "pending_review";

        if (body.suggestedEdit) {
          const edit = body.suggestedEdit;
          prod.suggestedEdits = prod.suggestedEdits || [];
          prod.suggestedEdits.push({
            id: "edit-" + Date.now(),
            name: (edit.name || "").trim(),
            brand: (edit.brand || "").trim(),
            calories: Math.max(0, Number(edit.calories) || 0),
            protein_g: Math.max(0, Number(edit.protein_g) || 0),
            carbs_g: Math.max(0, Number(edit.carbs_g) || 0),
            fat_g: Math.max(0, Number(edit.fat_g) || 0),
            timestamp: new Date().toISOString(),
          });
        }
      }

      prod.updatedAt = new Date().toISOString();
      saveCommunityDb(db);
      res.status(200).json({ success: true, product: prod });
      return;
    }

    if (action === "moderate") {
      const code = (body.code || "").toString().trim();
      const subAction = body.subAction; // "approve", "reject", "apply_edit"
      if (!code || !db[code]) {
        res.status(404).json({ error: "Product not found for moderation." });
        return;
      }

      const prod = db[code];
      if (subAction === "approve") {
        prod.status = "verified";
        prod.suggestedEdits = [];
      } else if (subAction === "reject") {
        prod.status = "flagged";
      } else if (subAction === "apply_edit") {
        const editId = body.editId;
        const targetEdit = (prod.suggestedEdits || []).find((e) => e.id === editId) || body.edit;
        if (targetEdit) {
          if (targetEdit.name) prod.name = targetEdit.name;
          if (targetEdit.brand !== undefined) prod.brand = targetEdit.brand;
          prod.per100g = {
            calories: Number(targetEdit.calories) || prod.per100g.calories,
            protein_g: Number(targetEdit.protein_g) || prod.per100g.protein_g,
            carbs_g: Number(targetEdit.carbs_g) || prod.per100g.carbs_g,
            fat_g: Number(targetEdit.fat_g) || prod.per100g.fat_g,
          };
          prod.status = "verified";
          prod.suggestedEdits = [];
        }
      }

      prod.updatedAt = new Date().toISOString();
      saveCommunityDb(db);
      res.status(200).json({ success: true, product: prod });
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
        upvotes: (db[code]?.upvotes || 0) + 1,
        downvotes: db[code]?.downvotes || 0,
        status: "verified",
        suggestedEdits: [],
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
