/* Analytics & Past History Module */
import { computeTotals, round, loadGoal, saveGoal, dateKey, loadEntriesForKey, LOG_KEY_PREFIX, todayKey, loadSettings } from "./storage.js";
import { calculateAdaptiveTDEE } from "./body-profile.js";

let historyWeekOffset = 0; // 0 = Current Week, 1 = Previous Week, etc.
let selectedDayInWeek = 6; // 0..6 index within the displayed 7-day week (6 = default to rightmost day)

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

export function renderAnalytics(entries) {
  renderWeeklyBudget();

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
  const selectedDayTitle = document.getElementById("analytics-selected-day-title");
  const selectedDayEntriesList = document.getElementById("analytics-selected-day-entries");
  const copySelectedDayBtn = document.getElementById("copy-selected-day-btn");

  const prevWeekBtn = document.getElementById("history-prev-week-btn");
  const nextWeekBtn = document.getElementById("history-next-week-btn");
  const weekRangeLabel = document.getElementById("history-week-range-label");

  if (prevWeekBtn) {
    prevWeekBtn.onclick = () => {
      historyWeekOffset++;
      renderAnalytics(entries);
    };
  }
  if (nextWeekBtn) {
    nextWeekBtn.disabled = historyWeekOffset <= 0;
    nextWeekBtn.onclick = () => {
      if (historyWeekOffset > 0) {
        historyWeekOffset--;
        renderAnalytics(entries);
      }
    };
  }

  const today = new Date();
  const daysWindowEnd = new Date(today);
  daysWindowEnd.setDate(today.getDate() - historyWeekOffset * 7);

  if (weekRangeLabel) {
    if (historyWeekOffset === 0) {
      weekRangeLabel.textContent = "This Week";
    } else if (historyWeekOffset === 1) {
      weekRangeLabel.textContent = "Last Week";
    } else {
      weekRangeLabel.textContent = `${historyWeekOffset} Weeks Ago`;
    }
  }

  const days7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(daysWindowEnd);
    d.setDate(daysWindowEnd.getDate() - i);
    days7.push(d);
  }

  const selectedDate = days7[selectedDayInWeek] || days7[6];
  const selectedKey = dateKey(selectedDate);
  const isSelectedToday = selectedDate.toDateString() === today.toDateString();
  const selectedEntries = isSelectedToday ? entries : loadEntriesForKey(selectedKey);

  if (selectedDayTitle) {
    selectedDayTitle.textContent = isSelectedToday
      ? "Today's Macro Breakdown"
      : `${selectedDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} Breakdown`;
  }

  if (copySelectedDayBtn) {
    copySelectedDayBtn.onclick = () => {
      if (selectedEntries.length === 0) {
        alert("No entries to copy for this day.");
        return;
      }
      const currentTodayEntries = loadEntriesForKey(todayKey());
      const cloned = selectedEntries.map((item) => ({ ...item, id: crypto.randomUUID() }));
      localStorage.setItem(todayKey(), JSON.stringify([...currentTodayEntries, ...cloned]));
      alert(`Copied ${selectedEntries.length} items to Today's log!`);
      window.location.reload();
    };
  }

  const totals = computeTotals(selectedEntries);
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

  // Selected Day Items List
  if (selectedDayEntriesList) {
    selectedDayEntriesList.innerHTML = "";
    if (selectedEntries.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "empty-state";
      emptyLi.style.padding = "12px";
      emptyLi.textContent = "No logged items for this date.";
      selectedDayEntriesList.appendChild(emptyLi);
    } else {
      [...selectedEntries].reverse().forEach((entry) => {
        const li = document.createElement("li");
        li.className = "history-entry";
        li.style.padding = "6px 0";

        const desc = document.createElement("span");
        desc.className = "history-entry-desc";
        desc.textContent = entry.description;

        const cals = document.createElement("span");
        cals.className = "history-entry-cals";
        cals.textContent = `${Math.round(entry.calories)} kcal`;

        li.appendChild(desc);
        li.appendChild(cals);
        selectedDayEntriesList.appendChild(li);
      });
    }
  }

  // Interactive 7-day macro-stacked trend chart
  if (!weeklyChart) return;
  weeklyChart.innerHTML = "";
  const goal = loadGoal();
  const goalCals = goal.calories || 2000;

  days7.forEach((d, index) => {
    const k = dateKey(d);
    const isToday = d.toDateString() === today.toDateString();
    const items = isToday ? entries : loadEntriesForKey(k);
    const dayTotals = computeTotals(items);
    const cals = Math.round(dayTotals.calories);

    const heightPct = Math.min(100, Math.round((cals / (goalCals * 1.3)) * 100));

    const barCol = document.createElement("div");
    barCol.className = "bar-col";

    const valLabel = document.createElement("span");
    valLabel.className = "bar-col-val";
    valLabel.textContent = cals > 0 ? cals : "";

    const fill = document.createElement("div");
    fill.className = `bar-col-fill ${index === selectedDayInWeek ? "active-day" : ""}`;
    fill.style.height = `${Math.max(6, heightPct)}%`;

    const dayMacroGrams = dayTotals.protein + dayTotals.carbs + dayTotals.fat;
    if (dayMacroGrams > 0) {
      const pSegment = document.createElement("div");
      pSegment.className = "macro-stack-p";
      pSegment.style.height = `${(dayTotals.protein / dayMacroGrams) * 100}%`;

      const cSegment = document.createElement("div");
      cSegment.className = "macro-stack-c";
      cSegment.style.height = `${(dayTotals.carbs / dayMacroGrams) * 100}%`;

      const fSegment = document.createElement("div");
      fSegment.className = "macro-stack-f";
      fSegment.style.height = `${(dayTotals.fat / dayMacroGrams) * 100}%`;

      fill.appendChild(pSegment);
      fill.appendChild(cSegment);
      fill.appendChild(fSegment);
    }

    fill.addEventListener("click", () => {
      selectedDayInWeek = index;
      renderAnalytics(entries);
    });

    const dayName = d.toLocaleDateString(undefined, { weekday: "short" });
    const dayLabel = document.createElement("span");
    dayLabel.className = "bar-col-label";
    dayLabel.textContent = isToday ? "Today" : dayName;

    barCol.appendChild(valLabel);
    barCol.appendChild(fill);
    barCol.appendChild(dayLabel);
    weeklyChart.appendChild(barCol);
  });
}

export function renderHistory() {
  // History is now dynamically navigated inside the sliding Macro Trends & History card
}
