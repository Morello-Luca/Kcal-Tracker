/* Body Profile, BMR, and TDEE Calculator Module */
import {
  loadGoal,
  saveGoal,
  loadWeightForDate,
  saveWeightForDate,
  dateSuffix,
  loadEntriesForKey,
  dateKey,
  computeTotals,
} from "./storage.js";

const BODY_PROFILE_KEY = "kcal-body-profile";

/**
 * Calculates a 14-day adherence-neutral Adaptive TDEE based on
 * scale weight trend and actual logged calories over time.
 * Energy expenditure = Average Daily Intake - (Weight Change in kg * 7700 kcal / Days)
 */
export function calculateAdaptiveTDEE() {
  const prof = loadBodyProfile();
  const fallback = prof ? calculateBMRandTDEE(prof).tdee : 2000;

  const today = new Date();
  const daysWindow = 14;
  let totalCalories = 0;
  let loggedCalorieDays = 0;
  const weights = [];

  for (let i = daysWindow - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = dateKey(d);
    const entries = loadEntriesForKey(k);
    if (entries.length > 0) {
      const dayTotals = computeTotals(entries);
      totalCalories += dayTotals.calories;
      loggedCalorieDays++;
    }

    const w = loadWeightForDate(d);
    if (w !== null) {
      weights.push({ date: d, weight: w, dayIndex: daysWindow - 1 - i });
    }
  }

  if (loggedCalorieDays < 3 || weights.length < 2) {
    return { adaptiveTDEE: fallback, isEstimate: true, loggedDays: loggedCalorieDays, weightPoints: weights.length };
  }

  const avgDailyIntake = totalCalories / loggedCalorieDays;
  const firstW = weights[0];
  const lastW = weights[weights.length - 1];
  const daysDiff = Math.max(1, (lastW.date.getTime() - firstW.date.getTime()) / (1000 * 3600 * 24));
  const weightChangeKg = lastW.weight - firstW.weight;

  // 1 kg of body mass ~ 7700 kcal surplus/deficit
  const dailySurplusDeficit = (weightChangeKg * 7700) / daysDiff;
  const calculatedTDEE = Math.round(avgDailyIntake - dailySurplusDeficit);

  // Clamp within realistic bounds relative to formula TDEE (e.g. 1000 - 5000 kcal)
  const adaptiveTDEE = Math.max(1000, Math.min(5000, calculatedTDEE));

  return {
    adaptiveTDEE,
    isEstimate: false,
    avgDailyIntake: Math.round(avgDailyIntake),
    weightChangeKg: Math.round(weightChangeKg * 10) / 10,
    loggedDays: loggedCalorieDays,
    weightPoints: weights.length,
  };
}

export function loadBodyProfile() {
  const raw = localStorage.getItem(BODY_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveBodyProfile(prof) {
  localStorage.setItem(BODY_PROFILE_KEY, JSON.stringify(prof));
}

export function calculateBMRandTDEE(profile) {
  const { age, gender, weight, height, activity, bodyFat } = profile;
  let bmr = 0;

  if (bodyFat && bodyFat > 0 && bodyFat < 60) {
    const lbm = weight * (1 - bodyFat / 100);
    bmr = 370 + 21.6 * lbm;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age;
    bmr += gender === "female" ? -161 : 5;
  }

  const tdee = bmr * (activity || 1.2);
  return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

export function initBodyProfile(renderGoal) {
  const bodyProfileForm = document.getElementById("body-profile-form");
  const bodyAgeInput = document.getElementById("body-age");
  const bodyGenderSelect = document.getElementById("body-gender");
  const bodyWeightInput = document.getElementById("body-weight");
  const bodyHeightInput = document.getElementById("body-height");
  const bodyActivitySelect = document.getElementById("body-activity");
  const bodyFatInput = document.getElementById("body-fat");
  const bmrResultBox = document.getElementById("bmr-result-box");
  const bmrValEl = document.getElementById("bmr-val");
  const tdeeValEl = document.getElementById("tdee-val");
  const applyTdeeBtn = document.getElementById("apply-tdee-btn");

  function renderBodyProfile() {
    const prof = loadBodyProfile();
    if (!prof) return;

    if (bodyAgeInput) bodyAgeInput.value = prof.age || "";
    if (bodyGenderSelect) bodyGenderSelect.value = prof.gender || "male";
    if (bodyWeightInput) bodyWeightInput.value = prof.weight || "";
    if (bodyHeightInput) bodyHeightInput.value = prof.height || "";
    if (bodyActivitySelect) bodyActivitySelect.value = prof.activity || "1.2";
    if (bodyFatInput) bodyFatInput.value = prof.bodyFat || "";

    const { bmr, tdee } = calculateBMRandTDEE(prof);
    if (bmrValEl) bmrValEl.textContent = `${bmr} kcal`;
    if (tdeeValEl) tdeeValEl.textContent = `${tdee} kcal`;

    const adaptiveRes = calculateAdaptiveTDEE();
    const settingsAdaptiveValEl = document.getElementById("settings-adaptive-tdee-val");
    const settingsAdaptiveSubtitleEl = document.getElementById("settings-adaptive-tdee-subtitle");

    if (settingsAdaptiveValEl) settingsAdaptiveValEl.textContent = `${adaptiveRes.adaptiveTDEE} kcal`;
    if (settingsAdaptiveSubtitleEl) {
      if (adaptiveRes.isEstimate) {
        settingsAdaptiveSubtitleEl.textContent = `Formula baseline (Log ${3 - adaptiveRes.loggedDays} more days and 2 weight entries for dynamic TDEE)`;
      } else {
        settingsAdaptiveSubtitleEl.textContent = `Based on ${adaptiveRes.loggedDays} log days & ${adaptiveRes.weightChangeKg >= 0 ? "+" : ""}${adaptiveRes.weightChangeKg} kg weight trend`;
      }
    }

    if (bmrResultBox) bmrResultBox.hidden = false;
  }

  if (bodyProfileForm) {
    bodyProfileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const weightVal = Number(bodyWeightInput.value) || 70;
      const prof = {
        age: Number(bodyAgeInput.value) || 28,
        gender: bodyGenderSelect.value,
        weight: weightVal,
        height: Number(bodyHeightInput.value) || 170,
        activity: Number(bodyActivitySelect.value) || 1.2,
        bodyFat: Number(bodyFatInput.value) || null,
      };
      saveBodyProfile(prof);
      saveWeightForDate(new Date(), weightVal);
      renderBodyProfile();
    });
  }

  if (applyTdeeBtn) {
    applyTdeeBtn.addEventListener("click", () => {
      const prof = loadBodyProfile();
      if (!prof) return;
      const { tdee } = calculateBMRandTDEE(prof);
      const currentGoal = loadGoal();
      saveGoal({ ...currentGoal, calories: tdee });
      if (typeof renderGoal === "function") renderGoal();
      alert(`Daily Calorie Goal set to ${tdee} kcal based on Formula TDEE!`);
    });
  }

  const applyAdaptiveTdeeBtn = document.getElementById("apply-adaptive-tdee-btn");
  if (applyAdaptiveTdeeBtn) {
    applyAdaptiveTdeeBtn.addEventListener("click", () => {
      const adaptiveRes = calculateAdaptiveTDEE();
      const currentGoal = loadGoal();
      saveGoal({ ...currentGoal, calories: adaptiveRes.adaptiveTDEE });
      if (typeof renderGoal === "function") renderGoal();
      alert(`Daily Calorie Goal synced to Adaptive TDEE: ${adaptiveRes.adaptiveTDEE} kcal!`);
    });
  }

  renderBodyProfile();
}
