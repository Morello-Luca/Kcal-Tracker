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
  loadSettings,
  saveSettings,
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
const navBodyBtn = document.getElementById("nav-body");
const navSwapBtn = document.getElementById("nav-swap");
const navSettingsBtn = document.getElementById("nav-settings");

const viewToday = document.getElementById("view-today");
const viewLog = document.getElementById("view-log");
const viewAnalytics = document.getElementById("view-analytics");
const viewBody = document.getElementById("view-body");
const viewSwap = document.getElementById("view-swap");
const viewSettings = document.getElementById("view-settings");

const quickLogNavBtn = document.getElementById("quick-log-nav-btn");
const exportDataBtn = document.getElementById("export-data-btn");

// Water Widget
const waterStatusEl = document.getElementById("water-status");
const waterGlassesRow = document.getElementById("water-glasses-row");
const waterMinusBtn = document.getElementById("water-minus-btn");
const waterPlusBtn = document.getElementById("water-plus-btn");

// Favorites & Batch Actions
const favoritesList = document.getElementById("favorites-list");
const addFavBtn = document.getElementById("add-fav-btn");
const clearDayBtn = document.getElementById("clear-day-btn");
const batchToggleBtn = document.getElementById("batch-toggle-btn");
const batchActionsBar = document.getElementById("batch-actions-bar");
const batchSelectedCount = document.getElementById("batch-selected-count");
const batchDeleteBtn = document.getElementById("batch-delete-btn");

const startDaySelect = document.getElementById("start-day-select");
const toastContainer = document.getElementById("toast-container");

let isBatchMode = false;
let selectedEntryIds = new Set();

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
    const glass = document.createElement("div");
    glass.className = `water-glass ${i <= count ? "filled" : ""}`;
    glass.innerHTML = `
      <svg class="glass-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 2H6l1.2 18a2 2 0 0 0 2 2h5.6a2 2 0 0 0 2-2L18 2z"/>
        <line x1="6" y1="6" x2="18" y2="6"/>
      </svg>
    `;
    glass.addEventListener("click", () => {
      saveWater(i === count ? i - 1 : i);
      renderWater();
    });
    waterGlassesRow.appendChild(glass);
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

export function showToast(message, undoCallback) {
  if (!toastContainer) return;
  toastContainer.innerHTML = "";

  const toast = document.createElement("div");
  toast.className = "toast-message";

  const textSpan = document.createElement("span");
  textSpan.textContent = message;

  toast.appendChild(textSpan);

  if (undoCallback) {
    const undoBtn = document.createElement("button");
    undoBtn.className = "toast-undo-btn";
    undoBtn.textContent = "Undo";
    undoBtn.addEventListener("click", () => {
      undoCallback();
      toast.remove();
    });
    toast.appendChild(undoBtn);
  }

  toastContainer.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 5000);
}

function removeEntry(id) {
  const removedEntry = entries.find((e) => e.id === id);
  if (!removedEntry) return;

  entries = entries.filter((e) => e.id !== id);
  saveEntries(entries);
  renderApp();

  showToast(`Removed "${removedEntry.description}"`, () => {
    entries.push(removedEntry);
    saveEntries(entries);
    renderApp();
  });
}

if (batchToggleBtn) {
  batchToggleBtn.addEventListener("click", () => {
    isBatchMode = !isBatchMode;
    selectedEntryIds.clear();
    batchToggleBtn.textContent = isBatchMode ? "Done" : "Batch Select";
    if (batchActionsBar) batchActionsBar.hidden = !isBatchMode;
    renderLog();
  });
}

function updateBatchCount() {
  if (batchSelectedCount) {
    batchSelectedCount.textContent = `${selectedEntryIds.size} items selected`;
  }
}


if (batchDeleteBtn) {
  batchDeleteBtn.addEventListener("click", () => {
    if (selectedEntryIds.size === 0) return;
    const backupEntries = [...entries];
    const removedCount = selectedEntryIds.size;
    entries = entries.filter((e) => !selectedEntryIds.has(e.id));
    saveEntries(entries);
    isBatchMode = false;
    selectedEntryIds.clear();
    if (batchActionsBar) batchActionsBar.hidden = true;
    if (batchToggleBtn) batchToggleBtn.textContent = "Batch Select";
    renderApp();

    showToast(`Deleted ${removedCount} items`, () => {
      entries = backupEntries;
      saveEntries(entries);
      renderApp();
    });
  });
}

if (clearDayBtn) {
  clearDayBtn.addEventListener("click", () => {
    if (entries.length === 0) return;
    const backupEntries = [...entries];
    entries = [];
    saveEntries(entries);
    renderApp();

    showToast("Cleared all entries for today", () => {
      entries = backupEntries;
      saveEntries(entries);
      renderApp();
    });
  });
}

if (startDaySelect) {
  const currentSettings = loadSettings();
  startDaySelect.value = String(currentSettings.weekStartDay);
  startDaySelect.addEventListener("change", (e) => {
    saveSettings({ weekStartDay: Number(e.target.value) });
    renderAnalytics(entries);
  });
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

    if (isBatchMode) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "log-checkbox";
      checkbox.checked = selectedEntryIds.has(entry.id);
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          selectedEntryIds.add(entry.id);
        } else {
          selectedEntryIds.delete(entry.id);
        }
        updateBatchCount();
      });
      li.appendChild(checkbox);
    }

    const main = document.createElement("div");
    main.className = "entry-main";
    main.style.cursor = "pointer";
    main.addEventListener("click", () => {
      if (!isBatchMode && modalControllers) modalControllers.openEditEntryModal(entry.id);
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

    if (!isBatchMode) {
      const favs = loadFavorites();
      const isFav = favs.some((f) => f.description === entry.description);

      const starBtn = document.createElement("button");
      starBtn.className = `neu-action-btn ${isFav ? "is-fav" : ""}`;
      starBtn.setAttribute("aria-label", "Toggle favorite");
      starBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="${isFav ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      `;
      starBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavoriteEntry(entry);
        renderApp();
      });

      const editBtn = document.createElement("button");
      editBtn.className = "neu-action-btn";
      editBtn.setAttribute("aria-label", "Edit entry");
      editBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      `;
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (modalControllers) modalControllers.openEditEntryModal(entry.id);
      });

      const removeBtn = document.createElement("button");
      removeBtn.className = "neu-action-btn remove-action-btn";
      removeBtn.setAttribute("aria-label", "Remove entry");
      removeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      `;
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeEntry(entry.id);
      });

      rightGroup.appendChild(cals);
      rightGroup.appendChild(starBtn);
      rightGroup.appendChild(editBtn);
      rightGroup.appendChild(removeBtn);
    } else {
      rightGroup.appendChild(cals);
    }

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
    body: viewBody,
    swap: viewSwap,
    settings: viewSettings,
  };
  const btns = {
    today: navTodayBtn,
    log: navLogBtn,
    analytics: navAnalyticsBtn,
    body: navBodyBtn,
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
if (navBodyBtn) navBodyBtn.addEventListener("click", () => switchNavTab("body"));
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

// Today View Mode Toggle: Daily vs Weekly
const todayModeDailyBtn = document.getElementById("today-mode-daily");
const todayModeWeeklyBtn = document.getElementById("today-mode-weekly");
const todayDailyContainer = document.getElementById("today-daily-container");
const todayWeeklyContainer = document.getElementById("today-weekly-container");

if (todayModeDailyBtn && todayModeWeeklyBtn) {
  todayModeDailyBtn.addEventListener("click", () => {
    todayModeDailyBtn.classList.add("active");
    todayModeWeeklyBtn.classList.remove("active");
    if (todayDailyContainer) todayDailyContainer.hidden = false;
    if (todayWeeklyContainer) todayWeeklyContainer.hidden = true;
  });

  todayModeWeeklyBtn.addEventListener("click", () => {
    todayModeWeeklyBtn.classList.add("active");
    todayModeDailyBtn.classList.remove("active");
    if (todayDailyContainer) todayDailyContainer.hidden = true;
    if (todayWeeklyContainer) todayWeeklyContainer.hidden = false;
    renderAnalytics(entries);
  });
}

// Module Initializations
initTheme();
initBodyProfile(renderGoal, renderApp);
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
