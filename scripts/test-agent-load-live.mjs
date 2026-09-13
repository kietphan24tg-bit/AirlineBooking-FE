import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

assert.equal(process.env.AGENT_LOAD_LIVE_ENABLED, 'true', 'Set AGENT_LOAD_LIVE_ENABLED=true');
const baseUrl = process.env.AGENT_LOAD_BASE_URL || 'http://20.196.153.39:8080';
// Fixed, bounded burst; API-only cookie transport, not a browser security test.
const samples = await Promise.all(
  Array.from({ length: 8 }, async () => {
    let cookie;
    let conversationId;
    const started = performance.now();
    let sample;
    try {
      const initial = await fetch(`${baseUrl}/api/chatbot/conversations/active`, {
        signal: AbortSignal.timeout(30_000),
      });
      assert.equal(initial.status, 204);
      cookie = initial.headers
        .getSetCookie()
        .find((value) => value.startsWith('chat_guest='))
        ?.split(';')[0];
      assert.ok(cookie, 'Each synthetic guest needs its own cookie');
      const response = await fetch(`${baseUrl}/api/chatbot/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          message: 'What identification documents are needed for a domestic flight?',
          clientMessageId: randomUUID(),
        }),
        signal: AbortSignal.timeout(120_000),
      });
      const responseText = await response.text();
      let raw = {};
      try {
        raw = JSON.parse(responseText);
      } catch {
        raw = {};
      }
      const body = raw.data ?? raw;
      conversationId = body.conversation?.id;
      sample = {
        status: response.status,
        answerType: body.answerType ?? null,
        fallbackReason: body.fallbackReason ?? null,
        errorCode: raw.error?.code ?? null,
        requestId: raw.requestId ?? null,
        responsePreview: response.ok ? null : responseText.slice(0, 500),
        durationMs: Math.round(performance.now() - started),
      };
    } catch (error) {
      sample = {
        status: null,
        error: error.name,
        durationMs: Math.round(performance.now() - started),
      };
    } finally {
      if (conversationId) {
        const cleanup = await fetch(`${baseUrl}/api/chatbot/conversations/${conversationId}`, {
          method: 'DELETE',
          headers: { Cookie: cookie },
          signal: AbortSignal.timeout(30_000),
        });
        assert.equal(cleanup.status, 204, 'Delete only this guest’s test-created conversation');
      }
    }
    return sample;
  })
);
const durations = samples.map((s) => s.durationMs).sort((a, b) => a - b);
const report = {
  concurrency: 8,
  requests: samples.length,
  answers: samples.filter((s) => s.answerType === 'ANSWER').length,
  fallbacks: samples.filter((s) => s.answerType === 'FALLBACK').length,
  controlledRejections: samples.filter((s) => [429, 503].includes(s.status)).length,
  serverErrors: samples.filter((s) => s.status >= 500 && s.status !== 503).length,
  transportErrors: samples.filter((s) => s.status === null).length,
  medianMs: durations[Math.floor(durations.length / 2)],
  p95Ms: durations.at(-1),
  samples,
};
console.log(JSON.stringify(report, null, 2));
if (process.env.AGENT_LOAD_REPORT)
  await writeFile(process.env.AGENT_LOAD_REPORT, JSON.stringify(report, null, 2) + '\n');
assert.equal(report.serverErrors, 0);
assert.equal(report.transportErrors, 0);
assert.ok(
  report.answers + report.fallbacks > 0,
  'At least one guest must complete through the model guard'
);
assert.ok(samples.every((s) => s.status === 200 || [429, 503].includes(s.status)));
console.log(
  'PASS: bounded 8-guest burst completed with normal answers or controlled fallback/rejection; owned conversations cleaned.'
);
