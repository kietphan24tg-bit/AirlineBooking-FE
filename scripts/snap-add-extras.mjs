import { chromium } from 'playwright';

const url = 'http://localhost:5174/manage-booking?mockManageBooking=1';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const errors = [];
page.on('pageerror', (err) => errors.push(`PAGE ERROR: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`);
});

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('text=Manage booking', { timeout: 15000 }).catch(() => null);
await page.waitForTimeout(800);

// Click "Add extras"
const addExtras = page.getByText('Add extras', { exact: false }).first();
await addExtras.waitFor({ timeout: 10000 });
await addExtras.click();

await page.waitForURL('**/manage-booking/add-services**', { timeout: 10000 });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1500);

// Snapshot 1: initial state
await page.screenshot({
  path: 'playwright-artifacts/add-extras-1-initial.png',
  fullPage: false,
});

// Click an Extra 25 kg option
const extra25 = page.getByText('Extra 25 kg').first();
await extra25.click().catch(() => null);
await page.waitForTimeout(500);

await page.screenshot({
  path: 'playwright-artifacts/add-extras-2-baggage-selected.png',
  fullPage: false,
});

// Switch to Pre-order meal
const mealTab = page.getByText('Pre-order meal').first();
await mealTab.click().catch(() => null);
await page.waitForTimeout(500);

const vegetarian = page.getByText('Vegetarian platter').first();
await vegetarian.click().catch(() => null);
await page.waitForTimeout(500);

await page.screenshot({
  path: 'playwright-artifacts/add-extras-3-meal-selected.png',
  fullPage: true,
});

// Switch to second passenger
const tranThiB = page.getByText('TRAN THI B', { exact: false }).first();
await tranThiB.click().catch(() => null);
await page.waitForTimeout(500);

await page.screenshot({
  path: 'playwright-artifacts/add-extras-4-second-passenger.png',
  fullPage: true,
});

// Switch to Return flight
const returnFlight = page.getByText('HAN → SGN').first();
await returnFlight.click().catch(() => null);
await page.waitForTimeout(700);

await page.screenshot({
  path: 'playwright-artifacts/add-extras-5-return-flight.png',
  fullPage: true,
});

if (errors.length > 0) {
  console.error('--- Errors ---');
  for (const error of errors) console.error(error);
} else {
  console.log('No console/page errors.');
}

console.log('OK saved 5 screenshots');
await browser.close();
