/* Main Application Entry Point & Controller Module */
import {
  loadEntries,
  saveEntries,
  computeTotals,
  round,
  loadGoal,
  saveGoal,
  normalizeGoalValue,
  loadBurned,
  saveBurned,
  loadWater,
  saveWater,
  DEFAULT_WATER_GOAL,
  loadFavorites,
  saveFavorites,
  dateSuffix,
} from "./storage.js";
import { initTheme } from "./theme.js";
import { initBodyProfile } from "./body-profile.js";
import { renderAnalytics, renderHistory } from "./analytics.js";
import { initUIModals } from "./ui-modals.js";
import { initVisionModule } from "./vision.js";

// Main DOM references
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

// Nav
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
const exportDataBtn = document.getElementById("export-data-btn");

// Water Widget
const waterStatusEl = document.getElementById("water-status");
const waterGlassesRow = document.getElementById("water-glasses-row");
const waterMinusBtn = document.getElementById("water-minus-btn");
const waterPlusBtn = document.getElementById("water-plus-btn");

// Favorites
const favoritesList = document.getElementById("favorites-list");
const addFavBtn = document.getElementById("add-fav-btn");

// Goals
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

// Clarify Panel
const clarifyPanel = document.getElementById("clarify-panel");
const clarifyQuestionEl = document.getElementById("clarify-question");
const clarifyForm = document.getElementById("clarify-form");
const clarifyInput = document.getElementById("clarify-input");
const clarifySkipBtn = document.getElementById("clarify-skip-btn");
const clarifyCancelBtn = document.getElementById("clarify-cancel-btn");

// PWA Banner
const installBanner = document.getElementById("install-banner");
const installPwaBtn = document.getElementById("install-pwa-btn");
const dismissInstallBtn = document.getElementById("dismiss-install-btn");
let deferredPrompt = null;

let entries = loadEntries();
let modalControllers = null;

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function renderDate() {
  if (!dateEl) return;
  dateEl.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function renderTotals() {
  const totals = computeTotals(entries);
  if (totalCaloriesEl) totalCaloriesEl.textContent = Math.round(totals.calories);
  if (totalProteinEl) totalProteinEl.textContent = `${round(totals.protein)}g`;
  if (totalCarbsEl) totalCarbsEl.textContent = `${round(totals.carbs)}g`;
  if (totalFatEl) totalFatEl.textContent = `${round(totals.fat)}g`;
}

function renderCalorieGoal(goalCalories, calories, burned) {
  if (!goalBarFill || !goalStatusEl) return;
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
  if (!burnedStatusEl || !burnedEditBtn) return;
  if (burned > 0) {
    burnedStatusEl.textContent = `${burned} kcal burned today`;
    burnedEditBtn.textContent = "Edit burned";
  } else {
    burnedStatusEl.textContent = "No calories burned logged";
    burnedEditBtn.textContent = "Log burned";
  }
}

function renderMacroGoal(goalValue, actualValue, trackEl, fillEl, labelEl) {
  if (!trackEl || !fillEl || !labelEl) return;
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
  if (goalEditBtn) goalEditBtn.textContent = anyGoalSet ? "Edit goal" : "Set goal";
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

function toggleFavoriteEntry(entry) {
  let favs = loadFavorites();
  const index = favs.findIndex((f) => f.description === entry.description);
  if (index !== -1) {
    favs.splice(index, 1);
  } else {
    favs.push({
      description: entry.description,
      calories: Math.round(entry.calories),
      protein_g: round(entry.protein_g),
      carbs_g: round(entry.carbs_g),
      fat_g: round(entry.fat_g),
    });
  }
  saveFavorites(favs);
}

function removeEntry(id) {
  entries = entries.filter((e) => e.id !== id);
  saveEntries(entries);
  renderApp();
}

function renderLog() {
  if (!logList) return;
  logList.innerHTML = "";

  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No entries yet today. Tap '+ Log Food' above to add what you ate.";
    logList.appendChild(empty);
    return;
  }

  [...entries].reverse().forEach((entry) => {
    const li = document.createElement("li");
    li.className = "log-entry";

    const main = document.createElement("div");
    main.className = "entry-main";
    main.style.cursor = "pointer";
    main.addEventListener("click", () => {
      if (modalControllers) modalControllers.openEditEntryModal(entry.id);
    });

    const desc = document.createElement("span");
    desc.className = "entry-desc";
    desc.textContent = entry.description;

    const macros = document.createElement("span");
    macros.className = "entry-macros";
    macros.textContent = `P ${round(entry.protein_g)}g · C ${round(entry.carbs_g)}g · F ${round(entry.fat_g)}g`;

    main.appendChild(desc);
    main.appendChild(macros);

    const rightGroup = document.createElement("div");
    rightGroup.style.display = "flex";
    rightGroup.style.alignItems = "center";
    rightGroup.style.gap = "8px";

    const cals = document.createElement("span");
    cals.className = "entry-cals";
    cals.textContent = Math.round(entry.calories);

    const favs = loadFavorites();
    const isFav = favs.some((f) => f.description === entry.description);

    const starBtn = document.createElement("button");
    starBtn.className = "remove-btn";
    starBtn.textContent = isFav ? "⭐" : "☆";
    starBtn.style.fontSize = "0.9rem";
    starBtn.setAttribute("aria-label", "Toggle favorite");
    starBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavoriteEntry(entry);
      renderApp();
    });

    const editBtn = document.createElement("button");
    editBtn.className = "remove-btn";
    editBtn.textContent = "✏️";
    editBtn.style.fontSize = "0.8rem";
    editBtn.setAttribute("aria-label", "Edit entry");
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (modalControllers) modalControllers.openEditEntryModal(entry.id);
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
    rightGroup.appendChild(starBtn);
    rightGroup.appendChild(editBtn);
    rightGroup.appendChild(removeBtn);

    li.appendChild(main);
    li.appendChild(rightGroup);
    logList.appendChild(li);
  });
}

function renderFavorites() {
  if (!favoritesList) return;
  favoritesList.innerHTML = "";
  const favs = loadFavorites();

  if (favs.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No saved favorites yet. Tap '+ Add Fav' above to save quick items.";
    favoritesList.appendChild(empty);
    return;
  }

  favs.forEach((fav, index) => {
    const li = document.createElement("li");
    li.className = "fav-item";

    const info = document.createElement("div");
    info.className = "fav-info";

    const title = document.createElement("span");
    title.className = "fav-title";
    title.textContent = fav.description;

    const macros = document.createElement("span");
    macros.className = "fav-macros";
    macros.textContent = `${Math.round(fav.calories)} kcal · P ${round(fav.protein_g)}g · C ${round(
      fav.carbs_g
    )}g · F ${round(fav.fat_g)}g`;

    info.appendChild(title);
    info.appendChild(macros);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.alignItems = "center";
    actions.style.gap = "6px";

    const logBtn = document.createElement("button");
    logBtn.className = "fav-add-btn";
    logBtn.textContent = "+ Log";
    logBtn.addEventListener("click", () => {
      addEntryFromResult(fav.description, fav);
      switchNavTab("today");
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "remove-btn";
    deleteBtn.textContent = "×";
    deleteBtn.setAttribute("aria-label", "Remove favorite");
    deleteBtn.addEventListener("click", () => {
      const currentFavs = loadFavorites();
      currentFavs.splice(index, 1);
      saveFavorites(currentFavs);
      renderFavorites();
    });

    actions.appendChild(logBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(info);
    li.appendChild(actions);
    favoritesList.appendChild(li);
  });
}

if (addFavBtn) {
  addFavBtn.addEventListener("click", () => {
    if (modalControllers) modalControllers.openManualAddModal("favorite");
  });
}

export function addEntryFromResult(description, result) {
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
  renderApp();
}

function renderApp() {
  renderTotals();
  renderGoal();
  renderWater();
  renderLog();
  renderAnalytics(entries);
  renderFavorites();
}

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
    renderAnalytics(entries);
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
      // ignore
    }
    throw new Error(message);
  }

  return res.json();
}

let pendingClarification = null;

function showClarifyPanel(question) {
  pendingClarification = { description: input.value.trim() };
  if (clarifyQuestionEl) clarifyQuestionEl.textContent = question;
  if (clarifyInput) clarifyInput.value = "";
  if (clarifyPanel) clarifyPanel.hidden = false;
  if (input) input.disabled = true;
  if (addButton) addButton.disabled = true;
  if (clarifyInput) clarifyInput.focus();
}

function hideClarifyPanel() {
  pendingClarification = null;
  if (clarifyPanel) clarifyPanel.hidden = true;
  if (input) input.disabled = false;
  if (addButton) addButton.disabled = false;
}

async function finalizeEntry(description) {
  setStatus("Looking up nutrition...");
  try {
    const result = await lookupFood(description, { final: true });
    addEntryFromResult(description, result);
    if (input) input.value = "";
    setStatus("");
  } catch (err) {
    setStatus(err.message || "Something went wrong.", true);
  }
}

if (form) {
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
}

if (clarifyForm) {
  clarifyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!pendingClarification) return;

    const answer = clarifyInput.value.trim();
    const description = answer
      ? `${pendingClarification.description} — ${answer}`
      : pendingClarification.description;

    hideClarifyPanel();
    await finalizeEntry(description);
    if (input) input.focus();
  });
}

if (clarifySkipBtn) {
  clarifySkipBtn.addEventListener("click", async () => {
    if (!pendingClarification) return;
    const description = pendingClarification.description;
    hideClarifyPanel();
    await finalizeEntry(description);
    if (input) input.focus();
  });
}

if (clarifyCancelBtn) {
  clarifyCancelBtn.addEventListener("click", () => {
    hideClarifyPanel();
    setStatus("");
    if (input) input.focus();
  });
}

if (goalEditBtn) {
  goalEditBtn.addEventListener("click", () => {
    const goal = loadGoal();
    if (goalCaloriesInput) goalCaloriesInput.value = goal.calories || "";
    if (goalProteinInput) goalProteinInput.value = goal.protein || "";
    if (goalCarbsInput) goalCarbsInput.value = goal.carbs || "";
    if (goalFatInput) goalFatInput.value = goal.fat || "";
    if (goalDisplay) goalDisplay.hidden = true;
    if (goalForm) goalForm.hidden = false;
    if (goalCaloriesInput) goalCaloriesInput.focus();
  });
}

if (goalCancelBtn) {
  goalCancelBtn.addEventListener("click", () => {
    if (goalForm) goalForm.hidden = true;
    if (goalDisplay) goalDisplay.hidden = false;
  });
}

if (goalForm) {
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
}

if (burnedEditBtn) {
  burnedEditBtn.addEventListener("click", () => {
    if (burnedInput) burnedInput.value = loadBurned() || "";
    if (burnedDisplay) burnedDisplay.hidden = true;
    if (burnedForm) burnedForm.hidden = false;
    if (burnedInput) burnedInput.focus();
  });
}

if (burnedCancelBtn) {
  burnedCancelBtn.addEventListener("click", () => {
    if (burnedForm) burnedForm.hidden = true;
    if (burnedDisplay) burnedDisplay.hidden = false;
  });
}

if (burnedForm) {
  burnedForm.addEventListener("submit", (e) => {
    e.preventDefault();
    saveBurned(Number(burnedInput.value) || 0);
    burnedForm.hidden = true;
    burnedDisplay.hidden = false;
    renderGoal();
  });
}

function exportAllData() {
  const days = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (key.startsWith("kcal-log-")) {
      const date = key.slice("kcal-log-".length);
      const dayEntries = JSON.parse(localStorage.getItem(key) || "[]");
      if (dayEntries.length > 0) {
        days[date] = days[date] || {};
        days[date].entries = dayEntries;
      }
    } else if (key.startsWith("kcal-burned-")) {
      const date = key.slice("kcal-burned-".length);
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

if (exportDataBtn) {
  exportDataBtn.addEventListener("click", () => {
    const data = exportAllData();
    downloadJSON(data, `kcal-tracker-export-${dateSuffix(new Date())}.json`);
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

// Module Initializations
initTheme();
initBodyProfile(renderGoal);
modalControllers = initUIModals(entries, addEntryFromResult, renderApp, switchNavTab);
initVisionModule(addEntryFromResult);

renderDate();
renderApp();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}
