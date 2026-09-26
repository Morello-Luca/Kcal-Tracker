import { JSDOM } from "jsdom";

const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <body>
      <div id="weight-history-pills"></div>
      <div id="weight-svg-wrapper"></div>
      <div id="body-weight-trend-badge"></div>
    </body>
  </html>
`);

global.window = dom.window;
global.document = dom.window.document;
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
};

// Test weight chart rendering with dummy weight data
const mockWeights = [
  { date: new Date("2026-09-01"), weight: 75.2 },
  { date: new Date("2026-09-02"), weight: 75.8 },
  { date: new Date("2026-09-03"), weight: 74.9 },
  { date: new Date("2026-09-04"), weight: 75.1 },
  { date: new Date("2026-09-05"), weight: 74.5 },
];

localStorage.getItem = (key) => {
  if (key === "kcal-weight-logs") {
    const logs = {};
    mockWeights.forEach(w => {
      logs[w.date.toISOString().split("T")[0]] = w.weight;
    });
    return JSON.stringify(logs);
  }
  return null;
};

import { getAllWeightLogs } from "./src/js/body-profile.js";

console.log("Weight logs count:", getAllWeightLogs().length);
