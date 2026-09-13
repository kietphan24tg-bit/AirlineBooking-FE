import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Opt-in: uses the backend configured in Vite, consumes model quota, no booking mutations.
assert.equal(process.env.CHAT_LOCAL_LIVE_ENABLED, 'true', 'Set CHAT_LOCAL_LIVE_ENABLED=true');
const baseUrl = process.env.CHAT_LOCAL_BASE_URL || 'http://localhost:5173';
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const created = new Set();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', async (response) => {
  if (new URL(response.url()).pathname === '/api/chatbot/messages' && response.status() === 200) {
    const raw = await response.json();
    const body = raw.data ?? raw;
    if (body.conversation?.id) created.add(body.conversation.id);
  }
});
const widget = page.getByRole('region', { name: 'AirlineBooking Assistant' });
async function openChat() {
  const loaded = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/chatbot/conversations/active'
  );
  await page.getByRole('button', { name: 'Mở trợ lý', exact: true }).click();
  return loaded;
}
async function send(message) {
  const received = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/chatbot/messages',
    { timeout: 120_000 }
  );
  await widget.locator('input, textarea').fill(message);
  await widget.locator('form').evaluate((form) => form.requestSubmit());
  const response = await received;
  assert.equal(response.status(), 200);
  const raw = await response.json();
  const body = raw.data ?? raw;
  console.log(
    'Chat response metadata:',
    JSON.stringify({
      keys: Object.keys(raw),
      answerType: body.answerType,
      fallbackReason: body.fallbackReason,
      hasConversation: !!body.conversation,
    })
  );
  if (body.conversation?.id) created.add(body.conversation.id);
  assert.ok(body.conversation?.id, 'Response must identify the conversation');
  assert.ok(body.answer, 'Response must include an answer');
  await widget.getByText(body.answer, { exact: true }).first().waitFor();
  return body;
}
try {
  await page.goto(baseUrl);
  assert.equal((await openChat()).status(), 204);
  const cookie = (await context.cookies(`${baseUrl}/api/chatbot`)).find(
    (c) => c.name === 'chat_guest'
  );
  assert.ok(cookie, 'Browser must save chat_guest through the local Vite proxy');
  assert.equal(cookie.httpOnly, true);
  console.log(
    'Cookie retained:',
    JSON.stringify({ secure: cookie.secure, sameSite: cookie.sameSite, httpOnly: cookie.httpOnly })
  );

  const firstMessage = 'What documents do I need for a domestic flight?';
  const first = await send(firstMessage);
  const id = first.conversation.id;
  await page.reload();
  const active = await openChat();
  assert.equal(active.status(), 200);
  const activeBody = await active.json();
  assert.equal((activeBody.data ?? activeBody).id, id);
  await widget.getByText(firstMessage, { exact: true }).waitFor();
  const followUp = await send('Does that also apply to children on a domestic flight?');
  assert.equal(followUp.conversation.id, id);

  const stranger = await browser.newContext();
  try {
    const strangerPage = await stranger.newPage();
    await strangerPage.goto(baseUrl);
    const statuses = await strangerPage.evaluate(async (conversationId) => {
      const path = `/api/chatbot/conversations/${conversationId}`;
      const read = await fetch(`${path}/messages`, { credentials: 'include' });
      const remove = await fetch(path, { method: 'DELETE', credentials: 'include' });
      return [read.status, remove.status];
    }, id);
    for (const status of statuses) assert.ok([403, 404].includes(status));
  } finally {
    await stranger.close();
  }

  const archived = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/chatbot/conversations/active/archive'
  );
  await widget.getByRole('button', { name: 'Cuộc trò chuyện mới', exact: true }).click();
  assert.equal((await archived).status(), 200);
  const next = await send('What documents do I need for an international flight?');
  assert.notEqual(next.conversation.id, id);
  assert.deepEqual(errors, []);
  if (process.env.HTTP_CHAT_SCREENSHOT)
    await page.screenshot({ path: process.env.HTTP_CHAT_SCREENSHOT });
  console.log(
    'PASS: local browser cookie, chat, refresh/history, follow-up conversation continuity, ownership, New Chat.'
  );
  console.log(
    'Answer types:',
    JSON.stringify(
      [first, followUp, next].map((r) => ({
        answerType: r.answerType,
        fallbackReason: r.fallbackReason,
      }))
    )
  );
} finally {
  const failures = [];
  for (const id of created) {
    const status = await page.evaluate(async (conversationId) => {
      return (
        await fetch(`/api/chatbot/conversations/${conversationId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
      ).status;
    }, id);
    if (status !== 204) failures.push({ id, status });
  }
  await browser.close();
  assert.deepEqual(failures, [], 'Cleanup of only test-created conversations');
  console.log(`Cleaned up ${created.size} test-created conversations.`);
}
