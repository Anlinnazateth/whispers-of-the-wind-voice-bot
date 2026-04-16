// tests/call-flow.spec.js
// Tests: full conversation flows, all 5 scenarios, qualification summary card

const { test, expect } = require('@playwright/test');
const { setupPage, mockClaudeResponses, startCallAndWaitForIntro, simulateTurn } = require('./helpers');

// ── Canned Claude responses ───────────────────────────────────────────────────

const R = {
  intro: 'Hello, this is Priya from Divyasree Developers. Is this a good time?\n{"stage":"INTRO","checkpoints":{"intent":null,"geography":null,"budget":null,"timeline":null},"callEnd":false,"disqualified":false}',

  intent: 'Are you exploring this for personal use or as an investment?\n{"stage":"INTENT","checkpoints":{"intent":null,"geography":null,"budget":null,"timeline":null},"callEnd":false,"disqualified":false}',

  geography: 'The project is in Nandi Valley near Nandi Hills. Does that location work for you?\n{"stage":"GEOGRAPHY","checkpoints":{"intent":true,"geography":null,"budget":null,"timeline":null},"callEnd":false,"disqualified":false}',

  budget: 'Plots are priced from Rs 92.4 lakh to Rs 2.46 crore. Does that align with your budget?\n{"stage":"BUDGET","checkpoints":{"intent":true,"geography":true,"budget":null,"timeline":null},"callEnd":false,"disqualified":false}',

  timeline: 'Possession is December 2029. Are you comfortable with that timeline?\n{"stage":"TIMELINE","checkpoints":{"intent":true,"geography":true,"budget":true,"timeline":null},"callEnd":false,"disqualified":false}',

  pitch: 'Whispers of the Wind has 74% open green spaces, eco-parks and views of Nandi Hills.\n{"stage":"PITCH","checkpoints":{"intent":true,"geography":true,"budget":true,"timeline":true},"callEnd":false,"disqualified":false}',

  cta: 'Could I schedule a 15-minute call with our Property Expert? What day works?\n{"stage":"CTA","checkpoints":{"intent":true,"geography":true,"budget":true,"timeline":true},"callEnd":false,"disqualified":false}',

  ctaEnd: 'Wonderful! Our expert will reach out. Have a great day!\n{"stage":"CTA","checkpoints":{"intent":true,"geography":true,"budget":true,"timeline":true},"callEnd":true,"disqualified":false}',

  disqualifyGeo: 'Understood, I appreciate your time. If your preferences change, we would love to reconnect.\n{"stage":"DISQUALIFIED","checkpoints":{"intent":true,"geography":false,"budget":null,"timeline":null},"callEnd":true,"disqualified":true}',

  disqualifyBudget: 'That is completely understandable. We will keep you in mind for the future.\n{"stage":"DISQUALIFIED","checkpoints":{"intent":true,"geography":true,"budget":false,"timeline":null},"callEnd":true,"disqualified":true}',

  irritatedExit: 'I completely understand and sincerely apologize for the interruption. Have a wonderful day.\n{"stage":"INTRO","checkpoints":{"intent":null,"geography":null,"budget":null,"timeline":null},"callEnd":true,"disqualified":false}',

  nriPitch: 'The project is just 15-20 minutes from Kempegowda International Airport. Devanahalli corridor is one of Bengaluru fastest-appreciating micro-markets.\n{"stage":"PITCH","checkpoints":{"intent":true,"geography":true,"budget":true,"timeline":true},"callEnd":false,"disqualified":false}',

  timelineReframe: 'Many buyers prefer this timeline — lower entry price now with strong appreciation by possession. Does that change your perspective?\n{"stage":"TIMELINE","checkpoints":{"intent":true,"geography":true,"budget":true,"timeline":null},"callEnd":false,"disqualified":false}',
};

// Use simulateTurn from helpers — waits for status-text === 'Listening...' before firing
const turn = simulateTurn;

// ── Scenario 1: Ideal Lead ────────────────────────────────────────────────────

test('Scenario 1 — Ideal Lead: all checkpoints pass, qualified result', async ({ page }) => {
  await mockClaudeResponses(page, [
    R.intro, R.intent, R.geography, R.budget, R.timeline, R.pitch, R.cta, R.ctaEnd,
  ]);
  await setupPage(page);
  await page.click('[data-scenario="ideal"]');
  await startCallAndWaitForIntro(page);

  await turn(page, 'Yes, go ahead');
  await turn(page, 'I am looking at investment');
  await turn(page, 'Yes, Nandi Hills sounds great');
  await turn(page, 'Budget of 1.5 crore is fine');
  await turn(page, 'Yes, 2029 timeline is okay');
  await turn(page, 'That sounds amazing');
  await turn(page, 'Saturday morning works perfectly');

  await page.waitForSelector('#summary-screen.active', { timeout: 10000 });

  await expect(page.locator('#cp-intent')).toHaveClass(/pass/);
  await expect(page.locator('#cp-geography')).toHaveClass(/pass/);
  await expect(page.locator('#cp-budget')).toHaveClass(/pass/);
  await expect(page.locator('#cp-timeline')).toHaveClass(/pass/);
  await expect(page.locator('#qualification-result')).toHaveClass(/qualified/);
  await expect(page.locator('#qualification-result')).toContainText('Qualified Lead');
});

// ── Scenario 2: Irritated User ────────────────────────────────────────────────

test('Scenario 2 — Irritated User: exits gracefully, call ends immediately', async ({ page }) => {
  await mockClaudeResponses(page, [R.intro, R.irritatedExit]);
  await setupPage(page);
  await page.click('[data-scenario="irritated"]');
  await startCallAndWaitForIntro(page);

  await turn(page, 'Stop calling me, remove my number');

  await page.waitForSelector('#summary-screen.active', { timeout: 8000 });

  // Bot should have apologized
  const messages = await page.locator('.message.bot .bubble').allTextContents();
  const lastBotMsg = messages[messages.length - 1].toLowerCase();
  expect(lastBotMsg).toMatch(/understand|apologize|wonderful day/);

  // Should not be qualified
  await expect(page.locator('#qualification-result')).not.toHaveClass(/qualified/);
});

// ── Scenario 3: Location Mismatch ────────────────────────────────────────────

test('Scenario 3 — Location Mismatch: disqualified at geography, geography=fail', async ({ page }) => {
  await mockClaudeResponses(page, [R.intro, R.intent, R.geography, R.disqualifyGeo]);
  await setupPage(page);
  await page.click('[data-scenario="location-mismatch"]');
  await startCallAndWaitForIntro(page);

  await turn(page, 'Yes go ahead');
  await turn(page, 'I am interested in investment');
  await turn(page, 'No, I only want South Bengaluru, not Nandi Hills');

  await page.waitForSelector('#summary-screen.active', { timeout: 8000 });

  await expect(page.locator('#cp-geography')).toHaveClass(/fail/);
  await expect(page.locator('#cp-geography-value')).toHaveText('Fail');
  await expect(page.locator('#cp-budget-value')).toHaveText('Not reached');
  await expect(page.locator('#cp-timeline-value')).toHaveText('Not reached');
  await expect(page.locator('#qualification-result')).toHaveClass(/disqualified/);
  await expect(page.locator('#qualification-result')).toContainText('Disqualified');
});

// ── Scenario 4: NRI Investor ──────────────────────────────────────────────────

test('Scenario 4 — NRI Investor: airport angle in pitch, all checkpoints pass', async ({ page }) => {
  await mockClaudeResponses(page, [
    R.intro, R.intent, R.geography, R.budget, R.timeline, R.nriPitch, R.cta, R.ctaEnd,
  ]);
  await setupPage(page);
  await page.click('[data-scenario="nri"]');
  await startCallAndWaitForIntro(page);

  await turn(page, 'I am calling from Dubai');
  await turn(page, 'Investment back in India');
  await turn(page, 'Airport proximity is perfect for me');
  await turn(page, 'Budget of 2 crore is fine');
  await turn(page, '2029 is good for investment');
  await turn(page, 'Tell me more about the airport access');
  await turn(page, 'Tuesday afternoon works');

  await page.waitForSelector('#summary-screen.active', { timeout: 10000 });

  // NRI-specific pitch should mention airport
  const messages = await page.locator('.message.bot .bubble').allTextContents();
  const haAirport = messages.some(m => m.toLowerCase().includes('airport') || m.toLowerCase().includes('kial'));
  expect(haAirport).toBe(true);

  await expect(page.locator('#qualification-result')).toHaveClass(/qualified/);
});

// ── Scenario 5: Disengaged Lead ───────────────────────────────────────────────

test('Scenario 5 — Disengaged Lead: investment reframe delivered for timeline concern', async ({ page }) => {
  await mockClaudeResponses(page, [
    R.intro, R.intent, R.geography, R.budget, R.timelineReframe, R.pitch, R.cta, R.ctaEnd,
  ]);
  await setupPage(page);
  await page.click('[data-scenario="disengaged"]');
  await startCallAndWaitForIntro(page);

  await turn(page, 'What is this about');
  await turn(page, 'Maybe investment');
  await turn(page, 'Yes location is fine');
  await turn(page, 'Budget is okay');
  await turn(page, '2029 seems too far away for me');

  await page.waitForTimeout(500);

  // Investment reframe should appear
  const messages = await page.locator('.message.bot .bubble').allTextContents();
  const hasReframe = messages.some(m =>
    m.toLowerCase().includes('lower entry') ||
    m.toLowerCase().includes('appreciation') ||
    m.toLowerCase().includes('favour')
  );
  expect(hasReframe).toBe(true);
});

// ── Budget disqualification ───────────────────────────────────────────────────

test('Budget mismatch: disqualified at budget, graceful exit', async ({ page }) => {
  await mockClaudeResponses(page, [R.intro, R.intent, R.geography, R.budget, R.disqualifyBudget]);
  await setupPage(page);
  await startCallAndWaitForIntro(page);

  await turn(page, 'Yes please go ahead');
  await turn(page, 'Personal use, weekend home');
  await turn(page, 'Yes Nandi Hills is fine');
  await turn(page, 'No, 92 lakh is too much for me');

  await page.waitForSelector('#summary-screen.active', { timeout: 8000 });

  await expect(page.locator('#cp-budget')).toHaveClass(/fail/);
  await expect(page.locator('#qualification-result')).toHaveClass(/disqualified/);
});

// ── Checkpoint skip logic ─────────────────────────────────────────────────────

test('Checkpoint skip: bot skips INTENT when user volunteers it in intro', async ({ page }) => {
  const skipIntentResponse = 'Perfect, noted that you are looking at investment. The project is in Nandi Valley — does that location work?\n{"stage":"GEOGRAPHY","checkpoints":{"intent":true,"geography":null,"budget":null,"timeline":null},"callEnd":false,"disqualified":false}';
  await mockClaudeResponses(page, [R.intro, skipIntentResponse]);
  await setupPage(page);
  await startCallAndWaitForIntro(page);

  await turn(page, 'I am looking to invest around 1.5 crore in Bengaluru');

  await page.waitForTimeout(500);

  // Should be at GEOGRAPHY, INTRO completed, INTENT completed (skipped)
  await expect(page.locator('[data-stage="GEOGRAPHY"]')).toHaveClass(/active/);
  await expect(page.locator('[data-stage="INTENT"]')).toHaveClass(/completed/);
  // Intent checkpoint already marked true
  await expect(page.locator('#cp-intent-value')).toHaveText('Pass');
});

// ── Permission decline ────────────────────────────────────────────────────────

test('Not a good time: call ends gracefully after permission declined', async ({ page }) => {
  const notNowResponse = 'Of course, I understand. We will reach out at a better time. Have a wonderful day!\n{"stage":"INTRO","checkpoints":{"intent":null,"geography":null,"budget":null,"timeline":null},"callEnd":true,"disqualified":false}';
  await mockClaudeResponses(page, [R.intro, notNowResponse]);
  await setupPage(page);
  await startCallAndWaitForIntro(page);

  await turn(page, 'No, this is not a good time');

  await page.waitForSelector('#summary-screen.active', { timeout: 8000 });
  await expect(page.locator('#qualification-result')).toContainText('Partial');
});
