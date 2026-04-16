# Divyasree Voice AI Agent — Whispers of the Wind

A browser-based voice AI demo that simulates an outbound sales call for Divyasree Developers' **Whispers of the Wind** plotted development in Nandi Valley, Bengaluru.

## What it does

The agent (Priya) conducts a structured qualification call using the Web Speech API for voice input/output and the Claude API for conversation intelligence. It progresses through defined stages — Intro → Intent → Geography → Budget → Timeline → Pitch → CTA — and produces a qualification summary at the end of each call.

## Setup

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```
3. Open `index.html` in a browser (Chrome recommended — requires Web Speech API)
4. Enter your [Claude API key](https://console.anthropic.com/) on the setup screen
5. Click **Start Call**

No server required. All API calls go directly from the browser to `api.anthropic.com`.

## Running tests

```bash
npx playwright test
```

63 Playwright tests cover UI rendering, call flows, all 5 lead scenarios, qualification logic, silence timeouts, API error handling, and XSS safety.

## Project structure

```
index.html          Main UI
js/
  app.js            Call orchestration and Claude API integration
  voice.js          Web Speech API (STT + TTS) abstraction
  state.js          Call state and JSON parsing from Claude responses
  ui.js             DOM manipulation — transcript, stage bar, status, timer
  scenarios.js      5 preset lead personas for testing
  prompts.js        System prompt for Claude
css/
  style.css         All styles
tests/
  helpers.js        Shared Playwright mocks and utilities
  ui.spec.js        UI rendering and interaction tests
  call-flow.spec.js Full conversation flow tests (all 5 scenarios)
  edge-cases.spec.js Silence timeouts, API errors, XSS, edge cases
```

## Lead scenarios

| Scenario | Description |
|---|---|
| Ideal Lead | Qualified on all four checkpoints |
| Irritated | Asks to be removed — call ends immediately |
| Location Mismatch | Disqualified at geography checkpoint |
| NRI Investor | Airport-proximity pitch angle |
| Disengaged | Timeline objection triggers investment reframe |
