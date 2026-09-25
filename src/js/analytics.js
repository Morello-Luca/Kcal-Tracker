/* Analytics & Past History Module */
import { computeTotals, round, loadGoal, saveGoal, dateKey, loadEntriesForKey, LOG_KEY_PREFIX, todayKey, loadSettings } from "./storage.js";
import { calculateAdaptiveTDEE } from "./body-profile.js";

export function renderWeeklyBudget() {
  const weeklyCalsConsumedEl = document.getElementById("weekly-cals-consumed");
  const weeklyCalsBudgetEl = document.getElementById("weekly-cals-budget");
  const weeklyCalsRemainingEl = document.getElementById("weekly-cals-remaining");
  const weeklyBudgetBarFill = document.getElementById("weekly-budget-bar-fill");
  const weeklyRolloverStatus = document.getElementById("weekly-rollover-status");
  const weeklySubtitle = document.getElementById("weekly-budget-range-subtitle");
  const flexibleWeeklyChart = document.getElementById("flexible-weekly-chart");

  const settings = loadSettings();
  const goal = loadGoal();
  const dailyGoal = goal.calories || 2000;
  const weeklyBudget = dailyGoal * 7;

  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon ...
  const startDay = settings.weekStartDay; // 1 = Mon, 0 = Sun

  let daysSinceStart = currentDayOfWeek - startDay;
  if (daysSinceStart < 0) daysSinceStart += 7;

  const weekStartDate = new Date(today);
  weekStartDate.setDate(today.getDate() - daysSinceStart);

  let weekConsumed = 0;
  const daysData = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);
    const k = dateKey(d);
    const dayEntries = loadEntriesForKey(k);
    const dayTotals = computeTotals(dayEntries);
    const dayCals = Math.round(dayTotals.calories);

    const isPastOrToday = d <= today || d.toDateString() === today.toDateString();
    if (isPastOrToday) {
      weekConsumed += dayCals;
    }

    daysData.push({ date: d, calories: dayCals, isToday: d.toDateString() === today.toDateString(), isPastOrToday });
  }

  const remainingWeekly = weeklyBudget - weekConsumed;
  const remainingDays = 7 - daysSinceStart;

  if (weeklyCalsConsumedEl) weeklyCalsConsumedEl.textContent = `${weekConsumed} kcal`;
  if (weeklyCalsBudgetEl) weeklyCalsBudgetEl.textContent = `${weeklyBudget} kcal`;
  if (weeklyCalsRemainingEl) {
    weeklyCalsRemainingEl.textContent = `${remainingWeekly} kcal`;
    weeklyCalsRemainingEl.style.color = remainingWeekly < 0 ? "var(--color-over, #ff453a)" : "var(--color-primary, #007aff)";
  }

  if (weeklyBudgetBarFill) {
    const pct = Math.min(100, (weekConsumed / weeklyBudget) * 100);
    weeklyBudgetBarFill.style.width = `${pct}%`;
    weeklyBudgetBarFill.classList.toggle("over", weekConsumed > weeklyBudget);
  }

  if (weeklySubtitle) {
    const endDate = new Date(weekStartDate);
    endDate.setDate(weekStartDate.getDate() + 6);
    const opt = { month: "short", day: "numeric" };
    weeklySubtitle.textContent = `${weekStartDate.toLocaleDateString(undefined, opt)} - ${endDate.toLocaleDateString(undefined, opt)}`;
  }

  if (weeklyRolloverStatus) {
    const pastDaysCount = daysSinceStart;
    const expectedPaceSoFar = pastDaysCount * dailyGoal;
    const rolloverAmount = expectedPaceSoFar - (weekConsumed - (daysData.find((d) => d.isToday)?.calories || 0));

    if (rolloverAmount > 0) {
      const remainingDailyAvg = remainingDays > 0 ? Math.round(remainingWeekly / remainingDays) : dailyGoal;
      weeklyRolloverStatus.innerHTML = `<strong>✨ ${rolloverAmount} kcal saved so far!</strong><p>Rolled over to remaining ${remainingDays} day(s). Adjusted target: <strong>${remainingDailyAvg} kcal/day</strong>.</p>`;
    } else if (rolloverAmount < 0) {
      const overBy = Math.abs(rolloverAmount);
      const remainingDailyAvg = remainingDays > 0 ? Math.max(0, Math.round(remainingWeekly / remainingDays)) : dailyGoal;
      weeklyRolloverStatus.innerHTML = `<strong>⚠️ ${overBy} kcal over baseline pace.</strong><p>To stay on weekly budget, target <strong>${remainingDailyAvg} kcal/day</strong> for remaining ${remainingDays} day(s).</p>`;
    } else {
      weeklyRolloverStatus.innerHTML = `<strong>🎯 Perfect daily pace!</strong><p>You are right on track with your ${dailyGoal} kcal/day budget.</p>`;
    }
  }

  if (flexibleWeeklyChart) {
    flexibleWeeklyChart.innerHTML = "";
    daysData.forEach((item) => {
      const heightPct = Math.min(100, Math.round((item.calories / (dailyGoal * 1.3)) * 100));
      const barCol = document.createElement("div");
      barCol.className = "bar-col";

      const valLabel = document.createElement("span");
      valLabel.className = "bar-col-val";
      valLabel.textContent = item.calories > 0 ? item.calories : "";

      const fill = document.createElement("div");
      fill.className = `bar-col-fill ${item.isToday ? "active-day" : ""} ${item.calories > dailyGoal ? "over-goal" : ""}`;
      fill.style.height = `${Math.max(4, heightPct)}%`;

      const dayName = item.date.toLocaleDateString(undefined, { weekday: "short" });
      const dayLabel = document.createElement("span");
      dayLabel.className = "bar-col-label";
      dayLabel.textContent = item.isToday ? "Today" : dayName;

      barCol.appendChild(valLabel);
      barCol.appendChild(fill);
      barCol.appendChild(dayLabel);
      flexibleWeeklyChart.appendChild(barCol);
    });
  }
}

export function renderAdaptiveTDEECard() {
  const adaptiveTdeeVal = document.getElementById("adaptive-tdee-val");
  const adaptiveTdeeSubtitle = document.getElementById("adaptive-tdee-subtitle");
  const applyAdaptiveTdeeBtn = document.getElementById("apply-adaptive-tdee-btn");

  const result = calculateAdaptiveTDEE();
  if (adaptiveTdeeVal) adaptiveTdeeVal.textContent = `${result.adaptiveTDEE} kcal`;

  if (adaptiveTdeeSubtitle) {
    if (result.isEstimate) {
      adaptiveTdeeSubtitle.textContent = `Formula baseline (Log ${3 - result.loggedDays} more days and 2 weight entries for dynamic TDEE)`;
    } else {
      adaptiveTdeeSubtitle.textContent = `Based on ${result.loggedDays} log days & ${result.weightChangeKg >= 0 ? "+" : ""}${result.weightChangeKg} kg weight trend`;
    }
  }

  if (applyAdaptiveTdeeBtn) {
    applyAdaptiveTdeeBtn.onclick = () => {
      const currentGoal = loadGoal();
      saveGoal({ ...currentGoal, calories: result.adaptiveTDEE });
      alert(`Daily Calorie Goal set to Adaptive TDEE: ${result.adaptiveTDEE} kcal!`);
      renderWeeklyBudget();
    };
  }
}

export function renderAnalytics(entries) {
  renderWeeklyBudget();
  renderAdaptiveTDEECard();

  const macroPartP = document.getElementById("macro-part-p");
  const macroPartC = document.getElementById("macro-part-c");
  const macroPartF = document.getElementById("macro-part-f");
  const legendPText = document.getElementById("legend-p-text");
  const legendCText = document.getElementById("legend-c-text");
  const legendFText = document.getElementById("legend-f-text");
  const analyticsProteinVal = document.getElementById("analytics-protein-val");
  const analyticsCarbsVal = document.getElementById("analytics-carbs-val");
  const analyticsFatVal = document.getElementById("analytics-fat-val");
  const weeklyChart = document.getElementById("weekly-chart");

  const totals = computeTotals(entries);
  const totalMacroGrams = totals.protein + totals.carbs + totals.fat;

  if (analyticsProteinVal) analyticsProteinVal.textContent = `${round(totals.protein)}g`;
  if (analyticsCarbsVal) analyticsCarbsVal.textContent = `${round(totals.carbs)}g`;
  if (analyticsFatVal) analyticsFatVal.textContent = `${round(totals.fat)}g`;

  if (totalMacroGrams > 0) {
    const pctP = Math.round((totals.protein / totalMacroGrams) * 100);
    const pctC = Math.round((totals.carbs / totalMacroGrams) * 100);
    const pctF = Math.round((totals.fat / totalMacroGrams) * 100);

    if (macroPartP) macroPartP.style.width = `${pctP}%`;
    if (macroPartC) macroPartC.style.width = `${pctC}%`;
    if (macroPartF) macroPartF.style.width = `${pctF}%`;

    if (legendPText) legendPText.textContent = `${pctP}%`;
    if (legendCText) legendCText.textContent = `${pctC}%`;
    if (legendFText) legendFText.textContent = `${pctF}%`;
  } else {
    if (macroPartP) macroPartP.style.width = "0%";
    if (macroPartC) macroPartC.style.width = "0%";
    if (macroPartF) macroPartF.style.width = "0%";
    if (legendPText) legendPText.textContent = "0%";
    if (legendCText) legendCText.textContent = "0%";
    if (legendFText) legendFText.textContent = "0%";
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

export function renderHistory() {
  const historyList = document.getElementById("history-list");
  if (!historyList) return;

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

    const rightSide = document.createElement("div");
    rightSide.className = "history-day-summary";
    rightSide.innerHTML = `<span class="history-day-cals">${Math.round(
      totals.calories
    )} kcal</span><span class="history-day-macros">P ${round(
      totals.protein
    )}g · C ${round(totals.carbs)}g · F ${round(totals.fat)}g</span><span class="history-chevron">›</span>`;

    header.appendChild(dateSpan);
    header.appendChild(rightSide);

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
