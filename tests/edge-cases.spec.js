// tests/edge-cases.spec.js
// Tests: silence timeout, API errors, mute, Hindi switch, additional project details

const { test, expect } = require('@playwright/test');
const { setupPage, mockClaudeResponses, startCallAndWaitForIntro, injectSpeechMocks, simulateTurn } = require('./helpers');

const INTRO = 'Hello, this is Priya. Is this a good time?\n{"stage":"INTRO","checkpoints":{"intent":null,"geography":null,"budget":null,"timeline":null},"callEnd":false,"disqualified":false}';
const RETRY = 'Sorry, I did not quite catch that — could you say that again?\n{"stage":"INTRO","checkpoints":{"intent":null,"geography":null,"budget":null,"timeline":null},"callEnd":false,"disqualified":false}';
const TIMEOUT_EXIT = 'I will have someone from our team reach out at a better time. Thank you so much, and have a wonderful day!\n{"stage":"INTRO","checkpoints":{"intent":null,"geography":null,"budget":null,"timeline":null},"callEnd":true,"disqualified":false}';

// ── Silence timeout ───────────────────────────────────────────────────────────

test('silence timeout: bot retries after user goes quiet', async ({ page }) => {
  await injectSpeechMocks(page);
  await mockClaudeResponses(page, [INTRO, RETRY, TIMEOUT_EXIT]);
  await page.goto('/');
  await page.fill('#api-key-input', 'sk-ant-test');
  await page.click('#save-key-btn');
  await page.click('#start-call-btn');

  // Wait for intro, then patch silence timeout down and let it fire
  await page.waitForSelector('.message.bot', { timeout: 10000 });
  await page.evaluate(() => { Voice.SILENCE_TIMEOUT_MS = 400; });
  // STT restart fires after 300ms, then recognition.onend fires, starts 400ms timer
  await page.waitForTimeout(1200);

  const messages = await page.locator('.message.bot .bubble').allTextContents();
  const hasRetry = messages.some(m => m.toLowerCase().includes("didn't quite catch"));
  expect(hasRetry).toBe(true);
});

test('silence timeout: after max retries, exits gracefully', async ({ page }) => {
  await injectSpeechMocks(page);
  await mockClaudeResponses(page, [INTRO]);
  await page.goto('/');
  await page.fill('#api-key-input', 'sk-ant-test');
  await page.click('#save-key-btn');
  await page.click('#start-call-btn');

  // Wait for intro, then patch to exit immediately on first silence
  await page.waitForSelector('.message.bot', { timeout: 10000 });
  await page.evaluate(() => {
    Voice.SILENCE_TIMEOUT_MS = 400;
    App.MAX_SILENCE_RETRIES = 0;
  });
  await page.waitForTimeout(1500);

  const messages = await page.locator('.message.bot .bubble').allTextContents();
  const hasExit = messages.some(m =>
    m.toLowerCase().includes('reach out') || m.toLowerCase().includes('better time')
  );
  expect(hasExit).toBe(true);
});

// ── Mute button ───────────────────────────────────────────────────────────────

test('mute button toggles label between Mute and Unmute', async ({ page }) => {
  await mockClaudeResponses(page, [INTRO]);
  await setupPage(page);
  await page.click('#start-call-btn');
  await page.waitForSelector('.message.bot', { timeout: 10000 });

  await expect(page.locator('#mute-btn')).toHaveText('Mute');
  await page.click('#mute-btn');
  await expect(page.locator('#mute-btn')).toHaveText('Unmute');
  await page.click('#mute-btn');
  await expect(page.locator('#mute-btn')).toHaveText('Mute');
});

// ── API error handling ────────────────────────────────────────────────────────

test('API error: shows error status, does not crash page', async ({ page }) => {
  await injectSpeechMocks(page);
  await page.route('https://api.anthropic.com/v1/messages', (route) => {
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'Invalid API key' } }),
    });
  });
  await page.goto('/');
  await page.fill('#api-key-input', 'sk-ant-invalid-key');
  await page.click('#save-key-btn');
  await page.click('#start-call-btn');

  // Wait for error to appear in status
  await page.waitForFunction(() => {
    const statusText = document.getElementById('status-text');
    return statusText && statusText.textContent.toLowerCase().includes('error');
  }, { timeout: 10000 });

  await expect(page.locator('#status-text')).toContainText('Error');
  // Page should still be on call screen, not crashed
  await expect(page.locator('#call-screen')).toHaveClass(/active/);
});

test('API 429 rate limit: shows error status without crashing', async ({ page }) => {
  await injectSpeechMocks(page);
  await page.route('https://api.anthropic.com/v1/messages', (route) => {
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'Rate limit exceeded' } }),
    });
  });
  await page.goto('/');
  await page.fill('#api-key-input', 'sk-ant-test');
  await page.click('#save-key-btn');
  await page.click('#start-call-btn');

  await page.waitForFunction(() => {
    const t = document.getElementById('status-text');
    return t && t.textContent.toLowerCase().includes('error');
  }, { timeout: 10000 });

  await expect(page.locator('#status-text')).toContainText('Error');
  await expect(page.locator('#call-screen')).toHaveClass(/active/);
});

// ── XSS safety ────────────────────────────────────────────────────────────────

test('XSS: bot message with script tag renders as text, not executed', async ({ page }) => {
  const xssResponse = '<script>window._xssExecuted=true;</script>Hello!\n{"stage":"INTRO","checkpoints":{"intent":null,"geography":null,"budget":null,"timeline":null},"callEnd":false,"disqualified":false}';
  await mockClaudeResponses(page, [xssResponse]);
  await setupPage(page);
  await startCallAndWaitForIntro(page);

  // The script tag should appear as literal text, not be executed
  const xssExecuted = await page.evaluate(() => window._xssExecuted);
  expect(xssExecuted).toBeFalsy();

  // The bubble should contain the raw text
  const bubble = await page.locator('.message.bot .bubble').first().textContent();
  expect(bubble).toContain('<script>');
});

test('XSS: user speech with HTML renders as text', async ({ page }) => {
  await mockClaudeResponses(page, [INTRO, INTRO]);
  await setupPage(page);
  await startCallAndWaitForIntro(page);

  await simulateTurn(page, '<img src=x onerror=alert(1)>');
  await page.waitForTimeout(500);

  const userBubble = await page.locator('.message.user .bubble').last().textContent();
  expect(userBubble).toContain('<img');
  // No alert should have fired (would cause test to fail with unhandled dialog)
});

// ── Claude response without JSON ──────────────────────────────────────────────

test('Claude response with no JSON still speaks and does not crash', async ({ page }) => {
  const noJsonResponse = 'Hello, this is Priya. Is this a good time to speak?';
  await mockClaudeResponses(page, [noJsonResponse]);
  await setupPage(page);
  await startCallAndWaitForIntro(page);

  // Should still show the message
  const bubble = await page.locator('.message.bot .bubble').first().textContent();
  expect(bubble).toContain('Priya');
  // Page should not have crashed
  await expect(page.locator('#call-screen')).toHaveClass(/active/);
});

// ── Summary card accuracy ─────────────────────────────────────────────────────

test('Summary card: partial result when call ends with mixed checkpoints', async ({ page }) => {
  const partialEnd = 'I will follow up at a better time.\n{"stage":"BUDGET","checkpoints":{"intent":true,"geography":true,"budget":null,"timeline":null},"callEnd":true,"disqualified":false}';
  await mockClaudeResponses(page, [INTRO, partialEnd]);
  await setupPage(page);
  await startCallAndWaitForIntro(page);

  await simulateTurn(page, 'I need to go');
  await page.waitForSelector('#summary-screen.active', { timeout: 10000 });

  await expect(page.locator('#cp-intent')).toHaveClass(/pass/);
  await expect(page.locator('#cp-geography')).toHaveClass(/pass/);
  await expect(page.locator('#qualification-result')).toHaveClass(/partial/);
});
