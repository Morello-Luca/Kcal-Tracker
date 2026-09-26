/* Body Profile, BMR, and TDEE Calculator Module */
import {
  loadGoal,
  saveGoal,
  loadWeightForDate,
  saveWeightForDate,
  getAllWeightLogs,
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

export function initBodyProfile(renderGoal, renderAppCallback) {
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

  function renderWeightChartAndTracker() {
    if (!weightHistoryPills) return;
    weightHistoryPills.innerHTML = "";

    const today = new Date();
    const todayWeight = loadWeightForDate(today);
    if (todayWeight !== null && quickWeightInput) {
      quickWeightInput.value = todayWeight;
    } else if (quickWeightInput && !quickWeightInput.value) {
      quickWeightInput.value = "70.0";
    }

    const adaptiveRes = calculateAdaptiveTDEE();
    if (weightTrendBadge) {
      if (adaptiveRes.emaWeight) {
        weightTrendBadge.textContent = `Trend: ${adaptiveRes.emaWeight} kg`;
      } else {
        weightTrendBadge.textContent = "Trend: -- kg";
      }
    }

    // Render past 7 days in a static mini grid (No horizontal scrollbar)
    const daysArr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      daysArr.push({ date: d, weight: loadWeightForDate(d), isToday: i === 0 });
    }

    daysArr.forEach((item) => {
      const mini = document.createElement("div");
      mini.className = `weight-mini-item ${item.weight !== null ? "has-val" : ""}`;

      const daySpan = document.createElement("span");
      daySpan.className = "weight-mini-day";
      daySpan.textContent = item.isToday ? "Today" : item.date.toLocaleDateString(undefined, { weekday: "narrow" });

      const valSpan = document.createElement("span");
      valSpan.className = "weight-mini-val";
      valSpan.textContent = item.weight !== null ? item.weight : "--";

      mini.appendChild(daySpan);
      mini.appendChild(valSpan);
      weightHistoryPills.appendChild(mini);
    });

    // Render Happy Scale Style Smooth Moving Average SVG Chart
    renderWeightSVGChart();
  }

  function renderWeightSVGChart() {
    const svgWrapper = document.getElementById("weight-svg-wrapper");
    if (!svgWrapper) return;
    svgWrapper.innerHTML = "";

    const weights = getAllWeightLogs();
    if (weights.length < 2) {
      svgWrapper.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:var(--text-dim); font-size:0.78rem;">Log at least 2 weight entries to view trend line</div>`;
      return;
    }

    // Get past 30 days or all weight points
    const recentWeights = weights.slice(-30);

    // Calculate EMA smoothed curve for all points
    let currentEma = recentWeights[0].weight;
    const alpha = 0.15; // Smooth moving average alpha
    const trendPoints = [];

    recentWeights.forEach((pt) => {
      currentEma = pt.weight * alpha + currentEma * (1 - alpha);
      trendPoints.push({
        date: pt.date,
        rawWeight: pt.weight,
        smoothWeight: Math.round(currentEma * 10) / 10,
      });
    });

    // Determine min/max Y scale with margin
    const allVals = trendPoints.flatMap((p) => [p.rawWeight, p.smoothWeight]);
    let minW = Math.min(...allVals) - 0.5;
    let maxW = Math.max(...allVals) + 0.5;
    if (minW === maxW) {
      minW -= 1;
      maxW += 1;
    }

    const width = 320;
    const height = 80;
    const paddingX = 10;
    const paddingY = 10;

    const getX = (i) => paddingX + (i / Math.max(1, trendPoints.length - 1)) * (width - 2 * paddingX);
    const getY = (w) => height - paddingY - ((w - minW) / (maxW - minW)) * (height - 2 * paddingY);

    // Build raw point markers & smooth curve path
    let smoothD = "";
    const rawCircleElements = [];

    trendPoints.forEach((pt, i) => {
      const x = getX(i);
      const yRaw = getY(pt.rawWeight);
      const ySmooth = getY(pt.smoothWeight);

      if (i === 0) {
        smoothD += `M ${x.toFixed(1)} ${ySmooth.toFixed(1)}`;
      } else {
        const prevX = getX(i - 1);
        const prevYSmooth = getY(trendPoints[i - 1].smoothWeight);
        const cpX1 = prevX + (x - prevX) / 2;
        const cpX2 = prevX + (x - prevX) / 2;
        smoothD += ` C ${cpX1.toFixed(1)} ${prevYSmooth.toFixed(1)}, ${cpX2.toFixed(1)} ${ySmooth.toFixed(1)}, ${x.toFixed(1)} ${ySmooth.toFixed(1)}`;
      }

      rawCircleElements.push(`<circle cx="${x.toFixed(1)}" cy="${yRaw.toFixed(1)}" r="2.5" fill="var(--text-muted, #9ca3af)" opacity="0.6"/>`);
    });

    const svgHTML = `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <path d="${smoothD}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        ${rawCircleElements.join("")}
      </svg>
    `;

    svgWrapper.innerHTML = svgHTML;
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
    if (typeof renderAppCallback === "function") {
      renderAppCallback();
    } else if (typeof renderGoal === "function") {
      renderGoal();
    }
  }

  if (tdeeModeToggle) {
    tdeeModeToggle.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      localStorage.setItem("kcal-tdee-mode", isChecked ? "adaptive" : "standard");
      if (tdeeModeText) {
        tdeeModeText.textContent = isChecked ? "Adaptive TDEE" : "Standard TDEE";
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

      renderWeightChartAndTracker();
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
        if (tdeeModeText) tdeeModeText.textContent = "Standard TDEE";
      } else {
        tdeeModeToggle.disabled = false;
        const isAdaptive = localStorage.getItem("kcal-tdee-mode") === "adaptive";
        tdeeModeToggle.checked = isAdaptive;
        if (tdeeModeText) tdeeModeText.textContent = isAdaptive ? "Adaptive TDEE" : "Standard TDEE";
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

  const applyTdeeBtn = document.getElementById("apply-tdee-btn");
  if (applyTdeeBtn) {
    applyTdeeBtn.addEventListener("click", () => {
      const prof = loadBodyProfile();
      if (!prof) return;
      const { tdee } = calculateBMRandTDEE(prof);
      const currentGoal = loadGoal();
      saveGoal({ ...currentGoal, calories: tdee });
      if (typeof renderAppCallback === "function") {
        renderAppCallback();
      } else if (typeof renderGoal === "function") {
        renderGoal();
      }
      alert(`Daily Calorie Goal set to ${tdee} kcal based on Formula TDEE!`);
    });
  }


  renderWeightChartAndTracker();
  renderBodyProfile();
}
