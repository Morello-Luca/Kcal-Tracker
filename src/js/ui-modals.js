/* UI Modals & Quick Action Form Module */
import { loadFavorites, saveFavorites, round, saveEntries } from "./storage.js";
import { showToast } from "./main.js";
import { getVerifiedFood100g, calculateMacrosForWeight, parseAndSumVerifiedMeal } from "./verified-db.js";

export function initUIModals(entries, addEntryFromResult, renderApp, switchNavTab) {
  // Manual Quick Add Elements
  const manualAddBtn = document.getElementById("manual-add-btn");
  const manualAddModal = document.getElementById("manual-add-modal");
  const manualAddClose = document.getElementById("manual-add-close");
  const manualModalTitle = document.getElementById("manual-modal-title");
  const manualSubmitBtn = document.getElementById("manual-submit-btn");
  const manualAddForm = document.getElementById("manual-add-form");
  const manualDescInput = document.getElementById("manual-desc");
  const manualCaloriesInput = document.getElementById("manual-calories");
  const manualProteinInput = document.getElementById("manual-protein");
  const manualCarbsInput = document.getElementById("manual-carbs");
  const manualFatInput = document.getElementById("manual-fat");
  const manualCancelBtn = document.getElementById("manual-cancel-btn");
  let manualModalMode = "log";

  // Edit Entry Elements
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

  // Quantity Adjust Modal Elements
  const quantityModal = document.getElementById("quantity-adjust-modal");
  const quantityCloseBtn = document.getElementById("quantity-modal-close");
  const quantityCancelBtn = document.getElementById("quantity-cancel-btn");
  const quantityForm = document.getElementById("quantity-adjust-form");
  const quantityTitleEl = document.getElementById("quantity-modal-title");
  const quantitySourceEl = document.getElementById("quantity-modal-source");
  const quantityUnitLabel = document.getElementById("quantity-unit-label");
  const quantityAmountInput = document.getElementById("quantity-amount-input");

  const quantityCalsVal = document.getElementById("quantity-cals-val");
  const quantityProteinVal = document.getElementById("quantity-protein-val");
  const quantityCarbsVal = document.getElementById("quantity-carbs-val");
  const quantityFatVal = document.getElementById("quantity-fat-val");

  let activeVerifiedItem = null;

  function openQuantityAdjustModal(verifiedItem, initialGrams = 100) {
    if (!quantityModal || !verifiedItem) return;
    activeVerifiedItem = verifiedItem;

    if (quantityTitleEl) quantityTitleEl.textContent = verifiedItem.name;
    if (quantitySourceEl) quantitySourceEl.textContent = `Verified Source: ${verifiedItem.source || "Official DB"} (100${verifiedItem.unit || "g"} baseline)`;
    if (quantityUnitLabel) quantityUnitLabel.textContent = verifiedItem.unit || "g";
    if (quantityAmountInput) quantityAmountInput.value = initialGrams;

    updateQuantityPreview(initialGrams);
    quantityModal.hidden = false;
    if (quantityAmountInput) quantityAmountInput.focus();
  }

  function closeQuantityAdjustModal() {
    activeVerifiedItem = null;
    if (quantityModal) quantityModal.hidden = true;
  }

  function updateQuantityPreview(grams) {
    if (!activeVerifiedItem) return;
    const calc = calculateMacrosForWeight(activeVerifiedItem, grams);
    if (quantityCalsVal) quantityCalsVal.textContent = Math.round(calc.calories);
    if (quantityProteinVal) quantityProteinVal.textContent = `${calc.protein_g}g`;
    if (quantityCarbsVal) quantityCarbsVal.textContent = `${calc.carbs_g}g`;
    if (quantityFatVal) quantityFatVal.textContent = `${calc.fat_g}g`;
  }

  if (quantityAmountInput) {
    quantityAmountInput.addEventListener("input", (e) => {
      const g = Number(e.target.value) || 0;
      updateQuantityPreview(g);
    });
  }

  if (quantityCloseBtn) quantityCloseBtn.addEventListener("click", closeQuantityAdjustModal);
  if (quantityCancelBtn) quantityCancelBtn.addEventListener("click", closeQuantityAdjustModal);

  if (quantityForm) {
    quantityForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!activeVerifiedItem) return;

      const grams = Number(quantityAmountInput.value) || 100;
      const calc = calculateMacrosForWeight(activeVerifiedItem, grams);

      const description = `${activeVerifiedItem.name} (${grams}${activeVerifiedItem.unit || "g"}) [Verified DB]`;
      addEntryFromResult(description, {
        calories: calc.calories,
        protein_g: calc.protein_g,
        carbs_g: calc.carbs_g,
        fat_g: calc.fat_g,
      });

      showToast(`Logged "${description}" (${Math.round(calc.calories)} kcal)`);
      closeQuantityAdjustModal();
      if (typeof switchNavTab === "function") switchNavTab("today");
    });
  }

  // Swap Suggestion Elements
  const swapForm = document.getElementById("swap-form");
  const swapInput = document.getElementById("swap-input");
  const swapButton = document.getElementById("swap-button");
  const swapStatusEl = document.getElementById("swap-status");
  const swapResultEl = document.getElementById("swap-result");

  function openManualAddModal(mode = "log") {
    if (!manualAddModal) return;
    manualModalMode = mode;
    if (manualModalTitle) manualModalTitle.textContent = mode === "favorite" ? "Add New Favorite" : "Manual Quick-Add";
    if (manualSubmitBtn) manualSubmitBtn.textContent = mode === "favorite" ? "Save Favorite" : "Save to Log";

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

  if (manualAddBtn) manualAddBtn.addEventListener("click", () => openManualAddModal("log"));
  if (manualAddClose) manualAddClose.addEventListener("click", closeManualAddModal);
  if (manualCancelBtn) manualCancelBtn.addEventListener("click", closeManualAddModal);

  // Live verified food lookup on manual modal description input
  if (manualDescInput) {
    let debounceTimer = null;
    manualDescInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      if (!val) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const verifiedMeal = await parseAndSumVerifiedMeal(val);
        if (verifiedMeal) {
          if (manualCaloriesInput) manualCaloriesInput.value = verifiedMeal.calories;
          if (manualProteinInput) manualProteinInput.value = verifiedMeal.protein_g;
          if (manualCarbsInput) manualCarbsInput.value = verifiedMeal.carbs_g;
          if (manualFatInput) manualFatInput.value = verifiedMeal.fat_g;
        }
      }, 250);
    });
  }

  if (manualAddForm) {
    manualAddForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const description = manualDescInput.value.trim();
      if (!description) return;

      const item = {
        description,
        calories: Number(manualCaloriesInput.value) || 0,
        protein_g: Number(manualProteinInput.value) || 0,
        carbs_g: Number(manualCarbsInput.value) || 0,
        fat_g: Number(manualFatInput.value) || 0,
      };

      if (manualModalMode === "favorite") {
        const currentFavs = loadFavorites();
        currentFavs.push(item);
        saveFavorites(currentFavs);
        renderApp();
        showToast(`Saved "${description}" to Favorites`);
      } else {
        addEntryFromResult(description, item);
        showToast(`Logged "${description}" (${Math.round(item.calories)} kcal)`);
        switchNavTab("today");
      }
      closeManualAddModal();
    });
  }

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
        renderApp();
      }
      closeEditEntryModal();
    });
  }

  if (swapForm) {
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
  }

  return { openEditEntryModal, openManualAddModal, openQuantityAdjustModal };
}
