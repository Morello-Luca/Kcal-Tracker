/* Body Profile, BMR, and TDEE Calculator Module */
import { loadGoal, saveGoal } from "./storage.js";

const BODY_PROFILE_KEY = "kcal-body-profile";

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
      if (typeof renderGoal === "function") renderGoal();
      alert(`Daily Calorie Goal set to ${tdee} kcal based on your TDEE!`);
    });
  }

  renderBodyProfile();
}
