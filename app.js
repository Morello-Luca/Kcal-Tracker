const form = document.getElementById("entry-form");
const input = document.getElementById("food-input");
const addButton = document.getElementById("add-button");
const statusEl = document.getElementById("status");
const logList = document.getElementById("log-list");
const dateEl = document.getElementById("today-date");

const totalCaloriesEl = document.getElementById("total-calories");
const totalProteinEl = document.getElementById("total-protein");
const totalCarbsEl = document.getElementById("total-carbs");
const totalFatEl = document.getElementById("total-fat");

// Navigation elements
const navTodayBtn = document.getElementById("nav-today");
const navLogBtn = document.getElementById("nav-log");
const navAnalyticsBtn = document.getElementById("nav-analytics");
const navSwapBtn = document.getElementById("nav-swap");
const navSettingsBtn = document.getElementById("nav-settings");

const viewToday = document.getElementById("view-today");
const viewLog = document.getElementById("view-log");
const viewAnalytics = document.getElementById("view-analytics");
const viewSwap = document.getElementById("view-swap");
const viewSettings = document.getElementById("view-settings");

const quickLogNavBtn = document.getElementById("quick-log-nav-btn");
const historyList = document.getElementById("history-list");
const exportDataBtn = document.getElementById("export-data-btn");

// Water Tracker Elements
const waterStatusEl = document.getElementById("water-status");
const waterGlassesRow = document.getElementById("water-glasses-row");
const waterMinusBtn = document.getElementById("water-minus-btn");
const waterPlusBtn = document.getElementById("water-plus-btn");

// Manual Quick Add Modal
const manualAddBtn = document.getElementById("manual-add-btn");
const manualAddModal = document.getElementById("manual-add-modal");
const manualAddClose = document.getElementById("manual-add-close");
const manualAddForm = document.getElementById("manual-add-form");
const manualDescInput = document.getElementById("manual-desc");
const manualCaloriesInput = document.getElementById("manual-calories");
const manualProteinInput = document.getElementById("manual-protein");
const manualCarbsInput = document.getElementById("manual-carbs");
const manualFatInput = document.getElementById("manual-fat");
const manualCancelBtn = document.getElementById("manual-cancel-btn");

// Edit Log Entry Modal
const editEntryModal = document.getElementById("edit-entry-modal");
const editEntryClose = document.getElementById("edit-entry-close");
const editEntryForm = document.getElementById("edit-entry-form");
const editDescInput = document.getElementById("edit-desc");
const editCaloriesInput = document.getElementById("edit-calories");
const editProteinInput = document.getElementById("edit-protein");
const editCarbsInput = document.getElementById("edit-carbs");
const editFatInput = document.getElementById("edit-fat");
const editCancelBtn = document.getElementById("edit-cancel-btn");
let currentEditingEntryId = null;

// Favorites / Frequent
const favoritesList = document.getElementById("favorites-list");

// Analytics
const macroPartP = document.getElementById("macro-part-p");
const macroPartC = document.getElementById("macro-part-c");
const macroPartF = document.getElementById("macro-part-f");
const legendPText = document.getElementById("legend-p-text");
const legendCText = document.getElementById("legend-c-text");
const legendFText = document.getElementById("legend-f-text");
const weeklyChart = document.getElementById("weekly-chart");

// Body Profile & BMR
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

// PWA Banner
const installBanner = document.getElementById("install-banner");
const installPwaBtn = document.getElementById("install-pwa-btn");
const dismissInstallBtn = document.getElementById("dismiss-install-btn");
let deferredPrompt = null;

const swapForm = document.getElementById("swap-form");
const swapInput = document.getElementById("swap-input");
const swapButton = document.getElementById("swap-button");
const swapStatusEl = document.getElementById("swap-status");
const swapResultEl = document.getElementById("swap-result");

const goalDisplay = document.getElementById("goal-display");
const goalBarFill = document.getElementById("goal-bar-fill");
const goalStatusEl = document.getElementById("goal-status");
const goalEditBtn = document.getElementById("goal-edit-btn");
const goalForm = document.getElementById("goal-form");
const goalCancelBtn = document.getElementById("goal-cancel-btn");

const goalCaloriesInput = document.getElementById("goal-input-calories");
const goalProteinInput = document.getElementById("goal-input-protein");
const goalCarbsInput = document.getElementById("goal-input-carbs");
const goalFatInput = document.getElementById("goal-input-fat");

const macroBarTracks = {
  protein: document.getElementById("protein-bar-track"),
  carbs: document.getElementById("carbs-bar-track"),
  fat: document.getElementById("fat-bar-track"),
};
const macroBarFills = {
  protein: document.getElementById("protein-bar-fill"),
  carbs: document.getElementById("carbs-bar-fill"),
  fat: document.getElementById("fat-bar-fill"),
};
const macroGoalLabels = {
  protein: document.getElementById("protein-goal-label"),
  carbs: document.getElementById("carbs-goal-label"),
  fat: document.getElementById("fat-goal-label"),
};

const burnedDisplay = document.getElementById("burned-display");
const burnedStatusEl = document.getElementById("burned-status");
const burnedEditBtn = document.getElementById("burned-edit-btn");
const burnedForm = document.getElementById("burned-form");
const burnedInput = document.getElementById("burned-input");
const burnedCancelBtn = document.getElementById("burned-cancel-btn");

const LOG_KEY_PREFIX = "kcal-log-";
const BURNED_KEY_PREFIX = "kcal-burned-";
const WATER_KEY_PREFIX = "kcal-water-";
const GOAL_KEY = "kcal-goal";
const BODY_PROFILE_KEY = "kcal-body-profile";
const FAVORITES_KEY = "kcal-favorites";

const DEFAULT_WATER_GOAL = 8;

function dateSuffix(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateKey(date) {
  return `${LOG_KEY_PREFIX}${dateSuffix(date)}`;
}

function todayKey() {
  return dateKey(new Date());
}

function burnedKeyFor(date) {
  return `${BURNED_KEY_PREFIX}${dateSuffix(date)}`;
}

function todayBurnedKey() {
  return burnedKeyFor(new Date());
}

function waterKeyFor(date) {
  return `${WATER_KEY_PREFIX}${dateSuffix(date)}`;
}

function todayWaterKey() {
  return waterKeyFor(new Date());
}

function loadWater() {
  const value = Number(localStorage.getItem(todayWaterKey()));
  return value > 0 ? value : 0;
}

function saveWater(glasses) {
  if (glasses > 0) {
    localStorage.setItem(todayWaterKey(), String(glasses));
  } else {
    localStorage.removeItem(todayWaterKey());
  }
}

function loadBurned() {
  const value = Number(localStorage.getItem(todayBurnedKey()));
  return value > 0 ? value : 0;
}

function saveBurned(value) {
  if (value > 0) {
    localStorage.setItem(todayBurnedKey(), String(value));
  } else {
    localStorage.removeItem(todayBurnedKey());
  }
}

function loadEntriesForKey(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function loadEntries() {
  return loadEntriesForKey(todayKey());
}

function saveEntries(entries) {
  localStorage.setItem(todayKey(), JSON.stringify(entries));
}

let entries = loadEntries();

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function round(n) {
  return Math.round(n * 10) / 10;
}

function renderDate() {
  dateEl.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function computeTotals(list) {
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

function renderTotals() {
  const totals = computeTotals(entries);

  totalCaloriesEl.textContent = Math.round(totals.calories);
  totalProteinEl.textContent = `${round(totals.protein)}g`;
  totalCarbsEl.textContent = `${round(totals.carbs)}g`;
  totalFatEl.textContent = `${round(totals.fat)}g`;
}

function normalizeGoalValue(value) {
  return value > 0 ? value : null;
}

function loadGoal() {
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
    // fall through to legacy plain-number format below
  }

  // legacy format: a bare calorie number stored before macro goals existed
  return {
    calories: normalizeGoalValue(Number(raw)),
    protein: null,
    carbs: null,
    fat: null,
  };
}

function saveGoal(goal) {
  localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
}

function renderCalorieGoal(goalCalories, calories, burned) {
  if (!goalCalories) {
    goalBarFill.style.width = "0%";
    goalBarFill.classList.remove("over");
    goalStatusEl.textContent = "No daily goal set";
    return;
  }

  const effectiveGoal = goalCalories + burned;
  const pct = Math.min(100, (calories / effectiveGoal) * 100);
  goalBarFill.style.width = `${pct}%`;
  goalBarFill.classList.toggle("over", calories > effectiveGoal);

  const burnedNote = burned > 0 ? ` (${goalCalories} + ${burned} burned)` : "";

  if (calories > effectiveGoal) {
    goalStatusEl.textContent = `${calories} / ${effectiveGoal} kcal${burnedNote} · ${calories - effectiveGoal} over`;
  } else {
    goalStatusEl.textContent = `${calories} / ${effectiveGoal} kcal${burnedNote} · ${effectiveGoal - calories} left`;
  }
}

function renderBurned(burned) {
  if (burned > 0) {
    burnedStatusEl.textContent = `${burned} kcal burned today`;
    burnedEditBtn.textContent = "Edit burned";
  } else {
    burnedStatusEl.textContent = "No calories burned logged";
    burnedEditBtn.textContent = "Log burned";
  }
}

function renderMacroGoal(goalValue, actualValue, trackEl, fillEl, labelEl) {
  if (!goalValue) {
    trackEl.hidden = true;
    labelEl.hidden = true;
    return;
  }

  trackEl.hidden = false;
  const pct = Math.min(100, (actualValue / goalValue) * 100);
  fillEl.style.width = `${pct}%`;
  fillEl.classList.toggle("over", actualValue > goalValue);

  labelEl.hidden = false;
  labelEl.textContent = `of ${goalValue}g`;
}

function renderGoal() {
  const goal = loadGoal();
  const totals = computeTotals(entries);
  const burned = loadBurned();

  renderCalorieGoal(goal.calories, Math.round(totals.calories), burned);
  renderMacroGoal(goal.protein, totals.protein, macroBarTracks.protein, macroBarFills.protein, macroGoalLabels.protein);
  renderMacroGoal(goal.carbs, totals.carbs, macroBarTracks.carbs, macroBarFills.carbs, macroGoalLabels.carbs);
  renderMacroGoal(goal.fat, totals.fat, macroBarTracks.fat, macroBarFills.fat, macroGoalLabels.fat);
  renderBurned(burned);

  const anyGoalSet = goal.calories || goal.protein || goal.carbs || goal.fat;
  goalEditBtn.textContent = anyGoalSet ? "Edit goal" : "Set goal";
}

function renderWater() {
  if (!waterGlassesRow || !waterStatusEl) return;
  const count = loadWater();
  waterStatusEl.textContent = `${count} / ${DEFAULT_WATER_GOAL} glasses`;
  waterGlassesRow.innerHTML = "";

  for (let i = 1; i <= DEFAULT_WATER_GOAL; i++) {
    const span = document.createElement("span");
    span.className = `water-glass ${i <= count ? "filled" : ""}`;
    span.textContent = "🥛";
    span.addEventListener("click", () => {
      saveWater(i === count ? i - 1 : i);
      renderWater();
    });
    waterGlassesRow.appendChild(span);
  }
}

if (waterMinusBtn) {
  waterMinusBtn.addEventListener("click", () => {
    const count = Math.max(0, loadWater() - 1);
    saveWater(count);
    renderWater();
  });
}

if (waterPlusBtn) {
  waterPlusBtn.addEventListener("click", () => {
    const count = loadWater() + 1;
    saveWater(count);
    renderWater();
  });
}

function renderLog() {
  logList.innerHTML = "";

  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No entries yet today. Tap '+ Log Food' above to add what you ate.";
    logList.appendChild(empty);
    return;
  }

  // newest first
  [...entries].reverse().forEach((entry) => {
    const li = document.createElement("li");
    li.className = "log-entry";

    const main = document.createElement("div");
    main.className = "entry-main";
    main.style.cursor = "pointer";
    main.addEventListener("click", () => openEditEntryModal(entry.id));

    const desc = document.createElement("span");
    desc.className = "entry-desc";
    desc.textContent = entry.description;

    const macros = document.createElement("span");
    macros.className = "entry-macros";
    macros.textContent = `P ${round(entry.protein_g)}g · C ${round(
      entry.carbs_g
    )}g · F ${round(entry.fat_g)}g`;

    main.appendChild(desc);
    main.appendChild(macros);

    const rightGroup = document.createElement("div");
    rightGroup.style.display = "flex";
    rightGroup.style.alignItems = "center";
    rightGroup.style.gap = "8px";

    const cals = document.createElement("span");
    cals.className = "entry-cals";
    cals.textContent = Math.round(entry.calories);

    const editBtn = document.createElement("button");
    editBtn.className = "remove-btn";
    editBtn.textContent = "✏️";
    editBtn.style.fontSize = "0.8rem";
    editBtn.setAttribute("aria-label", "Edit entry");
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditEntryModal(entry.id);
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", "Remove entry");
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeEntry(entry.id);
    });

    rightGroup.appendChild(cals);
    rightGroup.appendChild(editBtn);
    rightGroup.appendChild(removeBtn);

    li.appendChild(main);
    li.appendChild(rightGroup);
    logList.appendChild(li);
  });
}

function renderAnalytics() {
  const totals = computeTotals(entries);
  const totalMacroGrams = totals.protein + totals.carbs + totals.fat;

  if (totalMacroGrams > 0) {
    const pctP = Math.round((totals.protein / totalMacroGrams) * 100);
    const pctC = Math.round((totals.carbs / totalMacroGrams) * 100);
    const pctF = Math.round((totals.fat / totalMacroGrams) * 100);

    if (macroPartP) macroPartP.style.width = `${pctP}%`;
    if (macroPartC) macroPartC.style.width = `${pctC}%`;
    if (macroPartF) macroPartF.style.width = `${pctF}%`;

    if (legendPText) legendPText.textContent = `Protein ${pctP}% (${round(totals.protein)}g)`;
    if (legendCText) legendCText.textContent = `Carbs ${pctC}% (${round(totals.carbs)}g)`;
    if (legendFText) legendFText.textContent = `Fat ${pctF}% (${round(totals.fat)}g)`;
  } else {
    if (macroPartP) macroPartP.style.width = "0%";
    if (macroPartC) macroPartC.style.width = "0%";
    if (macroPartF) macroPartF.style.width = "0%";
    if (legendPText) legendPText.textContent = "Protein 0%";
    if (legendCText) legendCText.textContent = "Carbs 0%";
    if (legendFText) legendFText.textContent = "Fat 0%";
  }

  // 7-day trend chart
  if (!weeklyChart) return;
  weeklyChart.innerHTML = "";
  const goal = loadGoal();
  const goalCals = goal.calories || 2000;

  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = dateKey(d);
    const dayEntries = loadEntriesForKey(k);
    const dayTotals = computeTotals(dayEntries);
    const cals = Math.round(dayTotals.calories);

    const heightPct = Math.min(100, Math.round((cals / (goalCals * 1.3)) * 100));

    const barCol = document.createElement("div");
    barCol.className = "bar-col";

    const valLabel = document.createElement("span");
    valLabel.className = "bar-col-val";
    valLabel.textContent = cals > 0 ? cals : "";

    const fill = document.createElement("div");
    fill.className = `bar-col-fill ${i === 0 ? "active-day" : ""} ${
      cals > goalCals ? "over-goal" : ""
    }`;
    fill.style.height = `${Math.max(4, heightPct)}%`;

    const dayName = d.toLocaleDateString(undefined, { weekday: "short" });
    const dayLabel = document.createElement("span");
    dayLabel.className = "bar-col-label";
    dayLabel.textContent = i === 0 ? "Today" : dayName;

    barCol.appendChild(valLabel);
    barCol.appendChild(fill);
    barCol.appendChild(dayLabel);
    weeklyChart.appendChild(barCol);
  }
}

function loadFavorites() {
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

function saveFavorites(favs) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

function renderFavorites() {
  if (!favoritesList) return;
  favoritesList.innerHTML = "";
  const favs = loadFavorites();

  if (favs.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No saved favorites yet.";
    favoritesList.appendChild(empty);
    return;
  }

  favs.forEach((fav) => {
    const li = document.createElement("li");
    li.className = "fav-item";

    const info = document.createElement("div");
    info.className = "fav-info";

    const title = document.createElement("span");
    title.className = "fav-title";
    title.textContent = fav.description;

    const macros = document.createElement("span");
    macros.className = "fav-macros";
    macros.textContent = `${Math.round(fav.calories)} kcal · P ${round(
      fav.protein_g
    )}g · C ${round(fav.carbs_g)}g · F ${round(fav.fat_g)}g`;

    info.appendChild(title);
    info.appendChild(macros);

    const btn = document.createElement("button");
    btn.className = "fav-add-btn";
    btn.textContent = "+ Log";
    btn.addEventListener("click", () => {
      addEntryFromResult(fav.description, fav);
      switchNavTab("today");
    });

    li.appendChild(info);
    li.appendChild(btn);
    favoritesList.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderGoal();
  renderWater();
  renderLog();
  renderAnalytics();
  renderFavorites();
}

function removeEntry(id) {
  entries = entries.filter((e) => e.id !== id);
  saveEntries(entries);
  render();
}

function addEntryFromResult(description, result) {
  const entry = {
    id: crypto.randomUUID(),
    description,
    calories: Number(result.calories) || 0,
    protein_g: Number(result.protein_g) || 0,
    carbs_g: Number(result.carbs_g) || 0,
    fat_g: Number(result.fat_g) || 0,
  };

  entries.push(entry);
  saveEntries(entries);
  render();
}

async function lookupFood(description, { final = false } = {}) {
  const params = new URLSearchParams({ food: description });
  if (final) params.set("final", "true");

  const res = await fetch(`/api/lookup?${params.toString()}`);

  if (!res.ok) {
    let message = "Lookup failed. Try again.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return res.json();
}

const clarifyPanel = document.getElementById("clarify-panel");
const clarifyQuestionEl = document.getElementById("clarify-question");
const clarifyForm = document.getElementById("clarify-form");
const clarifyInput = document.getElementById("clarify-input");
const clarifySkipBtn = document.getElementById("clarify-skip-btn");
const clarifyCancelBtn = document.getElementById("clarify-cancel-btn");

let pendingClarification = null;

function showClarifyPanel(question) {
  pendingClarification = { description: input.value.trim() };
  clarifyQuestionEl.textContent = question;
  clarifyInput.value = "";
  clarifyPanel.hidden = false;
  input.disabled = true;
  addButton.disabled = true;
  clarifyInput.focus();
}

function hideClarifyPanel() {
  pendingClarification = null;
  clarifyPanel.hidden = true;
  input.disabled = false;
  addButton.disabled = false;
}

async function finalizeEntry(description) {
  setStatus("Looking up nutrition...");
  try {
    const result = await lookupFood(description, { final: true });
    addEntryFromResult(description, result);
    input.value = "";
    setStatus("");
  } catch (err) {
    setStatus(err.message || "Something went wrong.", true);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const description = input.value.trim();
  if (!description) return;

  addButton.disabled = true;
  setStatus("Looking up nutrition...");

  try {
    const result = await lookupFood(description);

    if (result.type === "clarify") {
      setStatus("");
      showClarifyPanel(result.question);
      return;
    }

    addEntryFromResult(description, result);
    input.value = "";
    setStatus("");
  } catch (err) {
    setStatus(err.message || "Something went wrong.", true);
  } finally {
    addButton.disabled = false;
    input.focus();
  }
});

clarifyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!pendingClarification) return;

  const answer = clarifyInput.value.trim();
  const description = answer
    ? `${pendingClarification.description} — ${answer}`
    : pendingClarification.description;

  hideClarifyPanel();
  await finalizeEntry(description);
  input.focus();
});

clarifySkipBtn.addEventListener("click", async () => {
  if (!pendingClarification) return;
  const description = pendingClarification.description;
  hideClarifyPanel();
  await finalizeEntry(description);
  input.focus();
});

clarifyCancelBtn.addEventListener("click", () => {
  hideClarifyPanel();
  setStatus("");
  input.focus();
});

function formatDayLabel(key) {
  const [, y, m, d] = key.match(/^kcal-log-(\d{4})-(\d{2})-(\d{2})$/);
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getHistoryKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(LOG_KEY_PREFIX) && key !== todayKey()) {
      keys.push(key);
    }
  }
  return keys.sort().reverse();
}

function renderHistory() {
  historyList.innerHTML = "";
  const keys = getHistoryKeys();

  if (keys.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No past days yet.";
    historyList.appendChild(empty);
    return;
  }

  keys.forEach((key) => {
    const dayEntries = loadEntriesForKey(key);
    if (dayEntries.length === 0) return;

    const totals = computeTotals(dayEntries);

    const li = document.createElement("li");
    li.className = "history-day";

    const header = document.createElement("button");
    header.className = "history-day-header";
    header.type = "button";

    const dateSpan = document.createElement("span");
    dateSpan.className = "history-day-date";
    dateSpan.textContent = formatDayLabel(key);

    const summary = document.createElement("span");
    summary.className = "history-day-summary";
    summary.innerHTML = `<span class="history-day-cals">${Math.round(
      totals.calories
    )} kcal</span><span class="history-day-macros">P ${round(
      totals.protein
    )}g · C ${round(totals.carbs)}g · F ${round(totals.fat)}g</span>`;

    header.appendChild(dateSpan);
    header.appendChild(summary);

    const entriesList = document.createElement("ul");
    entriesList.className = "history-entries";
    entriesList.hidden = true;

    [...dayEntries].reverse().forEach((entry) => {
      const entryLi = document.createElement("li");
      entryLi.className = "history-entry";

      const desc = document.createElement("span");
      desc.className = "history-entry-desc";
      desc.textContent = entry.description;

      const cals = document.createElement("span");
      cals.className = "history-entry-cals";
      cals.textContent = Math.round(entry.calories);

      entryLi.appendChild(desc);
      entryLi.appendChild(cals);
      entriesList.appendChild(entryLi);
    });

    header.addEventListener("click", () => {
      entriesList.hidden = !entriesList.hidden;
    });

    li.appendChild(header);
    li.appendChild(entriesList);
    historyList.appendChild(li);
  });
}

function exportAllData() {
  const days = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (key.startsWith(LOG_KEY_PREFIX)) {
      const date = key.slice(LOG_KEY_PREFIX.length);
      const dayEntries = loadEntriesForKey(key);
      if (dayEntries.length > 0) {
        days[date] = days[date] || {};
        days[date].entries = dayEntries;
      }
    } else if (key.startsWith(BURNED_KEY_PREFIX)) {
      const date = key.slice(BURNED_KEY_PREFIX.length);
      const burned = Number(localStorage.getItem(key));
      if (burned > 0) {
        days[date] = days[date] || {};
        days[date].burned = burned;
      }
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    goal: loadGoal(),
    days,
  };
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

exportDataBtn.addEventListener("click", () => {
  const data = exportAllData();
  downloadJSON(data, `kcal-tracker-export-${dateSuffix(new Date())}.json`);
});

function switchNavTab(targetTab) {
  const views = {
    today: viewToday,
    log: viewLog,
    analytics: viewAnalytics,
    swap: viewSwap,
    settings: viewSettings,
  };
  const btns = {
    today: navTodayBtn,
    log: navLogBtn,
    analytics: navAnalyticsBtn,
    swap: navSwapBtn,
    settings: navSettingsBtn,
  };

  Object.keys(views).forEach((key) => {
    if (views[key]) views[key].hidden = key !== targetTab;
    if (btns[key]) btns[key].classList.toggle("active", key === targetTab);
  });

  if (targetTab === "analytics") {
    renderAnalytics();
    renderHistory();
  }
  if (targetTab === "log") {
    renderFavorites();
  }
}

if (navTodayBtn) navTodayBtn.addEventListener("click", () => switchNavTab("today"));
if (navLogBtn) navLogBtn.addEventListener("click", () => switchNavTab("log"));
if (navAnalyticsBtn) navAnalyticsBtn.addEventListener("click", () => switchNavTab("analytics"));
if (navSwapBtn) navSwapBtn.addEventListener("click", () => switchNavTab("swap"));
if (navSettingsBtn) navSettingsBtn.addEventListener("click", () => switchNavTab("settings"));

if (quickLogNavBtn) {
  quickLogNavBtn.addEventListener("click", () => {
    switchNavTab("log");
    if (input) input.focus();
  });
}

// Manual Quick Add Modal logic
function openManualAddModal() {
  if (!manualAddModal) return;
  manualDescInput.value = "";
  manualCaloriesInput.value = "";
  manualProteinInput.value = "0";
  manualCarbsInput.value = "0";
  manualFatInput.value = "0";
  manualAddModal.hidden = false;
  manualDescInput.focus();
}

function closeManualAddModal() {
  if (manualAddModal) manualAddModal.hidden = true;
}

if (manualAddBtn) manualAddBtn.addEventListener("click", openManualAddModal);
if (manualAddClose) manualAddClose.addEventListener("click", closeManualAddModal);
if (manualCancelBtn) manualCancelBtn.addEventListener("click", closeManualAddModal);

if (manualAddForm) {
  manualAddForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const description = manualDescInput.value.trim();
    if (!description) return;

    addEntryFromResult(description, {
      calories: Number(manualCaloriesInput.value) || 0,
      protein_g: Number(manualProteinInput.value) || 0,
      carbs_g: Number(manualCarbsInput.value) || 0,
      fat_g: Number(manualFatInput.value) || 0,
    });
    closeManualAddModal();
    switchNavTab("today");
  });
}

// Edit Entry Modal logic
function openEditEntryModal(id) {
  const entry = entries.find((e) => e.id === id);
  if (!entry || !editEntryModal) return;

  currentEditingEntryId = id;
  editDescInput.value = entry.description;
  editCaloriesInput.value = Math.round(entry.calories);
  editProteinInput.value = round(entry.protein_g);
  editCarbsInput.value = round(entry.carbs_g);
  editFatInput.value = round(entry.fat_g);
  editEntryModal.hidden = false;
  editDescInput.focus();
}

function closeEditEntryModal() {
  currentEditingEntryId = null;
  if (editEntryModal) editEntryModal.hidden = true;
}

if (editEntryClose) editEntryClose.addEventListener("click", closeEditEntryModal);
if (editCancelBtn) editCancelBtn.addEventListener("click", closeEditEntryModal);

if (editEntryForm) {
  editEntryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentEditingEntryId) return;

    const index = entries.findIndex((e) => e.id === currentEditingEntryId);
    if (index !== -1) {
      entries[index] = {
        ...entries[index],
        description: editDescInput.value.trim(),
        calories: Number(editCaloriesInput.value) || 0,
        protein_g: Number(editProteinInput.value) || 0,
        carbs_g: Number(editCarbsInput.value) || 0,
        fat_g: Number(editFatInput.value) || 0,
      };
      saveEntries(entries);
      render();
    }
    closeEditEntryModal();
  });
}

// BMR & TDEE Calculator logic
function loadBodyProfile() {
  const raw = localStorage.getItem(BODY_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveBodyProfile(prof) {
  localStorage.setItem(BODY_PROFILE_KEY, JSON.stringify(prof));
}

function calculateBMRandTDEE(profile) {
  const { age, gender, weight, height, activity, bodyFat } = profile;
  let bmr = 0;

  if (bodyFat && bodyFat > 0 && bodyFat < 60) {
    // Katch-McArdle Formula (based on lean body mass)
    const lbm = weight * (1 - bodyFat / 100);
    bmr = 370 + 21.6 * lbm;
  } else {
    // Mifflin-St Jeor Formula
    bmr = 10 * weight + 6.25 * height - 5 * age;
    bmr += gender === "female" ? -161 : 5;
  }

  const tdee = bmr * (activity || 1.2);
  return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

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
  if (bmrResultBox) bmrResultBox.hidden = false;
}

if (bodyProfileForm) {
  bodyProfileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const prof = {
      age: Number(bodyAgeInput.value) || 28,
      gender: bodyGenderSelect.value,
      weight: Number(bodyWeightInput.value) || 70,
      height: Number(bodyHeightInput.value) || 170,
      activity: Number(bodyActivitySelect.value) || 1.2,
      bodyFat: Number(bodyFatInput.value) || null,
    };
    saveBodyProfile(prof);
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
    renderGoal();
    alert(`Daily Calorie Goal set to ${tdee} kcal based on your TDEE!`);
  });
}

// PWA Install prompt handling
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBanner) installBanner.hidden = false;
});

if (installPwaBtn) {
  installPwaBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      if (installBanner) installBanner.hidden = true;
    }
    deferredPrompt = null;
  });
}

if (dismissInstallBtn) {
  dismissInstallBtn.addEventListener("click", () => {
    if (installBanner) installBanner.hidden = true;
  });
}

swapForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const food = swapInput.value.trim();
  if (!food) return;

  swapButton.disabled = true;
  swapResultEl.hidden = true;
  swapStatusEl.classList.remove("error");
  swapStatusEl.textContent = "Thinking...";

  try {
    const res = await fetch(`/api/swap-suggestion?food=${encodeURIComponent(food)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Couldn't generate a suggestion.");
    }

    swapStatusEl.textContent = "";
    swapResultEl.textContent = data.answer;
    swapResultEl.hidden = false;
  } catch (err) {
    swapStatusEl.textContent = err.message || "Something went wrong.";
    swapStatusEl.classList.add("error");
  } finally {
    swapButton.disabled = false;
  }
});

goalEditBtn.addEventListener("click", () => {
  const goal = loadGoal();
  goalCaloriesInput.value = goal.calories || "";
  goalProteinInput.value = goal.protein || "";
  goalCarbsInput.value = goal.carbs || "";
  goalFatInput.value = goal.fat || "";
  goalDisplay.hidden = true;
  goalForm.hidden = false;
  goalCaloriesInput.focus();
});

goalCancelBtn.addEventListener("click", () => {
  goalForm.hidden = true;
  goalDisplay.hidden = false;
});

goalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveGoal({
    calories: normalizeGoalValue(Number(goalCaloriesInput.value)),
    protein: normalizeGoalValue(Number(goalProteinInput.value)),
    carbs: normalizeGoalValue(Number(goalCarbsInput.value)),
    fat: normalizeGoalValue(Number(goalFatInput.value)),
  });
  goalForm.hidden = true;
  goalDisplay.hidden = false;
  renderGoal();
});

burnedEditBtn.addEventListener("click", () => {
  burnedInput.value = loadBurned() || "";
  burnedDisplay.hidden = true;
  burnedForm.hidden = false;
  burnedInput.focus();
});

burnedCancelBtn.addEventListener("click", () => {
  burnedForm.hidden = true;
  burnedDisplay.hidden = false;
});

burnedForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveBurned(Number(burnedInput.value) || 0);
  burnedForm.hidden = true;
  burnedDisplay.hidden = false;
  renderGoal();
});

const scanBarcodeBtn = document.getElementById("scan-barcode-btn");
const addPhotoBtn = document.getElementById("add-photo-btn");

const barcodeModal = document.getElementById("barcode-modal");
const barcodeModalClose = document.getElementById("barcode-modal-close");
const barcodeReaderEl = document.getElementById("barcode-reader");
const barcodeStatusEl = document.getElementById("barcode-status");
const barcodeConfirmEl = document.getElementById("barcode-confirm");
const barcodeProductNameEl = document.getElementById("barcode-product-name");
const barcodePer100gEl = document.getElementById("barcode-per-100g");
const barcodeQuantityInput = document.getElementById("barcode-quantity-input");
const barcodeAddBtn = document.getElementById("barcode-add-btn");
const barcodeCancelConfirmBtn = document.getElementById("barcode-cancel-confirm-btn");
const barcodeFallbackEl = document.getElementById("barcode-fallback");
const barcodeFallbackForm = document.getElementById("barcode-fallback-form");
const barcodeFallbackInput = document.getElementById("barcode-fallback-input");

const BARCODE_FORMATS_SUPPORTED =
  typeof Html5QrcodeSupportedFormats !== "undefined"
    ? [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
      ]
    : undefined;

let html5QrCodeInstance = null;
let currentBarcodeProduct = null;

function resetBarcodeModal() {
  barcodeStatusEl.textContent = "";
  barcodeConfirmEl.hidden = true;
  barcodeFallbackEl.hidden = true;
  barcodeReaderEl.hidden = false;
  barcodeFallbackInput.value = "";
  currentBarcodeProduct = null;
}

async function stopBarcodeScanner() {
  if (!html5QrCodeInstance) return;
  try {
    await html5QrCodeInstance.stop();
    html5QrCodeInstance.clear();
  } catch {
    // already stopped or never started — ignore
  }
  html5QrCodeInstance = null;
}

async function onBarcodeDecoded(decodedText) {
  await stopBarcodeScanner();
  barcodeReaderEl.hidden = true;
  barcodeStatusEl.textContent = `Looking up barcode ${decodedText}...`;

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(decodedText)}.json`
    );
    const data = await res.json();

    if (data.status !== 1 || !data.product) {
      barcodeStatusEl.textContent = `No product found for barcode ${decodedText}.`;
      barcodeFallbackEl.hidden = false;
      return;
    }

    const product = data.product;
    const n = product.nutriments || {};
    const per100g = {
      calories: Number(n["energy-kcal_100g"]) || 0,
      protein: Number(n.proteins_100g) || 0,
      carbs: Number(n.carbohydrates_100g) || 0,
      fat: Number(n.fat_100g) || 0,
    };

    if (!per100g.calories) {
      barcodeStatusEl.textContent = "That product doesn't have nutrition data on file.";
      barcodeFallbackEl.hidden = false;
      return;
    }

    currentBarcodeProduct = {
      name: product.product_name || `Product ${decodedText}`,
      per100g,
    };

    const defaultGrams =
      Number(product.serving_quantity) > 0 ? Math.round(product.serving_quantity) : 100;

    barcodeProductNameEl.textContent = currentBarcodeProduct.name;
    barcodePer100gEl.textContent = `${Math.round(per100g.calories)} kcal / 100g · P ${round(
      per100g.protein
    )}g · C ${round(per100g.carbs)}g · F ${round(per100g.fat)}g`;
    barcodeQuantityInput.value = defaultGrams;
    barcodeStatusEl.textContent = "";
    barcodeConfirmEl.hidden = false;
  } catch (err) {
    console.error("Open Food Facts lookup failed:", err);
    barcodeStatusEl.textContent = "Lookup failed (network issue).";
    barcodeFallbackEl.hidden = false;
  }
}

async function openBarcodeModal() {
  resetBarcodeModal();
  barcodeModal.hidden = false;
  barcodeStatusEl.textContent = "Point your camera at a barcode...";

  try {
    html5QrCodeInstance = new Html5Qrcode("barcode-reader");
    await html5QrCodeInstance.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 260, height: 160 },
        formatsToSupport: BARCODE_FORMATS_SUPPORTED,
      },
      onBarcodeDecoded,
      () => {
        // per-frame "no barcode found yet" — expected, ignore
      }
    );
  } catch (err) {
    console.error("Camera start failed:", err);
    barcodeStatusEl.textContent =
      "Couldn't access the camera. Check permissions, or type the product name below.";
    barcodeReaderEl.hidden = true;
    barcodeFallbackEl.hidden = false;
  }
}

async function closeBarcodeModal() {
  await stopBarcodeScanner();
  barcodeModal.hidden = true;
}

scanBarcodeBtn.addEventListener("click", openBarcodeModal);
barcodeModalClose.addEventListener("click", closeBarcodeModal);
barcodeCancelConfirmBtn.addEventListener("click", closeBarcodeModal);

barcodeAddBtn.addEventListener("click", () => {
  const grams = Number(barcodeQuantityInput.value) || 0;
  if (!grams || !currentBarcodeProduct) return;

  const factor = grams / 100;
  const { name, per100g } = currentBarcodeProduct;
  addEntryFromResult(`${name} (${grams}g)`, {
    calories: per100g.calories * factor,
    protein_g: per100g.protein * factor,
    carbs_g: per100g.carbs * factor,
    fat_g: per100g.fat * factor,
  });
  closeBarcodeModal();
});

barcodeFallbackForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const description = barcodeFallbackInput.value.trim();
  if (!description) return;

  barcodeStatusEl.textContent = "Looking up nutrition...";
  try {
    const result = await lookupFood(description, { final: true });
    addEntryFromResult(description, result);
    closeBarcodeModal();
  } catch (err) {
    barcodeStatusEl.textContent = err.message || "Lookup failed.";
  }
});

const photoModal = document.getElementById("photo-modal");
const photoModalClose = document.getElementById("photo-modal-close");

const photoStartEl = document.getElementById("photo-start");
const photoTakeBtn = document.getElementById("photo-take-btn");
const photoUploadBtn = document.getElementById("photo-upload-btn");
const photoFileInput = document.getElementById("photo-file-input");

const photoCameraEl = document.getElementById("photo-camera");
const photoVideoEl = document.getElementById("photo-video");
const photoCaptureBtn = document.getElementById("photo-capture-btn");
const photoCameraCancelBtn = document.getElementById("photo-camera-cancel-btn");

const photoPreviewEl = document.getElementById("photo-preview");
const photoPreviewImg = document.getElementById("photo-preview-img");
const photoQuantityInput = document.getElementById("photo-quantity-input");
const photoAnalyzeBtn = document.getElementById("photo-analyze-btn");
const photoRetakeBtn = document.getElementById("photo-retake-btn");

const photoTipEl = document.getElementById("photo-tip");
const photoStatusEl = document.getElementById("photo-status");
const photoConfirmEl = document.getElementById("photo-confirm");
const photoConfirmForm = document.getElementById("photo-confirm-form");
const photoEditDesc = document.getElementById("photo-edit-desc");
const photoEditCalories = document.getElementById("photo-edit-calories");
const photoEditProtein = document.getElementById("photo-edit-protein");
const photoEditCarbs = document.getElementById("photo-edit-carbs");
const photoEditFat = document.getElementById("photo-edit-fat");
const photoRetryBtn = document.getElementById("photo-retry-btn");

const photoModeAutoBtn = document.getElementById("photo-mode-auto");
const photoModeLabelBtn = document.getElementById("photo-mode-label");

let activePhotoMode = "auto"; // "auto" or "label"
let currentPhotoResult = null;
let capturedPhotoDataUrl = null;
let photoCameraStream = null;

if (photoModeAutoBtn && photoModeLabelBtn) {
  photoModeAutoBtn.addEventListener("click", () => {
    activePhotoMode = "auto";
    photoModeAutoBtn.classList.add("active");
    photoModeLabelBtn.classList.remove("active");
  });
  photoModeLabelBtn.addEventListener("click", () => {
    activePhotoMode = "label";
    photoModeLabelBtn.classList.add("active");
    photoModeAutoBtn.classList.remove("active");
  });
}

function showPhotoPanel(panel) {
  photoStartEl.hidden = panel !== photoStartEl;
  photoCameraEl.hidden = panel !== photoCameraEl;
  photoPreviewEl.hidden = panel !== photoPreviewEl;
}

function stopPhotoCamera() {
  if (photoCameraStream) {
    photoCameraStream.getTracks().forEach((track) => track.stop());
    photoCameraStream = null;
  }
  photoVideoEl.srcObject = null;
}

function resetPhotoModal() {
  photoStatusEl.textContent = "";
  photoConfirmEl.hidden = true;
  photoTipEl.hidden = false;
  photoFileInput.value = "";
  photoQuantityInput.value = "";
  currentPhotoResult = null;
  capturedPhotoDataUrl = null;
  stopPhotoCamera();
  showPhotoPanel(photoStartEl);
}

function openPhotoModal() {
  resetPhotoModal();
  photoModal.hidden = false;
}

function closePhotoModal() {
  stopPhotoCamera();
  photoModal.hidden = true;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

function downscaleImage(dataUrl, maxDim = 1024, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Couldn't read that image."));
    img.src = dataUrl;
  });
}

function captureFrameFromVideo(video, maxDim = 1024, quality = 0.7) {
  let { videoWidth: width, videoHeight: height } = video;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

addPhotoBtn.addEventListener("click", openPhotoModal);
photoModalClose.addEventListener("click", closePhotoModal);

photoTakeBtn.addEventListener("click", async () => {
  photoStatusEl.textContent = "";
  try {
    photoCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    photoVideoEl.srcObject = photoCameraStream;
    await photoVideoEl.play();
    showPhotoPanel(photoCameraEl);
  } catch (err) {
    console.error("Camera start failed:", err);
    photoStatusEl.textContent =
      "Couldn't access the camera. Check permissions, or choose a photo from your gallery instead.";
  }
});

photoCameraCancelBtn.addEventListener("click", () => {
  stopPhotoCamera();
  showPhotoPanel(photoStartEl);
});

photoCaptureBtn.addEventListener("click", () => {
  capturedPhotoDataUrl = captureFrameFromVideo(photoVideoEl);
  stopPhotoCamera();
  photoPreviewImg.src = capturedPhotoDataUrl;
  showPhotoPanel(photoPreviewEl);
});

photoUploadBtn.addEventListener("click", () => {
  photoFileInput.click();
});

photoFileInput.addEventListener("change", async () => {
  const file = photoFileInput.files?.[0];
  if (!file) return;

  try {
    const rawDataUrl = await readFileAsDataURL(file);
    capturedPhotoDataUrl = await downscaleImage(rawDataUrl);
    photoPreviewImg.src = capturedPhotoDataUrl;
    showPhotoPanel(photoPreviewEl);
  } catch (err) {
    photoStatusEl.textContent = err.message || "Couldn't read that photo.";
  }
});

photoRetakeBtn.addEventListener("click", () => {
  capturedPhotoDataUrl = null;
  photoStatusEl.textContent = "";
  showPhotoPanel(photoStartEl);
});

photoAnalyzeBtn.addEventListener("click", async () => {
  if (!capturedPhotoDataUrl) {
    photoStatusEl.textContent = "Take or choose a photo first.";
    return;
  }

  photoAnalyzeBtn.disabled = true;
  photoStatusEl.textContent = "Analyzing photo...";

  try {
    const quantity = photoQuantityInput.value.trim();

    const res = await fetch("/api/vision-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: capturedPhotoDataUrl, quantity, mode: activePhotoMode }),
    });

    if (!res.ok) {
      let message = "Photo analysis failed. Try again, or add this food by typing instead.";
      try {
        const data = await res.json();
        if (data?.error) message = data.error;
      } catch {
        // ignore parse errors
      }
      throw new Error(message);
    }

    const result = await res.json();
    currentPhotoResult = result;

    if (photoEditDesc) photoEditDesc.value = result.description || "";
    if (photoEditCalories) photoEditCalories.value = Math.round(result.calories) || 0;
    if (photoEditProtein) photoEditProtein.value = round(result.protein_g) || 0;
    if (photoEditCarbs) photoEditCarbs.value = round(result.carbs_g) || 0;
    if (photoEditFat) photoEditFat.value = round(result.fat_g) || 0;

    showPhotoPanel(null);
    if (photoTipEl) photoTipEl.hidden = true;
    photoStatusEl.textContent = "";
    photoConfirmEl.hidden = false;
  } catch (err) {
    photoStatusEl.textContent =
      err.message || "Something went wrong. Try a clearer photo, or add this food by typing instead.";
  } finally {
    photoAnalyzeBtn.disabled = false;
  }
});

if (photoConfirmForm) {
  photoConfirmForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const description = photoEditDesc.value.trim();
    if (!description) return;

    addEntryFromResult(description, {
      calories: Number(photoEditCalories.value) || 0,
      protein_g: Number(photoEditProtein.value) || 0,
      carbs_g: Number(photoEditCarbs.value) || 0,
      fat_g: Number(photoEditFat.value) || 0,
    });
    closePhotoModal();
  });
}

photoRetryBtn.addEventListener("click", () => {
  photoConfirmEl.hidden = true;
  photoTipEl.hidden = false;
  showPhotoPanel(photoStartEl);
  photoStatusEl.textContent = "";
});

renderDate();
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}
