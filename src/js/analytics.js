/* Analytics & Past History Module */
import { computeTotals, round, loadGoal, saveGoal, dateKey, loadEntriesForKey, LOG_KEY_PREFIX, todayKey, loadSettings, saveEntries } from "./storage.js";
import { showToast } from "./main.js";
import { calculateAdaptiveTDEE } from "./body-profile.js";

let historyWeekOffset = 0; // 0 = Current Week, 1 = Previous Week, etc.
let selectedDayInWeek = 6; // 0..6 index within the displayed 7-day week (6 = default to rightmost day)

export function renderWeeklyBudget() {
  const weeklyCalsConsumedEl = document.getElementById("weekly-cals-consumed");
  const weeklyCalsBudgetEl = document.getElementById("weekly-cals-budget");
  const weeklyCalsRemainingEl = document.getElementById("weekly-cals-remaining");
  const weeklyRolloverStatus = document.getElementById("weekly-rollover-status");
  const weeklySubtitle = document.getElementById("weekly-budget-range-subtitle");
  const weeklyBudgetBadge = document.getElementById("weekly-budget-badge");

  const ringViewBtn = document.getElementById("weekly-view-mode-ring");
  const paceViewBtn = document.getElementById("weekly-view-mode-pace");
  const ringContainer = document.getElementById("weekly-ring-container");
  const paceContainer = document.getElementById("weekly-pace-container");

  const settings = loadSettings();
  const goal = loadGoal();
  const dailyGoal = goal.calories || 2000;
  const weeklyBudget = dailyGoal * 7;

  if (weeklyBudgetBadge) {
    const isAdaptive = localStorage.getItem("kcal-tdee-mode") === "adaptive";
    weeklyBudgetBadge.textContent = isAdaptive ? "Adaptive TDEE" : "Standard TDEE";
  }

  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon ...
  const startDay = settings.weekStartDay; // 1 = Mon, 0 = Sun

  let daysSinceStart = currentDayOfWeek - startDay;
  if (daysSinceStart < 0) daysSinceStart += 7;

  const weekStartDate = new Date(today);
  weekStartDate.setDate(today.getDate() - daysSinceStart);

  let weekConsumed = 0;
  const daysData = [];
  const cumulativeConsumed = [];

  let runningTotal = 0;
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
      runningTotal += dayCals;
      cumulativeConsumed.push({ dayIndex: i, total: runningTotal, date: d, dayCals });
    }

    daysData.push({ date: d, calories: dayCals, isToday: d.toDateString() === today.toDateString(), isPastOrToday });
  }

  const remainingWeekly = weeklyBudget - weekConsumed;
  const remainingDays = 7 - daysSinceStart;

  // Render Stat Summary Numbers
  if (weeklyCalsConsumedEl) weeklyCalsConsumedEl.textContent = weekConsumed.toLocaleString();
  if (weeklyCalsBudgetEl) weeklyCalsBudgetEl.textContent = weeklyBudget.toLocaleString();
  if (weeklyCalsRemainingEl) {
    weeklyCalsRemainingEl.textContent = remainingWeekly.toLocaleString();
    weeklyCalsRemainingEl.style.color = remainingWeekly < 0 ? "var(--color-over, #ff453a)" : "var(--color-primary, #007aff)";
  }

  if (weeklySubtitle) {
    const endDate = new Date(weekStartDate);
    endDate.setDate(weekStartDate.getDate() + 6);
    const opt = { month: "short", day: "numeric" };
    weeklySubtitle.textContent = `${weekStartDate.toLocaleDateString(undefined, opt)} - ${endDate.toLocaleDateString(undefined, opt)}`;
  }

  // OPTION 1: Radial Ring Progress & Center Gauge
  const ringCircle = document.getElementById("radial-ring-circle");
  const ringVal = document.getElementById("radial-center-val");
  const ringUnit = document.getElementById("radial-center-unit");
  const ringPct = document.getElementById("radial-center-pct");
  const ringDailyAvg = document.getElementById("radial-center-daily-avg");

  if (ringCircle && ringVal && ringUnit && ringPct) {
    const r = 80;
    const circumference = 2 * Math.PI * r; // ~502.65
    const ratio = Math.min(1.0, Math.max(0, weekConsumed / weeklyBudget));
    const offset = circumference * (1 - ratio);

    ringCircle.setAttribute("stroke-dasharray", `${circumference.toFixed(2)}`);
    ringCircle.style.strokeDasharray = `${circumference.toFixed(2)}`;
    ringCircle.style.strokeDashoffset = `${offset.toFixed(2)}`;
    ringCircle.classList.toggle("over", weekConsumed > weeklyBudget);

    ringVal.textContent = Math.abs(remainingWeekly).toLocaleString();
    ringUnit.textContent = remainingWeekly >= 0 ? "kcal left" : "kcal over budget";

    const usedPct = Math.round((weekConsumed / weeklyBudget) * 100);
    ringPct.textContent = `${usedPct}% used`;
    ringPct.style.color = weekConsumed > weeklyBudget ? "var(--color-over, #ff453a)" : "var(--accent, #007aff)";

    if (ringDailyAvg) {
      const activeDaysSoFar = Math.max(1, daysSinceStart + 1);
      const currentAvg = Math.round(weekConsumed / activeDaysSoFar);
      ringDailyAvg.textContent = `${currentAvg.toLocaleString()} kcal/d avg`;
    }
  }

  // OPTION 2: Cumulative Burn-Up / Pace Line Chart
  renderCumulativePaceChart(daysData, cumulativeConsumed, weeklyBudget, dailyGoal);

  // Chart Toggle Switch Handling
  const savedViewMode = localStorage.getItem("kcal-weekly-chart-view") || "ring";
  if (savedViewMode === "pace") {
    if (ringViewBtn) ringViewBtn.classList.remove("active");
    if (paceViewBtn) paceViewBtn.classList.add("active");
    if (ringContainer) ringContainer.hidden = true;
    if (paceContainer) paceContainer.hidden = false;
  } else {
    if (ringViewBtn) ringViewBtn.classList.add("active");
    if (paceViewBtn) paceViewBtn.classList.remove("active");
    if (ringContainer) ringContainer.hidden = false;
    if (paceContainer) paceContainer.hidden = true;
  }

  if (ringViewBtn && paceViewBtn) {
    ringViewBtn.onclick = () => {
      ringViewBtn.classList.add("active");
      paceViewBtn.classList.remove("active");
      if (ringContainer) ringContainer.hidden = false;
      if (paceContainer) paceContainer.hidden = true;
      localStorage.setItem("kcal-weekly-chart-view", "ring");
    };
    paceViewBtn.onclick = () => {
      paceViewBtn.classList.add("active");
      ringViewBtn.classList.remove("active");
      if (ringContainer) ringContainer.hidden = true;
      if (paceContainer) paceContainer.hidden = false;
      localStorage.setItem("kcal-weekly-chart-view", "pace");
    };
  }

  if (weeklyRolloverStatus) {
    weeklyRolloverStatus.innerHTML = "";
    weeklyRolloverStatus.hidden = true;
  }
}

function renderCumulativePaceChart(daysData, cumulativeConsumed, weeklyBudget, dailyGoal) {
  const paceBox = document.getElementById("pace-chart-box");
  if (!paceBox) return;

  const w = 320;
  const h = 180;
  const padL = 35;
  const padR = 20;
  const padT = 20;
  const padB = 30;

  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const maxVal = Math.max(weeklyBudget, ...cumulativeConsumed.map((c) => c.total), 100);

  const getX = (index) => padL + (index / 6) * chartW;
  const getY = (val) => padT + chartH - (val / maxVal) * chartH;

  // Target pace line points
  const targetStart = { x: getX(0), y: getY(dailyGoal) };
  const targetEnd = { x: getX(6), y: getY(weeklyBudget) };

  // Actual curve points
  const actualPoints = cumulativeConsumed.map((c) => ({
    x: getX(c.dayIndex),
    y: getY(c.total),
    val: c.total,
    dayName: c.date.toLocaleDateString(undefined, { weekday: "short" }),
  }));

  let actualPathD = "";
  let areaPathD = "";

  if (actualPoints.length > 0) {
    actualPathD = `M ${actualPoints[0].x} ${actualPoints[0].y}`;
    for (let i = 1; i < actualPoints.length; i++) {
      actualPathD += ` L ${actualPoints[i].x} ${actualPoints[i].y}`;
    }

    const lastPt = actualPoints[actualPoints.length - 1];
    areaPathD = `${actualPathD} L ${lastPt.x} ${padT + chartH} L ${actualPoints[0].x} ${padT + chartH} Z`;
  }

  const isOver = cumulativeConsumed.length > 0 && cumulativeConsumed[cumulativeConsumed.length - 1].total > (cumulativeConsumed.length * dailyGoal);

  paceBox.innerHTML = `
    <svg class="pace-chart-svg" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="pace-area-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${isOver ? "var(--color-over, #ff453a)" : "var(--accent, #007aff)"}" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="${isOver ? "var(--color-over, #ff453a)" : "var(--accent, #007aff)"}" stop-opacity="0.0"/>
        </linearGradient>
      </defs>

      <!-- Horizontal Grid Lines -->
      <line x1="${padL}" y1="${getY(weeklyBudget / 2)}" x2="${w - padR}" y2="${getY(weeklyBudget / 2)}" class="grid-line" />
      <line x1="${padL}" y1="${getY(weeklyBudget)}" x2="${w - padR}" y2="${getY(weeklyBudget)}" class="grid-line" />

      <!-- Y Axis Labels -->
      <text x="${padL - 6}" y="${getY(weeklyBudget) + 4}" class="axis-label" text-anchor="end">${Math.round(weeklyBudget / 1000)}k</text>
      <text x="${padL - 6}" y="${getY(weeklyBudget / 2) + 4}" class="axis-label" text-anchor="end">${Math.round(weeklyBudget / 2000)}k</text>

      <!-- Target Pace Line (Dotted Reference) -->
      <line x1="${targetStart.x}" y1="${targetStart.y}" x2="${targetEnd.x}" y2="${targetEnd.y}" class="target-line" />

      <!-- Actual Area Fill & Line -->
      ${areaPathD ? `<path d="${areaPathD}" class="actual-area" />` : ""}
      ${actualPathD ? `<path d="${actualPathD}" class="actual-line ${isOver ? "over" : ""}" />` : ""}

      <!-- Data Points -->
      ${actualPoints
        .map(
          (p) => `<circle cx="${p.x}" cy="${p.y}" r="4" class="dot" style="stroke:${isOver ? "var(--color-over, #ff453a)" : "var(--accent, #007aff)"}" />`
        )
        .join("")}

      <!-- Day Labels on X Axis -->
      ${daysData
        .map((d, i) => {
          const x = getX(i);
          const name = d.isToday ? "Today" : d.date.toLocaleDateString(undefined, { weekday: "narrow" });
          return `<text x="${x}" y="${h - 8}" class="axis-label">${name}</text>`;
        })
        .join("")}
    </svg>
  `;
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
        showToast("No entries to copy for this day.");
        return;
      }
      const currentTodayEntries = loadEntriesForKey(todayKey());
      const cloned = selectedEntries.map((item) => ({ ...item, id: crypto.randomUUID() }));
      saveEntries([...currentTodayEntries, ...cloned]);
      window.dispatchEvent(new CustomEvent("kcal-entry-added"));
      showToast(`Copied ${selectedEntries.length} items to Today's log!`);
    };
  }

  const totals = computeTotals(selectedEntries);
  const totalMacroGrams = totals.protein + totals.carbs + totals.fat;

  if (selectedDayTitle) {
    selectedDayTitle.textContent = isSelectedToday ? "Today's Macro Breakdown" : `${selectedDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} Breakdown`;
  }

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
        li.style.display = "flex";
        li.style.alignItems = "center";
        li.style.gap = "10px";
        li.style.padding = "6px 0";

        const copyBtn = document.createElement("button");
        copyBtn.className = "fav-log-btn";
        copyBtn.setAttribute("aria-label", "Copy entry to Today's log");
        copyBtn.title = "Copy to Today's log";
        copyBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        `;

        copyBtn.addEventListener("click", () => {
          const currentTodayEntries = loadEntriesForKey(todayKey());
          const newEntry = {
            ...entry,
            id: crypto.randomUUID(),
          };
          saveEntries([...currentTodayEntries, newEntry]);
          window.dispatchEvent(new CustomEvent("kcal-entry-added"));
          showToast(`Copied "${entry.description}" (${Math.round(entry.calories)} kcal) to Today's log!`);
        });

        const desc = document.createElement("span");
        desc.className = "history-entry-desc";
        desc.style.flex = "1";
        desc.textContent = entry.description;

        const cals = document.createElement("span");
        cals.className = "history-entry-cals";
        cals.textContent = `${Math.round(entry.calories)} kcal`;

        li.appendChild(copyBtn);
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
