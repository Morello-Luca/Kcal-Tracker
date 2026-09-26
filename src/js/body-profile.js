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

  const daysNeeded = Math.max(0, 14 - weights.length);

  if (loggedCalorieDays < 14 || weights.length < 14) {
    return {
      adaptiveTDEE: fallback,
      isEstimate: true,
      loggedDays: loggedCalorieDays,
      weightPoints: weights.length,
      daysRemaining: daysNeeded > 0 ? daysNeeded : (14 - loggedCalorieDays),
    };
  }

  // Calculate Exponential Moving Average (EMA) weight trend (\alpha = 0.1)
  let emaWeight = weights[0].weight;
  const alpha = 0.1;
  for (let i = 1; i < weights.length; i++) {
    emaWeight = weights[i].weight * alpha + emaWeight * (1 - alpha);
  }

  const avgDailyIntake = totalCalories / loggedCalorieDays;
  const firstW = weights[0];
  const lastW = weights[weights.length - 1];
  const daysDiff = Math.max(1, (lastW.date.getTime() - firstW.date.getTime()) / (1000 * 3600 * 24));
  const weightChangeKg = lastW.weight - firstW.weight;

  // 1 kg of body mass ~ 7700 kcal surplus/deficit
  const dailySurplusDeficit = (weightChangeKg * 7700) / daysDiff;
  const calculatedTDEE = Math.round(avgDailyIntake - dailySurplusDeficit);

  // Clamp within realistic bounds (1000 - 5000 kcal)
  const adaptiveTDEE = Math.max(1000, Math.min(5000, calculatedTDEE));

  return {
    adaptiveTDEE,
    isEstimate: false,
    avgDailyIntake: Math.round(avgDailyIntake),
    weightChangeKg: Math.round(weightChangeKg * 10) / 10,
    loggedDays: loggedCalorieDays,
    weightPoints: weights.length,
    emaWeight: Math.round(emaWeight * 10) / 10,
    daysRemaining: daysNeeded,
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

  const quickWeightForm = document.getElementById("quick-weight-form");
  const quickWeightInput = document.getElementById("quick-weight-input");
  const weightTrendBadge = document.getElementById("body-weight-trend-badge");
  const weightHistoryPills = document.getElementById("weight-history-pills");

  const tdeeModeToggle = document.getElementById("tdee-mode-toggle");
  const tdeeModeText = document.getElementById("tdee-mode-text");

  // Load active TDEE mode preference ("standard" or "adaptive")
  const simulateWeightBtn = document.getElementById("simulate-weight-btn");

  function renderWeightTracker() {
    if (!weightHistoryPills) return;
    weightHistoryPills.innerHTML = "";

    const today = new Date();
    const todayWeight = loadWeightForDate(today);
    if (todayWeight !== null && quickWeightInput) {
      quickWeightInput.value = todayWeight;
    }

    const adaptiveRes = calculateAdaptiveTDEE();
    if (weightTrendBadge) {
      if (adaptiveRes.emaWeight) {
        weightTrendBadge.textContent = `Trend: ${adaptiveRes.emaWeight} kg`;
      } else {
        weightTrendBadge.textContent = "Trend: -- kg";
      }
    }

    // Render past 7 days weight pills
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const w = loadWeightForDate(d);

      const pill = document.createElement("span");
      pill.className = `weight-pill ${w !== null ? "has-val" : ""}`;
      const dayLabel = i === 0 ? "Today" : d.toLocaleDateString(undefined, { weekday: "short" });
      pill.textContent = `${dayLabel}: ${w !== null ? w + "kg" : "--"}`;
      weightHistoryPills.appendChild(pill);
    }
  }

  function syncCalorieGoal() {
    const isAdaptiveMode = tdeeModeToggle ? tdeeModeToggle.checked : false;
    const prof = loadBodyProfile();
    if (!prof) return;

    let targetCalories = 2000;
    if (isAdaptiveMode) {
      const adaptiveRes = calculateAdaptiveTDEE();
      targetCalories = adaptiveRes.adaptiveTDEE;
    } else {
      const { tdee } = calculateBMRandTDEE(prof);
      targetCalories = tdee;
    }

    const currentGoal = loadGoal();
    saveGoal({ ...currentGoal, calories: targetCalories });
    if (typeof renderGoal === "function") renderGoal();
  }

  if (tdeeModeToggle) {
    tdeeModeToggle.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      localStorage.setItem("kcal-tdee-mode", isChecked ? "adaptive" : "standard");
      if (tdeeModeText) {
        tdeeModeText.textContent = isChecked ? "Adaptive" : "Standard";
      }
      syncCalorieGoal();
    });
  }

  if (quickWeightForm) {
    quickWeightForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = Number(quickWeightInput.value);
      if (!val || val < 20 || val > 300) return;

      saveWeightForDate(new Date(), val);

      // Update weight in body profile if available
      const prof = loadBodyProfile() || {};
      prof.weight = val;
      saveBodyProfile(prof);

      renderWeightTracker();
      renderBodyProfile();
      syncCalorieGoal();
    });
  }

  function renderBodyProfile() {
    const prof = loadBodyProfile() || { age: 28, gender: "male", weight: 70, height: 170, activity: 1.2 };

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
        settingsAdaptiveSubtitleEl.textContent = `Standard formula active (${adaptiveRes.daysRemaining} days remaining until Adaptive TDEE unlocks)`;
      } else {
        settingsAdaptiveSubtitleEl.textContent = `Based on ${adaptiveRes.loggedDays} log days & ${adaptiveRes.weightChangeKg >= 0 ? "+" : ""}${adaptiveRes.weightChangeKg} kg weight trend`;
      }
    }

    // Lock toggle switch if Adaptive TDEE is not unlocked yet
    if (tdeeModeToggle) {
      const isUnlocked = !adaptiveRes.isEstimate;
      if (!isUnlocked) {
        tdeeModeToggle.checked = false;
        tdeeModeToggle.disabled = true;
        localStorage.setItem("kcal-tdee-mode", "standard");
        if (tdeeModeText) tdeeModeText.textContent = `Standard (${adaptiveRes.daysRemaining}d to Adaptive)`;
      } else {
        tdeeModeToggle.disabled = false;
        const isAdaptive = localStorage.getItem("kcal-tdee-mode") === "adaptive";
        tdeeModeToggle.checked = isAdaptive;
        if (tdeeModeText) tdeeModeText.textContent = isAdaptive ? "Adaptive" : "Standard";
      }
    }

    if (bmrResultBox) bmrResultBox.hidden = false;
  }

  if (simulateWeightBtn) {
    simulateWeightBtn.addEventListener("click", () => {
      const today = new Date();
      let baseWeight = 75.0;
      for (let i = 14; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        // Add small smooth fluctuations
        const w = Math.round((baseWeight - i * 0.1 + (i % 2 === 0 ? 0.2 : -0.1)) * 10) / 10;
        saveWeightForDate(d, w);

        // Also seed dummy food entries so calories are logged for those 14 days
        const k = dateKey(d);
        const currentLog = loadEntriesForKey(k);
        if (currentLog.length === 0) {
          const dummyEntries = [
            { id: `sim-${i}-1`, description: "Simulated Balanced Meal", calories: 2100, protein_g: 140, carbs_g: 220, fat_g: 65 }
          ];
          localStorage.setItem(k, JSON.stringify(dummyEntries));
        }
      }

      // Automatically unlock and switch to Adaptive
      localStorage.setItem("kcal-tdee-mode", "adaptive");
      renderWeightTracker();
      renderBodyProfile();
      syncCalorieGoal();
      alert("Simulated 14 days of weight & calorie logs! Adaptive TDEE is now unlocked.");
    });
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

  const applyTdeeBtn = document.getElementById("apply-tdee-btn");
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

  renderWeightTracker();
  renderBodyProfile();
}
