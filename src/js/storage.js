/* LocalStorage & Data Management Module */

export const LOG_KEY_PREFIX = "kcal-log-";
export const BURNED_KEY_PREFIX = "kcal-burned-";
export const WATER_KEY_PREFIX = "kcal-water-";
export const WEIGHT_KEY_PREFIX = "kcal-weight-";
export const GOAL_KEY = "kcal-goal";
export const BODY_PROFILE_KEY = "kcal-body-profile";
export const FAVORITES_KEY = "kcal-favorites";
export const SETTINGS_KEY = "kcal-settings";

export const DEFAULT_WATER_GOAL = 8;

export function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return { weekStartDay: 1, adaptiveTDEEEnabled: true }; // 1 = Monday, 0 = Sunday
  try {
    const parsed = JSON.parse(raw);
    return {
      weekStartDay: typeof parsed.weekStartDay === "number" ? parsed.weekStartDay : 1,
      adaptiveTDEEEnabled: parsed.adaptiveTDEEEnabled !== false,
    };
  } catch {
    return { weekStartDay: 1, adaptiveTDEEEnabled: true };
  }
}

export function saveSettings(settings) {
  const current = loadSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}

export function weightKeyFor(date) {
  return `${WEIGHT_KEY_PREFIX}${dateSuffix(date)}`;
}

export function loadWeightForDate(date) {
  const value = Number(localStorage.getItem(weightKeyFor(date)));
  return value > 0 ? value : null;
}

export function saveWeightForDate(date, weight) {
  if (weight > 0) {
    localStorage.setItem(weightKeyFor(date), String(weight));
  } else {
    localStorage.removeItem(weightKeyFor(date));
  }
}

export function dateSuffix(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dateKey(date) {
  return `${LOG_KEY_PREFIX}${dateSuffix(date)}`;
}

export function todayKey() {
  return dateKey(new Date());
}

export function burnedKeyFor(date) {
  return `${BURNED_KEY_PREFIX}${dateSuffix(date)}`;
}

export function todayBurnedKey() {
  return burnedKeyFor(new Date());
}

export function waterKeyFor(date) {
  return `${WATER_KEY_PREFIX}${dateSuffix(date)}`;
}

export function todayWaterKey() {
  return waterKeyFor(new Date());
}

export function loadWater() {
  const value = Number(localStorage.getItem(todayWaterKey()));
  return value > 0 ? value : 0;
}

export function saveWater(glasses) {
  if (glasses > 0) {
    localStorage.setItem(todayWaterKey(), String(glasses));
  } else {
    localStorage.removeItem(todayWaterKey());
  }
}

export function loadBurned() {
  const value = Number(localStorage.getItem(todayBurnedKey()));
  return value > 0 ? value : 0;
}

export function saveBurned(value) {
  if (value > 0) {
    localStorage.setItem(todayBurnedKey(), String(value));
  } else {
    localStorage.removeItem(todayBurnedKey());
  }
}

export function loadEntriesForKey(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function loadEntries() {
  return loadEntriesForKey(todayKey());
}

export function saveEntries(entries) {
  localStorage.setItem(todayKey(), JSON.stringify(entries));
}

export function computeTotals(list) {
  return list.reduce(
    (acc, e) => {
      acc.calories += e.calories;
      acc.protein += e.protein_g;
      acc.carbs += e.carbs_g;
      acc.fat += e.fat_g;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function normalizeGoalValue(value) {
  return value > 0 ? value : null;
}

export function loadGoal() {
  const raw = localStorage.getItem(GOAL_KEY);
  if (!raw) return { calories: null, protein: null, carbs: null, fat: null };

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        calories: normalizeGoalValue(parsed.calories),
        protein: normalizeGoalValue(parsed.protein),
        carbs: normalizeGoalValue(parsed.carbs),
        fat: normalizeGoalValue(parsed.fat),
      };
    }
  } catch {
    // legacy format
  }

  return {
    calories: normalizeGoalValue(Number(raw)),
    protein: null,
    carbs: null,
    fat: null,
  };
}

export function saveGoal(goal) {
  localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
}

export function loadFavorites() {
  const raw = localStorage.getItem(FAVORITES_KEY);
  if (!raw) {
    return [
      { description: "2 Eggs & Toast", calories: 280, protein_g: 14, carbs_g: 22, fat_g: 12 },
      { description: "Protein Shake (30g)", calories: 160, protein_g: 30, carbs_g: 3, fat_g: 2 },
      { description: "Medium Banana", calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.3 },
    ];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveFavorites(favs) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

export function round(n) {
  return Math.round(n * 10) / 10;
}
