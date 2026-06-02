import { chromium } from 'playwright';
import fs from 'node:fs';

const FE_URL = 'http://localhost:5173';
const CHECKOUT_PATH = '/booking/checkout';
const OUT_DIR = 'playwright-artifacts';
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: false, slowMo: 100 });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const paymentApiResults = [];
page.on('response', async (res) => {
  const url = res.url();
  if (!url.includes('/api/payments')) return;
  if (res.request().method() !== 'POST') return;
  let body = null;
  try {
    body = await res.json();
  } catch {
    try {
      body = await res.text();
    } catch {
      body = '<unreadable>';
    }
  }
  paymentApiResults.push({ status: res.status(), url, body });
  console.log(`[NET] POST ${url} → ${res.status()}`);
  console.log('      body:', JSON.stringify(body).slice(0, 400));
});

const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(`PAGE: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') pageErrors.push(`CONSOLE: ${msg.text()}`);
});

await page.goto(FE_URL, { waitUntil: 'domcontentloaded' });

console.log('\n=================================================');
console.log(' STEP 1 — MANUAL: search flight → select → fill passengers');
console.log('          → arrive at /booking/checkout (payment method page).');
console.log(' Then click ▶ Resume in the Playwright Inspector.');
console.log('=================================================\n');
await page.pause();

if (!page.url().includes(CHECKOUT_PATH)) {
  console.log(`Current URL: ${page.url()} — waiting up to 60s for /booking/checkout…`);
  await page.waitForURL(`**${CHECKOUT_PATH}**`, { timeout: 60000 }).catch(() => null);
}

await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);

await page.screenshot({ path: `${OUT_DIR}/step-1-checkout.png`, fullPage: true });

console.log('\n>>> STEP 2: click PAY_LATER');
const payLaterCard = page
  .locator('[role="radio"], button, div')
  .filter({ hasText: /hold booking,?\s*pay later|pay later/i })
  .first();
await payLaterCard.click({ timeout: 10000 });
await page.waitForTimeout(300);

const acceptTerms = page.locator('input[type="checkbox"]').first();
if (await acceptTerms.isVisible().catch(() => false)) {
  const isChecked = await acceptTerms.isChecked().catch(() => false);
  if (!isChecked) await acceptTerms.check({ force: true }).catch(() => null);
}

const payButton = page
  .getByRole('button', { name: /pay|confirm|continue|hold booking/i })
  .filter({ hasNot: page.locator('[disabled]') })
  .first();
await payButton.click({ timeout: 10000 }).catch(async () => {
  await page
    .getByRole('button')
    .filter({ hasText: /pay|continue|hold/i })
    .first()
    .click();
});

console.log('Waiting for pay-later POST /api/payments…');
await page.waitForResponse(
  (r) => r.url().includes('/api/payments') && r.request().method() === 'POST',
  { timeout: 20000 }
);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT_DIR}/step-2-after-paylater.png`, fullPage: true });

console.log('\n>>> STEP 3: go back to checkout');
await page.goto(`${FE_URL}${CHECKOUT_PATH}?allowMethodChange=1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT_DIR}/step-3-back-to-checkout.png`, fullPage: true });

console.log('\n>>> STEP 4: click PAYOS_QR (VietQR)');
const vietqrCard = page
  .locator('[role="radio"], button, div')
  .filter({ hasText: /mobile banking|vietqr|payos/i })
  .first();
await vietqrCard.click({ timeout: 10000 });
await page.waitForTimeout(300);

const acceptTerms2 = page.locator('input[type="checkbox"]').first();
if (await acceptTerms2.isVisible().catch(() => false)) {
  const isChecked = await acceptTerms2.isChecked().catch(() => false);
  if (!isChecked) await acceptTerms2.check({ force: true }).catch(() => null);
}

const payButton2 = page
  .getByRole('button', { name: /pay|confirm|continue/i })
  .filter({ hasNot: page.locator('[disabled]') })
  .first();
await payButton2.click({ timeout: 10000 }).catch(async () => {
  await page
    .getByRole('button')
    .filter({ hasText: /pay|continue/i })
    .first()
    .click();
});

console.log('Waiting for PAYOS_QR POST /api/payments…');
await page
  .waitForResponse((r) => r.url().includes('/api/payments') && r.request().method() === 'POST', {
    timeout: 20000,
  })
  .catch(() => null);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT_DIR}/step-4-after-payos.png`, fullPage: true });

console.log('\n======================== REPORT ========================');
let verdict = '✅ NO 500 ERROR observed.';
for (const [i, r] of paymentApiResults.entries()) {
  console.log(`\n[${i + 1}] HTTP ${r.status}  ${r.url}`);
  console.log(JSON.stringify(r.body, null, 2).slice(0, 800));
  if (r.status === 500) verdict = '❌ 500 ERROR observed — fix did NOT work.';
}
if (pageErrors.length) {
  console.log('\n--- Page/console errors ---');
  for (const e of pageErrors) console.log(' ', e);
}
console.log(`\nVerdict: ${verdict}`);
console.log(`Screenshots in ${OUT_DIR}/`);
console.log('========================================================\n');

console.log('Press Ctrl+C to close, or close the browser window.');
await new Promise(() => {});
