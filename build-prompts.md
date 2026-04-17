# Build Prompts — Divyasree Whispers of the Wind Voice Agent

A chronological record of the prompts used to design, build, and test this project — written as a development journal.

---

## Background

This project was built as a submission for a Voice AI agent assignment. The brief asked for a browser-based outbound sales call simulator for **Divyasree Developers' "Whispers of the Wind"** plotted development in Nandi Valley, North Bengaluru. The agent needed to qualify leads in real-time across four checkpoints — intent, geography, budget, and timeline — using the Web Speech API for voice I/O and the Claude API for conversational intelligence.

The entire project is vanilla HTML, CSS, and JavaScript — no frameworks, no build tools, no backend. All Claude API calls go directly from the browser to `api.anthropic.com`.

---

## Prompt 1 — Project Scoping and Architecture Decision

> "I have a Voice AI assignment for Divyasree Developers — a real estate company. They want a browser-based agent named Priya that calls leads and qualifies them for a premium plotted development called Whispers of the Wind in Nandi Valley. The agent should use real speech input and output, talk to Claude, and at the end show whether the lead is qualified, disqualified, or partial. What's the cleanest way to build this?"

**What came out of this:**
The decision to use vanilla JS with the Web Speech API (SpeechRecognition + SpeechSynthesis) and direct Claude API calls from the browser. No framework, no server. The architecture was settled as a set of five JS modules — each with a single clear responsibility — loaded via `<script>` tags in `index.html`. This kept the project zero-dependency and instantly runnable without a build step.

---

## Prompt 2 — Defining the Qualification Flow

> "The agent needs to walk the lead through a structured call: introduce herself, get permission to talk, then check four things in order — whether they want the property for personal use or investment, whether the Nandi Valley location works for them, whether the price range (92.4L to 2.46 crore) fits their budget, and whether December 2029 possession is acceptable. If any of geography or budget is a no, the call ends politely. For the timeline, try a reframe before giving up. After all four, deliver a pitch and close with a CTA."

**What came out of this:**
The conversation stage machine: `INTRO → INTENT → GEOGRAPHY → BUDGET → TIMELINE → PITCH → CTA → END`, with `DISQUALIFIED` as a branch exit. The four checkpoint flags (`intent`, `geography`, `budget`, `timeline`) were defined as `true/false/null` values tracked in state. The graceful-exit scripts for each disqualification point were also drafted here — the key constraint being that the agent never sounds transactional or desperate even when ending a call.

---

## Prompt 3 — Writing the Claude System Prompt

> "Now write the actual system prompt that Claude will receive on every turn. It needs Priya's identity, full project knowledge (plot sizes, price range, USPs, location, possession date, developer background, target buyer), the exact conversation flow with instructions for each stage, checkpoint skip rules for when the user volunteers information early, a full edge case section (irritated users, Hindi speakers, NRIs, silence, RERA questions), tone and style guidelines, and a strict response format where Claude outputs spoken text followed by a JSON metadata blob on the last line."

**What came out of this:**
`js/system-prompt.js` — a `SystemPrompt.build()` function that constructs the prompt dynamically, injecting the current stage and live checkpoint status into the prompt on every turn so Claude always knows where in the flow the conversation is. The pronunciation guide (Divyasree → "Div-yaa-shree", Nandi → "Nun-dhee") was included because the Web Speech API's TTS would otherwise mangle the names. The response format requirement — spoken text first, then a JSON object on the very last line — was a deliberate design constraint to make parsing reliable and deterministic.

---

## Prompt 4 — Voice Module (Web Speech API Abstraction)

> "Build the voice.js module. It needs to handle both speech recognition and speech synthesis. Wrap the Web Speech API so the rest of the app doesn't deal with it directly. The speak() function should cancel any ongoing speech before starting, wait a beat for the cancel to take effect, then read out the new text. After speaking, start listening again. Track whether we're currently speaking or listening and expose that state. Add a silence timer so if the user doesn't say anything for 7 seconds, the app knows."

**What came out of this:**
`js/voice.js` — the full STT/TTS abstraction. The `Voice.speak()` function uses a 100ms `setTimeout` before calling `synthesis.speak()` to allow the preceding `synthesis.cancel()` to settle (a known Web Speech API quirk). After TTS ends, a 300ms delay precedes `startListening()` to avoid the microphone picking up TTS bleed. The `onDone` callback is wired to the TTS `onend` event, which is how the app knows when it's safe to call the next Claude turn or end the call. The silence timer is a 7-second countdown that fires a retry callback — max 2 retries before gracefully closing the call.

---

## Prompt 5 — State Management Module

> "Build the state.js module. It holds all runtime state for a single call — current stage, checkpoint values, whether the call has ended, whether the lead is disqualified. It also needs a parseResponse() function that takes a raw Claude response string and separates the spoken text from the JSON metadata on the last line. And a getQualificationResult() function that determines if the lead is qualified, disqualified, or partial based on the checkpoint values."

**What came out of this:**
`js/state.js` — the call state machine. `parseResponse()` splits Claude's response by newline, grabs the last non-empty line, parses it as JSON, and returns everything before it as `spokenText`. `applyUpdate()` ingests the parsed JSON and mutates stage and checkpoint state accordingly. `isCallOver()` checks `callEnd`, `disqualified`, or `stage === 'END'` — this is the gate that determines whether the app loops back for another turn or kicks off the end-call sequence. `getQualificationResult()` encodes the qualification logic: disqualified if either geography or budget is `false`, qualified if intent + geography + budget are all `true`, partial otherwise.

---

## Prompt 6 — Claude API Client Module

> "Build claude.js — a minimal Claude API client that works directly from the browser. It should maintain the conversation history as a messages array, expose addUserMessage() and addAssistantMessage() to append to history, and have a send() function that posts to the Anthropic messages API with the current history and system prompt. Handle API errors properly — if the request fails, throw an error with the API's error message. Use claude-sonnet-4-6 and cap tokens at 512 since responses are short."

**What came out of this:**
`js/claude.js` — the API client. The `anthropic-dangerous-direct-browser-access: true` header is required for direct browser-to-API calls (bypasses Anthropic's CORS restriction that normally requires a server proxy). Token limit of 512 is intentional — Priya's responses should always be 2-3 sentences maximum, so anything approaching that limit indicates a runaway response. The error handling normalises API error payloads into plain JavaScript `Error` objects, which bubble up to the UI layer cleanly.

---

## Prompt 7 — UI Module

> "Build ui.js. It manages all DOM updates — the three screens (setup, call, summary), the stage bar that lights up as the call progresses, the call transcript, the status indicator dot, the call timer, and the qualification summary card at the end. All user-facing text that could come from Claude or from the user's speech must be set via textContent, not innerHTML, to prevent XSS. The qualification summary should show pass/fail/not-reached for all four checkpoints and a final verdict."

**What came out of this:**
`js/ui.js` — the DOM layer. The `textContent`-only rule is enforced throughout; this became relevant during testing when XSS test cases tried injecting `<script>` tags through mocked Claude responses and user speech — all rendered as literal text. The stage bar uses `data-stage` attributes for CSS-driven active state. The status dot has three states: `ready`, `speaking`, and `listening`, styled as a pulsing animation. The summary card reflects all four checkpoint outcomes with pass (✓), fail (✗), or dash (—) icons.

---

## Prompt 8 — Scenario Presets

> "Add a scenarios.js file that defines 5 pre-baked lead personas for demo and testing. I need: an ideal lead who qualifies on all four checkpoints, an irritated user who wants to be removed from the list, a location mismatch where the user wants South Bengaluru only, an NRI investor calling from Dubai who responds well to the airport angle, and a disengaged lead who's worried about the 2029 timeline but can be won over with the investment reframe. Each scenario should have a hint string that gets injected into the system prompt, and a first user message to seed the conversation."

**What came out of this:**
`js/scenarios.js` — five scenario objects, each with a `hint` (injected into the system prompt as a `Context hint:` line) and a `firstUserMessage` (automatically submitted as the first user turn after the bot's intro). The hints are written as natural-language instructions to Claude — they guide the simulated lead's behaviour without being robotic. The scenario bar in the UI is driven entirely by this file. The `Scenarios.get(key)` helper is used by tests to validate that all five keys return valid objects and unknown keys return null.

---

## Prompt 9 — App Orchestration

> "Now wire everything together in app.js. It should handle the full call lifecycle: saving the API key, starting a call (initialising Claude, playing the intro, starting the first listen), processing each turn (send user speech to Claude, get a response, speak it, check if the call is over, loop or end), ending the call (show the qualification summary), and resetting for a new call. The start/end/mute buttons in the UI should all be wired up here. Make sure the silence retry logic from voice.js feeds back into the Claude turn loop correctly."

**What came out of this:**
`js/app.js` — the call orchestrator. The main loop is `getBotResponse()`, which calls `Claude.send()`, parses the response via `State.parseResponse()`, speaks it via `Voice.speak()`, and in the `onDone` callback either loops back into listening or calls `endCall()`. The `endCall()` function has a deliberate 900ms `setTimeout` before `UI.showSummary()` — this gives TTS enough time to finish before the screen transition. The mute button toggles `Voice.stopListening()` / `Voice.startListening()` without interrupting the call flow. The `handleSilenceRetry()` callback from `voice.js` feeds back through `getBotResponse()` with a canned "sorry, I didn't catch that" injected into the conversation.

---

## Prompt 10 — Playwright Test Suite

> "Write a full Playwright test suite for this project. I need four test files: ui.spec.js for all UI rendering and interaction tests, call-flow.spec.js for complete end-to-end conversation tests covering all five scenarios, edge-cases.spec.js for silence timeouts, API errors, XSS safety, and partial qualification results, and state.spec.js for unit-level tests of the state parsing, checkpoint logic, and system prompt construction. Mock the Web Speech API (SpeechRecognition and SpeechSynthesis) and intercept all Claude API calls at the network level. The test server should be spun up automatically by Playwright's webServer config."

**What came out of this:**
The full test infrastructure in `tests/`. The helpers file (`helpers.js`) is the most complex piece — it injects `SpeechRecognition` and `SpeechSynthesis` mocks via `page.addInitScript()` before the app loads, intercepts all `POST https://api.anthropic.com/v1/messages` requests and returns mocked responses from a configurable sequence, and provides `startCallAndWaitForIntro()` and `simulateTurn()` helpers. The web server is configured in `playwright.config.js` to auto-start `http-server` on port 8765 and reuse it across test runs during development.

---

## Prompt 11 — Fixing the Test Suite (10 Failing Tests)

> "Ten tests are failing — they're all timing out waiting for the summary screen to appear. The conversation flow is completing, the bot is delivering its final message, but the summary screen never shows up within the 10-second timeout. Investigate the voice.js and app.js timing chain and fix whatever is preventing the onend callback from reaching endCall()."

**What came out of this:**
Three coordinated fixes:

1. **Web Speech API mock override**: The `window.speechSynthesis` getter is read-only in the browser environment, which meant `Object.defineProperty` was silently failing — the mock wasn't replacing the real object, so `utterance.onend` callbacks never fired. Fixed by using `Object.defineProperty` with `configurable: true` explicitly.

2. **`UI.updateCheckpoints()` method added**: Tests that simulated mid-call checkpoint updates needed a way to update the checkpoint display without triggering call-end logic. A dedicated `updateCheckpoints()` method was added to `ui.js` and called from `app.js`'s message handler on every turn.

3. **Event-driven timing in `simulateTurn()`**: The original implementation waited fixed durations (550ms + 300ms) between turns. These were replaced with DOM-driven `waitForFunction` calls that poll for a new bot message to appear in the transcript — much more reliable than time-based waits and faster overall. The summary screen assertion was updated to `waitForSelector('#summary-screen.active', { timeout: 5000 })` with the 900ms app delay accounted for.

After these three fixes, all 63 tests passed.

---

## Prompt 12 — README and Repository Cleanup

> "Write a proper README for the project. Cover what the agent does, setup instructions (Chrome only because of Web Speech API), how to run the tests, the full project structure with per-file descriptions, and a table of all five lead scenarios. Then help me clean up the git history and push it to the Anlinnazateth GitHub account with only Anlin Nazareth as the contributor."

**What came out of this:**
`README.md` covering the full project scope, Chrome-only note (Web Speech API is not supported in Firefox/Safari), `npm install` + open `index.html` as the only setup steps, and the scenario table. The git history was rewritten to remove any third-party attribution from commit metadata, and the repository was recreated fresh on GitHub under `Anlinnazateth/whispers-of-the-wind-voice-bot` with a clean single-contributor history.

---

## Summary

| Phase | Prompts | Output |
|---|---|---|
| Architecture | 1 | Project structure decision, module split |
| Domain logic | 2 | Qualification flow, stage machine, disqualification scripts |
| Claude integration | 3, 6 | System prompt, Claude API client |
| Voice layer | 4 | Web Speech API abstraction (STT + TTS) |
| State layer | 5 | Call state, JSON parsing, qualification logic |
| UI layer | 7 | DOM module, XSS-safe rendering |
| Demo tooling | 8 | 5 scenario presets |
| Orchestration | 9 | Full call lifecycle wiring |
| Testing | 10, 11 | 63 Playwright tests, mock infrastructure, 10-test fix |
| Documentation | 12 | README, repo cleanup |

Total: 12 prompts from blank canvas to a fully tested, deployed repository.
