// tests/ui.spec.js
// Tests: page rendering, screen transitions, buttons, stage bar, timer, transcript

const { test, expect } = require('@playwright/test');
const { injectSpeechMocks, setupPage, mockClaudeResponses, startCallAndWaitForIntro, simulateTurn } = require('./helpers');

const INTRO_RESPONSE = 'Hello, this is Priya from Divyasree Developers. I am reaching out about our Whispers of the Wind project in Nandi Valley. Is this a good time for a quick 2-3 minute conversation?\n{"stage": "INTRO", "checkpoints": {"intent": null, "geography": null, "budget": null, "timeline": null}, "callEnd": false, "disqualified": false}';

// ── Setup screen ──────────────────────────────────────────────────────────────

test('setup screen is visible on first load', async ({ page }) => {
  await injectSpeechMocks(page);
  await page.goto('/');
  await expect(page.locator('#setup-screen')).toHaveClass(/active/);
  await expect(page.locator('#call-screen')).not.toHaveClass(/active/);
  await expect(page.locator('#summary-screen')).not.toHaveClass(/active/);
});

test('setup screen shows correct title and subtitle', async ({ page }) => {
  await injectSpeechMocks(page);
  await page.goto('/');
  await expect(page.locator('.setup-card h1')).toContainText('Divyasree Voice Agent');
  await expect(page.locator('.setup-card .subtitle')).toContainText('Whispers of the Wind');
});

test('entering API key transitions to call screen', async ({ page }) => {
  await injectSpeechMocks(page);
  await page.goto('/');
  await page.fill('#api-key-input', 'sk-ant-test-key');
  await page.click('#save-key-btn');
  await expect(page.locator('#call-screen')).toHaveClass(/active/);
  await expect(page.locator('#setup-screen')).not.toHaveClass(/active/);
});

test('pressing Enter on API key input submits', async ({ page }) => {
  await injectSpeechMocks(page);
  await page.goto('/');
  await page.fill('#api-key-input', 'sk-ant-test-key');
  await page.press('#api-key-input', 'Enter');
  await expect(page.locator('#call-screen')).toHaveClass(/active/);
});

test('empty API key shows alert', async ({ page }) => {
  await injectSpeechMocks(page);
  await page.goto('/');
  let alertFired = false;
  page.on('dialog', async (dialog) => {
    alertFired = true;
    await dialog.dismiss();
  });
  await page.click('#save-key-btn');
  expect(alertFired).toBe(true);
});

// ── Call screen layout ────────────────────────────────────────────────────────

test('call screen has all required UI elements', async ({ page }) => {
  await setupPage(page);
  await expect(page.locator('.call-header')).toBeVisible();
  await expect(page.locator('#call-timer')).toBeVisible();
  await expect(page.locator('.stage-bar')).toBeVisible();
  await expect(page.locator('.scenario-bar')).toBeVisible();
  await expect(page.locator('#transcript')).toBeVisible();
  await expect(page.locator('#start-call-btn')).toBeVisible();
  await expect(page.locator('#mute-btn')).toBeDisabled();
  await expect(page.locator('#end-call-btn')).toBeDisabled();
});

test('call screen shows Priya as agent name', async ({ page }) => {
  await setupPage(page);
  await expect(page.locator('.agent-name')).toHaveText('Priya');
  await expect(page.locator('.agent-role')).toContainText('Divyasree');
});

test('stage bar has all 7 stages', async ({ page }) => {
  await setupPage(page);
  const stages = page.locator('.stage-item');
  await expect(stages).toHaveCount(7);
  const texts = await stages.allTextContents();
  expect(texts).toEqual(['Intro', 'Intent', 'Location', 'Budget', 'Timeline', 'Pitch', 'CTA']);
});

test('5 scenario preset buttons are present', async ({ page }) => {
  await setupPage(page);
  const btns = page.locator('.scenario-btn');
  await expect(btns).toHaveCount(5);
  await expect(btns.nth(0)).toContainText('Ideal Lead');
  await expect(btns.nth(1)).toContainText('Irritated');
  await expect(btns.nth(2)).toContainText('Location Mismatch');
  await expect(btns.nth(3)).toContainText('NRI Investor');
  await expect(btns.nth(4)).toContainText('Disengaged');
});

// ── Scenario buttons ──────────────────────────────────────────────────────────

test('clicking scenario button marks it active', async ({ page }) => {
  await setupPage(page);
  await page.click('[data-scenario="ideal"]');
  await expect(page.locator('[data-scenario="ideal"]')).toHaveClass(/active/);
  await expect(page.locator('[data-scenario="nri"]')).not.toHaveClass(/active/);
});

test('clicking a different scenario switches active state', async ({ page }) => {
  await setupPage(page);
  await page.click('[data-scenario="ideal"]');
  await page.click('[data-scenario="nri"]');
  await expect(page.locator('[data-scenario="nri"]')).toHaveClass(/active/);
  await expect(page.locator('[data-scenario="ideal"]')).not.toHaveClass(/active/);
});

// ── Call start / end ─────────────────────────────────────────────────────────

test('start call disables start button and enables end/mute', async ({ page }) => {
  await mockClaudeResponses(page, [INTRO_RESPONSE]);
  await setupPage(page);
  await page.click('#start-call-btn');
  await expect(page.locator('#start-call-btn')).toBeDisabled();
  await expect(page.locator('#end-call-btn')).toBeEnabled();
  await expect(page.locator('#mute-btn')).toBeEnabled();
});

test('timer starts when call begins', async ({ page }) => {
  await mockClaudeResponses(page, [INTRO_RESPONSE]);
  await setupPage(page);
  await page.click('#start-call-btn');
  await page.waitForTimeout(1200);
  const timerText = await page.locator('#call-timer').textContent();
  expect(timerText).not.toBe('0:00');
});

test('end call shows summary screen', async ({ page }) => {
  await mockClaudeResponses(page, [INTRO_RESPONSE]);
  await setupPage(page);
  await page.click('#start-call-btn');
  await page.waitForSelector('.message.bot', { timeout: 10000 });
  await page.click('#end-call-btn');
  await page.waitForSelector('#summary-screen.active', { timeout: 5000 });
  await expect(page.locator('#summary-screen')).toHaveClass(/active/);
});

test('new call button from summary returns to call screen', async ({ page }) => {
  await mockClaudeResponses(page, [INTRO_RESPONSE]);
  await setupPage(page);
  await page.click('#start-call-btn');
  await page.waitForSelector('.message.bot', { timeout: 10000 });
  await page.click('#end-call-btn');
  await page.waitForSelector('#summary-screen.active', { timeout: 5000 });
  await page.click('#new-call-btn');
  await expect(page.locator('#call-screen')).toHaveClass(/active/);
});

// ── Transcript ────────────────────────────────────────────────────────────────

test('bot intro message appears in transcript', async ({ page }) => {
  await mockClaudeResponses(page, [INTRO_RESPONSE]);
  await setupPage(page);
  await startCallAndWaitForIntro(page);
  const botMsg = page.locator('.message.bot .bubble').first();
  await expect(botMsg).toContainText('Priya');
  // Spoken text should not contain the JSON
  const text = await botMsg.textContent();
  expect(text).not.toContain('"stage"');
  expect(text).not.toContain('"checkpoints"');
});

test('opening user message appears in transcript', async ({ page }) => {
  await mockClaudeResponses(page, [INTRO_RESPONSE]);
  await setupPage(page);
  await page.click('[data-scenario="ideal"]');
  await startCallAndWaitForIntro(page);
  const userMsg = page.locator('.message.user .bubble').first();
  await expect(userMsg).toHaveText('Hello?');
});

test('transcript clears on new call', async ({ page }) => {
  await mockClaudeResponses(page, [INTRO_RESPONSE, INTRO_RESPONSE]);
  await setupPage(page);
  await startCallAndWaitForIntro(page);
  await page.click('#end-call-btn');
  await page.waitForSelector('#summary-screen.active', { timeout: 5000 });
  await page.click('#new-call-btn');
  await expect(page.locator('.message')).toHaveCount(0);
});

// ── Stage bar ─────────────────────────────────────────────────────────────────

test('stage bar shows INTRO as active at call start', async ({ page }) => {
  await mockClaudeResponses(page, [INTRO_RESPONSE]);
  await setupPage(page);
  await startCallAndWaitForIntro(page);
  await expect(page.locator('[data-stage="INTRO"]')).toHaveClass(/active/);
});

test('stage bar advances to INTENT stage', async ({ page }) => {
  const intentResponse = 'Are you exploring this more for personal use or as an investment?\n{"stage": "INTENT", "checkpoints": {"intent": null, "geography": null, "budget": null, "timeline": null}, "callEnd": false, "disqualified": false}';
  await mockClaudeResponses(page, [INTRO_RESPONSE, intentResponse]);
  await setupPage(page);
  await startCallAndWaitForIntro(page);

  await simulateTurn(page, 'Yes, go ahead');
  await page.waitForTimeout(3000);

  await expect(page.locator('[data-stage="INTENT"]')).toHaveClass(/active/);
  await expect(page.locator('[data-stage="INTRO"]')).toHaveClass(/completed/);
});

// ── Status indicator ──────────────────────────────────────────────────────────

test('status shows "Connecting..." when call starts', async ({ page }) => {
  // Delay API response to catch the thinking state
  await page.addInitScript(() => {});
  await injectSpeechMocks(page);
  await page.route('https://api.anthropic.com/v1/messages', async (route) => {
    await new Promise(r => setTimeout(r, 500));
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: [{ text: INTRO_RESPONSE }] }),
    });
  });
  const INTRO_RESPONSE = 'Hello!\n{"stage": "INTRO", "checkpoints": {"intent": null, "geography": null, "budget": null, "timeline": null}, "callEnd": false, "disqualified": false}';
  await page.goto('/');
  await page.fill('#api-key-input', 'sk-ant-test-key');
  await page.click('#save-key-btn');
  await page.click('#start-call-btn');
  await expect(page.locator('#status-text')).toHaveText('Connecting...');
});
