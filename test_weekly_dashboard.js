import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 } // iPhone 12/13/14 screen
  });
  const page = await context.newPage();

  // Load app
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);

  // Switch to Weekly Budget mode
  await page.click('#today-mode-weekly');
  await page.waitForTimeout(500);

  // Take screenshot of Option 1: Radial Ring
  await page.screenshot({ path: '/home/jules/verification/weekly_radial_ring.png', fullPage: false });

  // Toggle to Option 2: Cumulative Pace
  await page.click('#weekly-view-mode-pace');
  await page.waitForTimeout(500);

  // Take screenshot of Option 2: Cumulative Pace
  await page.screenshot({ path: '/home/jules/verification/weekly_cumulative_pace.png', fullPage: false });

  await browser.close();
  console.log('Screenshots taken successfully!');
})();
