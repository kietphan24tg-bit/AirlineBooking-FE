import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

// Real HTTP browser context; API fixtures isolate this regression from model quota.
const root = resolve('dist');
const server = createServer(async (req, res) => {
  const path = resolve(root, `.${new URL(req.url, 'http://local').pathname}`);
  if (path !== root && !path.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const types = {
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
    };
    const file = extname(path) ? path : resolve(root, 'index.html');
    res.setHeader('Content-Type', types[extname(file)] || 'text/html');
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
let browser;
const launchOptions = {
  args: ['--host-resolver-rules=MAP http-chat.test 127.0.0.1', '--no-proxy-server'],
};

async function launchBrowser() {
  try {
    return await chromium.launch(launchOptions);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Executable doesn't exist")) {
      throw error;
    }
    return chromium.launch({ ...launchOptions, channel: 'chrome' });
  }
}

try {
  browser = await launchBrowser();
  const page = await browser.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/**', async (route) => {
    if (new URL(route.request().url()).pathname === '/api/chatbot/messages') {
      const body = route.request().postDataJSON();
      requests.push(body);
      const payload = {
        answer:
          requests.length === 1 ? 'HTTP chat regression response' : 'HTTP chat enveloped response',
        answerType: 'ANSWER',
        grounded: true,
        conversation: { id: '01234567-89ab-4cde-8123-456789abcdef', status: 'ACTIVE' },
      };
      await route.fulfill({
        json:
          requests.length === 1
            ? payload
            : { success: true, data: payload, message: 'Operation successful' },
      });
    } else {
      await route.fulfill({ status: 204 });
    }
  });
  await page.goto(`http://http-chat.test:${server.address().port}/`);
  assert.deepEqual(
    await page.evaluate(() => ({
      secure: globalThis.isSecureContext,
      uuid: typeof globalThis.crypto.randomUUID,
    })),
    { secure: false, uuid: 'undefined' }
  );
  const widget = page.getByRole('region', { name: 'AirlineBooking Assistant' });
  // The floating toggle is outside the initially hidden chat region.
  await page
    .locator('button')
    .filter({ has: page.locator('svg.lucide-message-circle') })
    .last()
    .click();
  await widget.locator('input, textarea').fill('HTTP chat regression request');
  await widget.locator('form').evaluate((form) => form.requestSubmit());
  await widget.getByText('HTTP chat regression response', { exact: true }).waitFor();
  assert.equal(requests.length, 1);
  assert.match(
    requests[0].clientMessageId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  );
  await widget.locator('input, textarea').fill('HTTP chat envelope regression request');
  await widget.locator('form').evaluate((form) => form.requestSubmit());
  await widget.getByText('HTTP chat enveloped response', { exact: true }).waitFor();
  assert.equal(requests.length, 2);
  assert.notEqual(requests[0].clientMessageId, requests[1].clientMessageId);
  assert.deepEqual(errors, []);
  if (process.env.HTTP_CHAT_SCREENSHOT) {
    await page.screenshot({ path: process.env.HTTP_CHAT_SCREENSHOT });
  }
  console.log(
    'PASS: HTTP insecure context sends one request per message with UUID v4 and renders direct and enveloped answers without page errors. API responses are fixtures.'
  );
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
