// tests/helpers.js
// Shared mocks and utilities for all Playwright tests

const TEST_API_KEY = 'sk-ant-test-key-playwright';

/**
 * Injects Web Speech API mocks before the page loads.
 * Exposes window._mockRecognition and window._mockSynthesis for test control.
 */
async function injectSpeechMocks(page) {
  await page.addInitScript(() => {
    // ── SpeechRecognition mock ────────────────────────────────────────────
    function MockSpeechRecognition() {
      this.continuous = false;
      this.interimResults = false;
      this.lang = 'en-IN';
      this.onresult = null;
      this.onend = null;
      this.onerror = null;
      this._started = false;
      window._mockRecognition = this;
    }
    MockSpeechRecognition.prototype.start = function() {
      var self = this;
      this._started = true;
      // Auto-fire onend after 80ms to simulate a recognition session ending
      // (real Web Speech API fires onend when no speech is detected).
      // This enables the Voice.js silence timer to work in tests.
      setTimeout(function() {
        if (self._started && self.onend) {
          self._started = false;
          self.onend({});
        }
      }, 80);
    };
    MockSpeechRecognition.prototype.stop = function() {
      this._started = false;
      if (this.onend) this.onend({});
    };
    window.SpeechRecognition = MockSpeechRecognition;
    window.webkitSpeechRecognition = MockSpeechRecognition;

    // ── SpeechSynthesis mock ──────────────────────────────────────────────
    // NOTE: window.speechSynthesis is a read-only getter in Chromium.
    // Direct assignment (window.speechSynthesis = {...}) is silently ignored.
    // We must use Object.defineProperty to properly replace it.
    var mockUtterances = [];
    var mockSynthesis = {
      speaking: false,
      _autoComplete: true,  // auto-fire onend by default
      speak: function(utterance) {
        mockSynthesis.speaking = true;
        window._lastUtterance = utterance;
        mockUtterances.push(utterance);
        if (mockSynthesis._autoComplete) {
          setTimeout(function() {
            mockSynthesis.speaking = false;
            if (utterance.onend) utterance.onend({});
          }, 30);
        }
      },
      cancel: function() {
        mockSynthesis.speaking = false;
        mockUtterances = [];
      },
      getVoices: function() { return []; },
      addEventListener: function() {},
    };
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: mockSynthesis,
    });
    window._mockSynthesis = mockSynthesis;
    window.SpeechSynthesisUtterance = function(text) {
      this.text = text;
      this.lang = '';
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
      this.voice = null;
      this.onend = null;
      this.onerror = null;
    };

    // Helper: simulate user speaking into the mic
    window._simulateUserSpeech = function(transcript) {
      var rec = window._mockRecognition;
      if (rec && rec.onresult) {
        rec.onresult({
          results: [[{ transcript: transcript }]],
        });
      }
    };
  });
}

/**
 * Mocks all Claude API calls with a sequence of responses.
 * Each call to the API returns the next response in the array.
 * If responses run out, the last one repeats.
 */
async function mockClaudeResponses(page, responses) {
  let callCount = 0;
  await page.route('https://api.anthropic.com/v1/messages', async (route) => {
    const response = responses[Math.min(callCount, responses.length - 1)];
    callCount++;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [{ text: response }],
      }),
    });
  });
}

/**
 * Sets up the page: injects mocks, navigates, enters API key.
 */
async function setupPage(page) {
  await injectSpeechMocks(page);
  await page.goto('/');
  await page.fill('#api-key-input', TEST_API_KEY);
  await page.click('#save-key-btn');
  await page.waitForSelector('#call-screen.active');
}

/**
 * Starts a call and waits until the bot intro message appears and
 * its TTS mock fires onend.
 *
 * Timing: bot message → Voice.speak() → 100ms settle → 30ms onend = ~130ms.
 * We wait 200ms after message appears to ensure onDone callback has fired.
 */
async function startCallAndWaitForIntro(page) {
  await page.click('#start-call-btn');
  await page.waitForSelector('.message.bot .bubble', { timeout: 10000 });
  // Wait for mock TTS onend to fire (100ms inner delay + 30ms = ~130ms) + buffer
  await page.waitForTimeout(200);
}

/**
 * Simulates a user speech turn.
 *
 * Strategy: event-driven — fires speech then waits for a NEW bot message
 * to appear in the DOM (confirms Claude responded and Voice.speak was called),
 * then waits 200ms for mock TTS onend to fire.
 *
 * Pre-speech 200ms wait ensures the previous turn's TTS onDone callback
 * has fully executed before we fire new speech.
 */
async function simulateTurn(page, speech) {
  // Count existing bot messages so we can detect the next one
  const prevCount = await page.locator('.message.bot .bubble').count();
  // Brief settle — ensures previous TTS onDone has fired (~130ms) + buffer
  await page.waitForTimeout(200);
  // Fire speech into the mock microphone
  await page.evaluate((t) => window._simulateUserSpeech(t), speech);
  // Wait for Claude to respond and the new bot message to appear in DOM
  await page.waitForFunction(
    (n) => document.querySelectorAll('.message.bot .bubble').length > n,
    prevCount,
    { timeout: 10000 }
  );
  // Wait for mock TTS onend to fire (130ms) + buffer
  // If callEnd:true, endCall() is called here; showSummary() fires 900ms later
  await page.waitForTimeout(200);
}

module.exports = {
  TEST_API_KEY,
  injectSpeechMocks,
  mockClaudeResponses,
  setupPage,
  startCallAndWaitForIntro,
  simulateTurn,
};
