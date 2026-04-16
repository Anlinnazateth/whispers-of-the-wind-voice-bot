// tests/state.spec.js
// Tests: State machine logic and SystemPrompt builder (run in browser context)

const { test, expect } = require('@playwright/test');
const { injectSpeechMocks, setupPage } = require('./helpers');

// Run all state tests inside the browser where State and SystemPrompt are loaded

test.describe('State.parseResponse', () => {
  test('extracts spoken text and metadata from well-formed response', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => {
      return State.parseResponse(
        'Hello, is this a good time?\n{"stage":"INTRO","checkpoints":{"intent":null,"geography":null,"budget":null,"timeline":null},"callEnd":false,"disqualified":false}'
      );
    });
    expect(result.spokenText).toBe('Hello, is this a good time?');
    expect(result.metadata.stage).toBe('INTRO');
    expect(result.metadata.callEnd).toBe(false);
    expect(result.metadata.disqualified).toBe(false);
    expect(result.metadata.checkpoints.intent).toBeNull();
  });

  test('handles multi-line spoken text before JSON', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => {
      return State.parseResponse(
        'Line one.\nLine two.\n{"stage":"INTENT","checkpoints":{"intent":null,"geography":null,"budget":null,"timeline":null},"callEnd":false,"disqualified":false}'
      );
    });
    expect(result.spokenText).toBe('Line one.\nLine two.');
    expect(result.metadata.stage).toBe('INTENT');
  });

  test('returns full raw text as spokenText when no JSON present', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => {
      return State.parseResponse('Just a plain sentence with no JSON.');
    });
    expect(result.spokenText).toBe('Just a plain sentence with no JSON.');
    expect(result.metadata).toBeNull();
  });

  test('handles blank lines before JSON', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => {
      return State.parseResponse(
        'Hello!\n\n{"stage":"CTA","checkpoints":{"intent":true,"geography":true,"budget":true,"timeline":true},"callEnd":false,"disqualified":false}'
      );
    });
    expect(result.spokenText).toBe('Hello!');
    expect(result.metadata.stage).toBe('CTA');
  });

  test('does not split on nested JSON (checkpoints object)', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => {
      return State.parseResponse(
        'The price is Rs 92.4 lakh.\n{"stage":"BUDGET","checkpoints":{"intent":true,"geography":true,"budget":null,"timeline":null},"callEnd":false,"disqualified":false}'
      );
    });
    expect(result.spokenText).toBe('The price is Rs 92.4 lakh.');
    expect(result.metadata.checkpoints.intent).toBe(true);
    expect(result.metadata.checkpoints.budget).toBeNull();
  });
});

test.describe('State.applyUpdate', () => {
  test('resets cleanly', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => {
      State.reset();
      return { stage: State.stage, checkpoints: State.checkpoints, callEnd: State.callEnd };
    });
    expect(result.stage).toBe('INTRO');
    expect(result.checkpoints.intent).toBeNull();
    expect(result.callEnd).toBe(false);
  });

  test('updates stage correctly', async ({ page }) => {
    await setupPage(page);
    const stage = await page.evaluate(() => {
      State.reset();
      State.applyUpdate({ stage: 'GEOGRAPHY', checkpoints: { intent: true, geography: null, budget: null, timeline: null } });
      return State.stage;
    });
    expect(stage).toBe('GEOGRAPHY');
  });

  test('marks disqualified and sets DISQUALIFIED stage', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => {
      State.reset();
      State.applyUpdate({
        stage: 'GEOGRAPHY',
        checkpoints: { intent: true, geography: false, budget: null, timeline: null },
        callEnd: true,
        disqualified: true,
      });
      return { stage: State.stage, disqualified: State.disqualified, callEnd: State.callEnd };
    });
    expect(result.stage).toBe('DISQUALIFIED');
    expect(result.disqualified).toBe(true);
    expect(result.callEnd).toBe(true);
  });

  test('ignores unknown stage values', async ({ page }) => {
    await setupPage(page);
    const stage = await page.evaluate(() => {
      State.reset();
      State.applyUpdate({ stage: 'BOGUS_STAGE' });
      return State.stage;
    });
    expect(stage).toBe('INTRO'); // unchanged
  });

  test('updates individual checkpoints without clobbering others', async ({ page }) => {
    await setupPage(page);
    const cp = await page.evaluate(() => {
      State.reset();
      State.applyUpdate({ checkpoints: { intent: true, geography: null, budget: null, timeline: null } });
      State.applyUpdate({ checkpoints: { geography: true } });
      return State.checkpoints;
    });
    expect(cp.intent).toBe(true);
    expect(cp.geography).toBe(true);
    expect(cp.budget).toBeNull();
  });
});

test.describe('State.getQualificationResult', () => {
  test('returns "qualified" when intent, geography, budget all true', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => {
      State.reset();
      State.checkpoints = { intent: true, geography: true, budget: true, timeline: true };
      return State.getQualificationResult();
    });
    expect(result).toBe('qualified');
  });

  test('returns "disqualified" when geography is false', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => {
      State.reset();
      State.checkpoints = { intent: true, geography: false, budget: null, timeline: null };
      return State.getQualificationResult();
    });
    expect(result).toBe('disqualified');
  });

  test('returns "disqualified" when budget is false', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => {
      State.reset();
      State.checkpoints = { intent: true, geography: true, budget: false, timeline: null };
      return State.getQualificationResult();
    });
    expect(result).toBe('disqualified');
  });

  test('returns "partial" when not all checkpoints resolved', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => {
      State.reset();
      State.checkpoints = { intent: true, geography: null, budget: null, timeline: null };
      return State.getQualificationResult();
    });
    expect(result).toBe('partial');
  });

  test('returns "partial" when call ended early without disqualification', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => {
      State.reset();
      State.checkpoints = { intent: null, geography: null, budget: null, timeline: null };
      return State.getQualificationResult();
    });
    expect(result).toBe('partial');
  });
});

test.describe('State.isCallOver', () => {
  test('false at start', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => { State.reset(); return State.isCallOver(); });
    expect(result).toBe(false);
  });

  test('true when callEnd set', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => {
      State.reset();
      State.callEnd = true;
      return State.isCallOver();
    });
    expect(result).toBe(true);
  });

  test('true when disqualified', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => {
      State.reset();
      State.disqualified = true;
      return State.isCallOver();
    });
    expect(result).toBe(true);
  });
});

test.describe('SystemPrompt.build', () => {
  test('includes all required sections', async ({ page }) => {
    await setupPage(page);
    const prompt = await page.evaluate(() => {
      return SystemPrompt.build('INTRO', { intent: null, geography: null, budget: null, timeline: null }, '');
    });
    expect(prompt).toContain('PRONUNCIATION GUIDE');
    expect(prompt).toContain('YOUR IDENTITY');
    expect(prompt).toContain('PROJECT KNOWLEDGE');
    expect(prompt).toContain('CONVERSATION FLOW');
    expect(prompt).toContain('EDGE CASE HANDLING');
    expect(prompt).toContain('TONE AND STYLE RULES');
    expect(prompt).toContain('RESPONSE FORMAT');
  });

  test('includes phonetic guide for all key terms', async ({ page }) => {
    await setupPage(page);
    const prompt = await page.evaluate(() => {
      return SystemPrompt.build('INTRO', { intent: null, geography: null, budget: null, timeline: null }, '');
    });
    expect(prompt).toContain('Div-yaa-shree');
    expect(prompt).toContain('Nun-dhee');
    expect(prompt).toContain('Dev-aa-naa-halli');
    expect(prompt).toContain('Luk');
    expect(prompt).toContain('Crow-r');
  });

  test('injects current stage into prompt', async ({ page }) => {
    await setupPage(page);
    const prompt = await page.evaluate(() => {
      return SystemPrompt.build('BUDGET', { intent: true, geography: true, budget: null, timeline: null }, '');
    });
    expect(prompt).toContain('Current stage: BUDGET');
    expect(prompt).toContain('"intent":true');
    expect(prompt).toContain('"geography":true');
  });

  test('injects scenario hint when provided', async ({ page }) => {
    await setupPage(page);
    const prompt = await page.evaluate(() => {
      return SystemPrompt.build('INTRO', { intent: null, geography: null, budget: null, timeline: null }, 'NRI calling from Dubai');
    });
    expect(prompt).toContain('NRI calling from Dubai');
  });

  test('omits hint line when no hint provided', async ({ page }) => {
    await setupPage(page);
    const prompt = await page.evaluate(() => {
      return SystemPrompt.build('INTRO', { intent: null, geography: null, budget: null, timeline: null }, '');
    });
    expect(prompt).not.toContain('Context hint:');
  });
});

test.describe('Scenarios', () => {
  test('all 5 scenario keys return valid objects', async ({ page }) => {
    await setupPage(page);
    const results = await page.evaluate(() => {
      return ['ideal', 'irritated', 'location-mismatch', 'nri', 'disengaged'].map(k => ({
        key: k,
        valid: Scenarios.get(k) !== null,
        hasHint: typeof (Scenarios.get(k) || {}).hint === 'string',
        hasMessage: typeof (Scenarios.get(k) || {}).firstUserMessage === 'string',
      }));
    });
    results.forEach(r => {
      expect(r.valid).toBe(true);
      expect(r.hasHint).toBe(true);
      expect(r.hasMessage).toBe(true);
    });
  });

  test('unknown key returns null', async ({ page }) => {
    await setupPage(page);
    const result = await page.evaluate(() => Scenarios.get('bogus'));
    expect(result).toBeNull();
  });
});
