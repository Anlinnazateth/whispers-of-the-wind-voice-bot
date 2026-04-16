# Divyasree Voice AI Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based outbound AI voice agent that qualifies leads for Divyasree's "Whispers of the Wind" luxury villa plot project using Claude API + Web Speech API.

**Architecture:** Single-page app with no build tools — open `index.html` in Chrome. Web Speech API handles STT/TTS, Claude API drives conversation intelligence, JS state machine tracks qualification checkpoints. STT is disabled while TTS is active to prevent echo loops.

**Tech Stack:** Vanilla HTML/CSS/JS, Web Speech API (SpeechRecognition + SpeechSynthesis), Claude API (claude-sonnet-4-6), localStorage for API key persistence.

---

## File Structure

```
D:/Anlin/
├── index.html              # Main entry point — layout + script imports
├── css/
│   └── styles.css          # All styling — dark premium theme
├── js/
│   ├── system-prompt.js    # Builds the full Claude system prompt dynamically
│   ├── scenarios.js        # 5 preset conversation scenarios for recording
│   ├── claude.js           # Claude API client (send message, get response)
│   ├── voice.js            # Web Speech API wrapper (STT + TTS + echo prevention)
│   ├── state.js            # Conversation state machine + checkpoint tracking
│   ├── ui.js               # All DOM updates (transcript, stage bar, timer, card)
│   └── app.js              # Main orchestration — wires all modules together
└── docs/
    └── superpowers/
        ├── specs/2026-04-16-voice-ai-bot-design.md
        └── plans/2026-04-16-voice-ai-bot.md
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `index.html`
- Create: `css/styles.css`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Divyasree Voice Agent — Whispers of the Wind</title>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <!-- API Key Setup -->
  <div id="setup-screen" class="screen active">
    <div class="setup-card">
      <h1>Divyasree Voice Agent</h1>
      <p class="subtitle">Whispers of the Wind — Lead Qualifier</p>
      <input type="password" id="api-key-input" placeholder="Enter your Anthropic API key" />
      <button id="save-key-btn">Start Agent</button>
      <p class="note">Your key is stored locally and never shared.</p>
    </div>
  </div>

  <!-- Call Screen -->
  <div id="call-screen" class="screen">
    <!-- Header -->
    <div class="call-header">
      <div class="agent-info">
        <div class="avatar">P</div>
        <div>
          <div class="agent-name">Priya</div>
          <div class="agent-role">Divyasree Consultant</div>
        </div>
      </div>
      <div id="call-timer" class="call-timer">0:00</div>
    </div>

    <!-- Stage Indicator -->
    <div class="stage-bar">
      <div class="stage-item" data-stage="INTRO">Intro</div>
      <div class="stage-item" data-stage="INTENT">Intent</div>
      <div class="stage-item" data-stage="GEOGRAPHY">Location</div>
      <div class="stage-item" data-stage="BUDGET">Budget</div>
      <div class="stage-item" data-stage="TIMELINE">Timeline</div>
      <div class="stage-item" data-stage="PITCH">Pitch</div>
      <div class="stage-item" data-stage="CTA">CTA</div>
    </div>

    <!-- Scenario Presets -->
    <div class="scenario-bar">
      <span class="scenario-label">Scenario:</span>
      <button class="scenario-btn" data-scenario="ideal">1. Ideal Lead</button>
      <button class="scenario-btn" data-scenario="irritated">2. Irritated</button>
      <button class="scenario-btn" data-scenario="location-mismatch">3. Location Mismatch</button>
      <button class="scenario-btn" data-scenario="nri">4. NRI Investor</button>
      <button class="scenario-btn" data-scenario="disengaged">5. Disengaged</button>
    </div>

    <!-- Transcript -->
    <div id="transcript" class="transcript"></div>

    <!-- Status + Controls -->
    <div class="call-controls">
      <div id="status-indicator" class="status-indicator">
        <div class="status-dot"></div>
        <span id="status-text">Ready</span>
      </div>
      <button id="start-call-btn" class="btn-primary">Start Call</button>
      <button id="mute-btn" class="btn-secondary" disabled>Mute</button>
      <button id="end-call-btn" class="btn-danger" disabled>End Call</button>
    </div>
  </div>

  <!-- Qualification Summary Card -->
  <div id="summary-screen" class="screen">
    <div class="summary-card">
      <h2>Lead Qualification Summary</h2>
      <div class="checkpoints">
        <div class="checkpoint" id="cp-intent">
          <span class="cp-icon">&#9675;</span>
          <span class="cp-label">Intent (Self-use / Investment)</span>
          <span class="cp-value" id="cp-intent-value">&#8212;</span>
        </div>
        <div class="checkpoint" id="cp-geography">
          <span class="cp-icon">&#9675;</span>
          <span class="cp-label">Geography Fit</span>
          <span class="cp-value" id="cp-geography-value">&#8212;</span>
        </div>
        <div class="checkpoint" id="cp-budget">
          <span class="cp-icon">&#9675;</span>
          <span class="cp-label">Budget Fit (92.4L+)</span>
          <span class="cp-value" id="cp-budget-value">&#8212;</span>
        </div>
        <div class="checkpoint" id="cp-timeline">
          <span class="cp-icon">&#9675;</span>
          <span class="cp-label">Timeline (Dec 2029)</span>
          <span class="cp-value" id="cp-timeline-value">&#8212;</span>
        </div>
      </div>
      <div id="qualification-result" class="qualification-result"></div>
      <button id="new-call-btn" class="btn-primary">Start New Call</button>
    </div>
  </div>

  <script src="js/system-prompt.js"></script>
  <script src="js/scenarios.js"></script>
  <script src="js/claude.js"></script>
  <script src="js/voice.js"></script>
  <script src="js/state.js"></script>
  <script src="js/ui.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `css/styles.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: #0a0a0f;
  color: #e8e8f0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.screen { display: none; width: 100%; max-width: 720px; padding: 24px; }
.screen.active { display: flex; flex-direction: column; gap: 16px; }

/* Setup */
.setup-card {
  background: #13131a;
  border: 1px solid #2a2a3a;
  border-radius: 16px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  text-align: center;
}
.setup-card h1 { font-size: 1.8rem; color: #c9a96e; }
.subtitle { color: #888; font-size: 0.9rem; }
#api-key-input {
  width: 100%;
  padding: 12px 16px;
  background: #1e1e2e;
  border: 1px solid #3a3a4a;
  border-radius: 8px;
  color: #e8e8f0;
  font-size: 0.95rem;
}
.note { font-size: 0.75rem; color: #555; }

/* Call Header */
.call-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #13131a;
  border: 1px solid #2a2a3a;
  border-radius: 12px;
  padding: 16px 20px;
}
.agent-info { display: flex; align-items: center; gap: 12px; }
.avatar {
  width: 44px; height: 44px;
  background: linear-gradient(135deg, #c9a96e, #8b6914);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 1.1rem; color: #fff;
}
.agent-name { font-weight: 600; font-size: 1rem; }
.agent-role { font-size: 0.8rem; color: #888; }
.call-timer { font-size: 1.4rem; font-weight: 700; color: #c9a96e; font-variant-numeric: tabular-nums; }

/* Stage Bar */
.stage-bar {
  display: flex;
  gap: 4px;
  background: #13131a;
  border: 1px solid #2a2a3a;
  border-radius: 12px;
  padding: 12px 16px;
}
.stage-item {
  flex: 1;
  text-align: center;
  font-size: 0.7rem;
  padding: 6px 4px;
  border-radius: 6px;
  color: #555;
  transition: all 0.3s;
}
.stage-item.active { background: #c9a96e22; color: #c9a96e; font-weight: 600; }
.stage-item.completed { background: #22c55e22; color: #22c55e; }
.stage-item.disqualified { background: #ef444422; color: #ef4444; }

/* Scenario Bar */
.scenario-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: #13131a;
  border: 1px solid #2a2a3a;
  border-radius: 12px;
  padding: 12px 16px;
}
.scenario-label { font-size: 0.75rem; color: #888; }
.scenario-btn {
  font-size: 0.72rem;
  padding: 5px 10px;
  background: #1e1e2e;
  border: 1px solid #3a3a4a;
  border-radius: 6px;
  color: #aaa;
  cursor: pointer;
  transition: all 0.2s;
}
.scenario-btn:hover { border-color: #c9a96e; color: #c9a96e; }
.scenario-btn.active { background: #c9a96e22; border-color: #c9a96e; color: #c9a96e; }

/* Transcript */
.transcript {
  background: #13131a;
  border: 1px solid #2a2a3a;
  border-radius: 12px;
  padding: 16px;
  height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.message { display: flex; flex-direction: column; gap: 2px; }
.message.bot .bubble {
  background: #1e1e2e;
  border: 1px solid #2a2a3a;
  border-radius: 12px 12px 12px 4px;
  padding: 10px 14px;
  max-width: 80%;
  font-size: 0.88rem;
  line-height: 1.5;
  color: #c9a96e;
}
.message.user .bubble {
  background: #1a2a1a;
  border: 1px solid #2a3a2a;
  border-radius: 12px 12px 4px 12px;
  padding: 10px 14px;
  max-width: 80%;
  align-self: flex-end;
  font-size: 0.88rem;
  line-height: 1.5;
  color: #86efac;
}
.message .speaker { font-size: 0.68rem; color: #555; }
.message.user .speaker { text-align: right; }

/* Controls */
.call-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #13131a;
  border: 1px solid #2a2a3a;
  border-radius: 12px;
  padding: 16px 20px;
}
.status-indicator { display: flex; align-items: center; gap: 8px; flex: 1; }
.status-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #555;
  transition: background 0.3s;
}
.status-dot.listening { background: #22c55e; animation: pulse 1s infinite; }
.status-dot.speaking { background: #c9a96e; animation: pulse 0.7s infinite; }
.status-dot.thinking { background: #6366f1; animation: pulse 1.5s infinite; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
#status-text { font-size: 0.85rem; color: #888; }

/* Buttons */
.btn-primary, .btn-secondary, .btn-danger {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}
.btn-primary { background: #c9a96e; color: #0a0a0f; }
.btn-primary:hover { background: #d4b87a; }
.btn-secondary { background: #1e1e2e; border: 1px solid #3a3a4a; color: #aaa; }
.btn-secondary:hover:not(:disabled) { border-color: #c9a96e; color: #c9a96e; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-danger:hover:not(:disabled) { background: #dc2626; }
button:disabled { opacity: 0.4; cursor: not-allowed; }

/* Summary */
.summary-card {
  background: #13131a;
  border: 1px solid #2a2a3a;
  border-radius: 16px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.summary-card h2 { color: #c9a96e; }
.checkpoints { display: flex; flex-direction: column; gap: 12px; }
.checkpoint {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #1e1e2e;
  border-radius: 8px;
  border: 1px solid #2a2a3a;
}
.cp-icon { font-size: 1.1rem; }
.cp-label { flex: 1; font-size: 0.9rem; color: #aaa; }
.cp-value { font-size: 0.85rem; font-weight: 600; color: #888; }
.checkpoint.pass .cp-icon { color: #22c55e; }
.checkpoint.pass .cp-value { color: #22c55e; }
.checkpoint.fail .cp-icon { color: #ef4444; }
.checkpoint.fail .cp-value { color: #ef4444; }
.checkpoint.partial .cp-icon { color: #f59e0b; }
.checkpoint.partial .cp-value { color: #f59e0b; }
.qualification-result {
  padding: 16px;
  border-radius: 8px;
  font-weight: 600;
  text-align: center;
  font-size: 1rem;
}
.qualification-result.qualified { background: #22c55e22; color: #22c55e; border: 1px solid #22c55e44; }
.qualification-result.disqualified { background: #ef444422; color: #ef4444; border: 1px solid #ef444444; }
.qualification-result.partial { background: #f59e0b22; color: #f59e0b; border: 1px solid #f59e0b44; }
```

- [ ] **Step 3: Open `index.html` in Chrome and verify all three screens render without errors (setup-screen visible, call-screen and summary-screen hidden)**

---

## Task 2: System Prompt Builder

**Files:**
- Create: `js/system-prompt.js`

- [ ] **Step 1: Create `js/system-prompt.js`**

```javascript
// system-prompt.js
// Builds the Claude system prompt dynamically based on current conversation state

const SystemPrompt = {
  /**
   * Returns the full system prompt string.
   * @param {string} currentStage - Current stage from state machine
   * @param {object} checkpoints - { intent, geography, budget, timeline } each true/false/null
   * @param {string} scenarioHint - Optional hint for scenario context
   */
  build(currentStage, checkpoints, scenarioHint) {
    scenarioHint = scenarioHint || '';
    return [
      '## PRONUNCIATION GUIDE (always pronounce these correctly)',
      '- Divyasree -> "Div-yaa-shree"',
      '- Nandi -> "Nun-dhee"',
      '- Devanahalli -> "Dev-aa-naa-halli"',
      '- Lakh -> "Luk" (rhymes with luck)',
      '- Crore -> "Crow-r"',
      '- Bengaluru -> "Ben-guh-LOO-roo"',
      '',
      '## YOUR IDENTITY',
      'You are Priya, a senior consultant at Divyasree Developers. You are calling about the "Whispers of the Wind" (WOW) project — premium Private Valley villa plots in Nandi Valley, North Bengaluru.',
      '',
      '## PROJECT KNOWLEDGE',
      '- Product: Premium villa plots, 1200-3199 sq.ft.',
      '- Location: Nandi Valley, near Nandi Hills and Devanahalli corridor, North Bengaluru',
      '- Price: Rs 92.4 lakh to Rs 2.46 crore (all taxes inclusive)',
      '- USP: 74% open green spaces, 20,000 sq.ft. clubhouse, eco-parks, scenic hill views, private valley setting',
      '- Possession: December 2029',
      '- Developer: Divyasree Developers — established Bengaluru developer',
      '- Airport connectivity: 15-20 mins from Kempegowda International Airport (KIAL)',
      '- Investment angle: Devanahalli corridor is one of Bengaluru fastest-appreciating micro-markets',
      '- RERA registered project',
      '- Target buyer: HNIs, CXOs, NRIs — luxury weekend home or high-yield investment',
      '',
      '## CONVERSATION FLOW',
      'Current stage: ' + currentStage,
      'Checkpoint status: ' + JSON.stringify(checkpoints),
      scenarioHint ? ('Context hint: ' + scenarioHint) : '',
      '',
      'Follow this exact flow. Only move to the next stage when the current one is resolved.',
      'Never re-ask something the user has already answered.',
      '',
      '**INTRO:**',
      'Greet warmly. Introduce yourself as Priya from Divyasree. Mention "Whispers of the Wind" and Nandi Valley. Ask: "Is this a good time for a quick 2-3 minute conversation?" If no -> thank and exit. Keep intro under 3 sentences.',
      '',
      '**INTENT (checkpoint 1):**',
      'Ask: "Are you exploring this more for personal use — like a luxury weekend retreat — or as an investment?"',
      'Skip if: user already mentioned intent in INTRO.',
      'If answered: acknowledge with affirmation ("Perfect", "Understood", "That is great").',
      '',
      '**GEOGRAPHY (checkpoint 2):**',
      'Ask: "The project is in Nandi Valley, near Nandi Hills and the Devanahalli corridor in North Bengaluru. Does that location work for you?"',
      'Skip if: user already confirmed location comfort.',
      'If NO: "Understood, that is helpful to know. I appreciate your time and will not keep you. If your plans change, we would love to connect." Then end call gracefully.',
      '',
      '**BUDGET (checkpoint 3):**',
      'Ask: "Our plots are priced from Rs 92.4 lakh going up to Rs 2.46 crore, all-inclusive. Does that range align with your budget?"',
      'Skip if: user already confirmed budget.',
      'If NO: "That is completely fine — I appreciate you sharing that. We will keep you in mind if anything fits better in the future." Then end call gracefully.',
      '',
      '**TIMELINE (checkpoint 4):**',
      'Ask: "Possession is scheduled for December 2029. Are you comfortable with that kind of timeline?"',
      'Skip if: user already confirmed timeline.',
      'If NO (investment angle): "Many of our buyers actually prefer the phased timeline — it means lower entry price and strong appreciation by possession. Does that change your perspective?"',
      '',
      '**PITCH:**',
      'Deliver this aspirational description naturally (do not read it robotically):',
      '"Whispers of the Wind is unlike any plotted development in Bengaluru. Imagine 74% of the entire community as open green space — eco-parks, walking trails, and direct views of the Nandi Hills. The 20,000 square foot clubhouse is built for a community of like-minded families. These Private Valley plots are 1200 to 3199 square feet — large enough to build the home you actually want, in a setting that feels like a world away from the city."',
      '',
      '**CTA:**',
      '"I would love to have our Property Expert walk you through the exact site plan, current availability, and investment projections. Could I schedule a quick 15-minute call for you? What day works best?"',
      '',
      '## EDGE CASE HANDLING',
      '- Irritated user / "stop calling me": "I completely understand and I sincerely apologize for the interruption. Have a wonderful day." End immediately.',
      '- User speaks Hindi: Switch entirely to Hindi. Continue the full conversation in Hindi using the same flow.',
      '- NRI caller: Emphasize airport proximity (15-20 min to KIAL), NRI investment regulations, appreciation in Devanahalli corridor.',
      '- Silent / no response: "Sorry, I did not catch that — could you say that again?" Max 2 retries, then: "I will have someone from our team follow up at a better time. Thank you!"',
      '- "Tell me more about the project": Share project details from the knowledge base above.',
      '- Budget fit but location mismatch: Disqualify gracefully at GEOGRAPHY stage.',
      '- Location fit but budget mismatch: Disqualify gracefully at BUDGET stage.',
      '- User already visited site: "That is wonderful! What did you think?" Then go directly to CTA.',
      '',
      '## TONE AND STYLE RULES',
      '- Max 2-3 sentences per response',
      '- Use natural affirmations: "Understood", "Perfect", "Absolutely", "That is great to hear", "Of course"',
      '- Premium, warm, confident — never pushy or desperate',
      '- Never mention competitors',
      '- Never make promises about returns or guaranteed appreciation',
      '- Speak conversationally — this is a phone call, not a sales script',
      '',
      '## RESPONSE FORMAT',
      'Respond with ONLY the spoken words. No stage labels, no metadata, no JSON.',
      'At the END of your response, on a new line, add a JSON object (this will be parsed programmatically, not spoken):',
      '{"stage": "CURRENT_STAGE", "checkpoints": {"intent": true/false/null, "geography": true/false/null, "budget": true/false/null, "timeline": true/false/null}, "callEnd": false, "disqualified": false}',
    ].filter(line => line !== null).join('\n');
  }
};
```

- [ ] **Step 2: Open browser console, load `index.html`, run:**

```javascript
console.log(SystemPrompt.build('INTRO', {intent: null, geography: null, budget: null, timeline: null}, ''));
```

Verify the output includes all sections: pronunciation, identity, project knowledge, flow, edge cases, tone rules, response format.

- [ ] **Step 3: Commit**

```bash
git add index.html css/styles.css js/system-prompt.js
git commit -m "feat: scaffold UI and system prompt builder"
```

---

## Task 3: Conversation State Machine

**Files:**
- Create: `js/state.js`

- [ ] **Step 1: Create `js/state.js`**

```javascript
// state.js
// Tracks conversation stage and checkpoint qualification status

const STAGES = ['INTRO', 'INTENT', 'GEOGRAPHY', 'BUDGET', 'TIMELINE', 'PITCH', 'CTA', 'END', 'DISQUALIFIED'];

const State = {
  stage: 'INTRO',
  checkpoints: {
    intent: null,      // null = unanswered, true = pass, false = fail
    geography: null,
    budget: null,
    timeline: null,
  },
  callEnd: false,
  disqualified: false,
  activeScenario: null,

  reset: function() {
    this.stage = 'INTRO';
    this.checkpoints = { intent: null, geography: null, budget: null, timeline: null };
    this.callEnd = false;
    this.disqualified = false;
    this.activeScenario = null;
  },

  /**
   * Applies state updates parsed from Claude's JSON metadata.
   * @param {object} parsed - { stage, checkpoints, callEnd, disqualified }
   */
  applyUpdate: function(parsed) {
    if (parsed.stage && STAGES.includes(parsed.stage)) {
      this.stage = parsed.stage;
    }
    if (parsed.checkpoints) {
      Object.assign(this.checkpoints, parsed.checkpoints);
    }
    if (parsed.callEnd === true) this.callEnd = true;
    if (parsed.disqualified === true) {
      this.disqualified = true;
      this.stage = 'DISQUALIFIED';
    }
  },

  /**
   * Extracts JSON metadata from Claude's raw response.
   * Returns { spokenText, metadata }
   * @param {string} raw - Full Claude response text
   */
  parseResponse: function(raw) {
    var jsonMatch = raw.match(/\{[\s\S]*\}$/);
    if (!jsonMatch) return { spokenText: raw.trim(), metadata: null };
    try {
      var metadata = JSON.parse(jsonMatch[0]);
      var spokenText = raw.slice(0, raw.lastIndexOf(jsonMatch[0])).trim();
      return { spokenText: spokenText, metadata: metadata };
    } catch (e) {
      return { spokenText: raw.trim(), metadata: null };
    }
  },

  isCallOver: function() {
    return this.callEnd || this.disqualified || this.stage === 'END';
  },

  getQualificationResult: function() {
    var cp = this.checkpoints;
    if (cp.geography === false || cp.budget === false) return 'disqualified';
    if (cp.intent === true && cp.geography === true && cp.budget === true) return 'qualified';
    return 'partial';
  }
};
```

- [ ] **Step 2: Verify in browser console after loading `index.html`:**

```javascript
State.reset();
console.assert(State.stage === 'INTRO', 'Initial stage should be INTRO');

State.applyUpdate({ stage: 'GEOGRAPHY', checkpoints: { intent: true, geography: null, budget: null, timeline: null } });
console.assert(State.stage === 'GEOGRAPHY', 'Stage should update to GEOGRAPHY');
console.assert(State.checkpoints.intent === true, 'Intent checkpoint should be true');

var parsed = State.parseResponse('Hello, is this a good time?\n{"stage": "INTRO", "checkpoints": {"intent": null, "geography": null, "budget": null, "timeline": null}, "callEnd": false, "disqualified": false}');
console.assert(parsed.spokenText === 'Hello, is this a good time?', 'Should extract spoken text');
console.assert(parsed.metadata.stage === 'INTRO', 'Should parse metadata stage');

console.log('All State tests passed');
```

- [ ] **Step 3: Commit**

```bash
git add js/state.js
git commit -m "feat: add conversation state machine"
```

---

## Task 4: Claude API Client

**Files:**
- Create: `js/claude.js`

- [ ] **Step 1: Create `js/claude.js`**

```javascript
// claude.js
// Sends conversation history to Claude API and returns the response text

var Claude = {
  apiKey: null,
  model: 'claude-sonnet-4-6',
  messages: [],

  init: function(apiKey) {
    this.apiKey = apiKey;
    this.messages = [];
  },

  reset: function() {
    this.messages = [];
  },

  addUserMessage: function(text) {
    this.messages.push({ role: 'user', content: text });
  },

  addAssistantMessage: function(text) {
    this.messages.push({ role: 'assistant', content: text });
  },

  /**
   * Sends the current conversation to Claude and returns the response text.
   * @param {string} systemPrompt - Full system prompt string
   * @returns {Promise<string>} - Raw response text (includes JSON metadata at end)
   */
  send: function(systemPrompt) {
    var self = this;
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': self.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: self.model,
        max_tokens: 512,
        system: systemPrompt,
        messages: self.messages,
      }),
    }).then(function(response) {
      if (!response.ok) {
        return response.json().catch(function() { return {}; }).then(function(err) {
          throw new Error((err && err.error && err.error.message) || ('API error ' + response.status));
        });
      }
      return response.json();
    }).then(function(data) {
      return (data.content && data.content[0] && data.content[0].text) || '';
    });
  }
};
```

- [ ] **Step 2: Verify in browser console (requires a valid API key saved in localStorage):**

```javascript
Claude.init(localStorage.getItem('anthropic_key'));
Claude.addUserMessage('Hello, is this a good time to talk?');
Claude.send(SystemPrompt.build('INTRO', {intent:null,geography:null,budget:null,timeline:null}, ''))
  .then(function(r) { console.log('Claude response:', r); })
  .catch(function(e) { console.error('API error:', e); });
```

Expected: A spoken response from Priya followed by a JSON object on the last line.

- [ ] **Step 3: Commit**

```bash
git add js/claude.js
git commit -m "feat: add Claude API client"
```

---

## Task 5: Voice Module (STT + TTS with Echo Prevention)

**Files:**
- Create: `js/voice.js`

- [ ] **Step 1: Create `js/voice.js`**

```javascript
// voice.js
// Web Speech API wrapper
// CRITICAL: STT is disabled while TTS is active to prevent echo loop

var Voice = {
  recognition: null,
  synthesis: window.speechSynthesis,
  isSpeaking: false,
  isListening: false,
  onUserSpeech: null,
  onSilenceTimeout: null,
  silenceTimer: null,
  SILENCE_TIMEOUT_MS: 7000,

  init: function() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) throw new Error('Web Speech API not supported. Use Chrome or Edge.');

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-IN';

    var self = this;

    this.recognition.onresult = function(event) {
      clearTimeout(self.silenceTimer);
      var transcript = event.results[0][0].transcript.trim();
      if (transcript && self.onUserSpeech) self.onUserSpeech(transcript);
    };

    this.recognition.onend = function() {
      self.isListening = false;
      if (!self.isSpeaking) {
        self.silenceTimer = setTimeout(function() {
          if (self.onSilenceTimeout) self.onSilenceTimeout();
        }, self.SILENCE_TIMEOUT_MS);
      }
    };

    this.recognition.onerror = function(event) {
      if (event.error === 'no-speech' && !self.isSpeaking) {
        self._startListening();
      }
    };
  },

  _startListening: function() {
    if (this.isSpeaking || this.isListening) return;
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      // Already started — ignore
    }
  },

  startListening: function() {
    clearTimeout(this.silenceTimer);
    this._startListening();
  },

  stopListening: function() {
    clearTimeout(this.silenceTimer);
    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  },

  /**
   * Speaks text aloud. Disables STT while speaking, re-enables after.
   * @param {string} text - Text to speak (spoken text only, no JSON metadata)
   * @param {function} onDone - Called when speech finishes
   */
  speak: function(text, onDone) {
    this.stopListening();
    this.synthesis.cancel();
    this.isSpeaking = true;
    var self = this;

    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 0.92;
    utterance.pitch = 1.05;

    var voices = this.synthesis.getVoices();
    var femaleVoice = voices.find(function(v) {
      return v.lang.startsWith('en') && (
        v.name.indexOf('Female') !== -1 ||
        v.name.indexOf('Zira') !== -1 ||
        v.name.indexOf('Samantha') !== -1 ||
        v.name.indexOf('Google UK English Female') !== -1
      );
    });
    if (femaleVoice) utterance.voice = femaleVoice;

    utterance.onend = function() {
      self.isSpeaking = false;
      if (onDone) onDone();
      self.startListening();
    };

    utterance.onerror = function() {
      self.isSpeaking = false;
      if (onDone) onDone();
    };

    this.synthesis.speak(utterance);
  },

  stop: function() {
    this.stopListening();
    this.synthesis.cancel();
    this.isSpeaking = false;
    clearTimeout(this.silenceTimer);
  },

  setLanguage: function(lang) {
    this.recognition.lang = lang;
  }
};
```

- [ ] **Step 2: Verify in browser console:**

```javascript
Voice.init();
Voice.onUserSpeech = function(text) { console.log('Heard:', text); };
Voice.speak('Hello, this is a test of the voice module.', function() {
  console.log('Speech done — now listening');
});
// Speak a few words into your mic — should log "Heard: [your words]"
```

- [ ] **Step 3: Commit**

```bash
git add js/voice.js
git commit -m "feat: add voice module with echo prevention"
```

---

## Task 6: Scenario Presets

**Files:**
- Create: `js/scenarios.js`

- [ ] **Step 1: Create `js/scenarios.js`**

```javascript
// scenarios.js
// 5 preset conversation scenarios for screen recording

var Scenarios = {
  ideal: {
    label: '1. Ideal Lead',
    hint: 'User is receptive, interested in investment, comfortable with Nandi Hills, budget is 1.5 crore, timeline is fine. Move through all checkpoints smoothly to CTA.',
    firstUserMessage: 'Hello?',
  },
  irritated: {
    label: '2. Irritated',
    hint: 'User is irritated and busy. They say stop calling them immediately after the intro. Handle with grace and exit.',
    firstUserMessage: 'Hello? Who is this?',
  },
  'location-mismatch': {
    label: '3. Location Mismatch',
    hint: 'User has budget (1 crore), interested in investment, but is not comfortable with Nandi Hills — they want a property in South Bengaluru only. Disqualify gracefully at geography checkpoint.',
    firstUserMessage: 'Yes, hello?',
  },
  nri: {
    label: '4. NRI Investor',
    hint: 'User is an NRI based in Dubai. Interested in investment back in India. Emphasize airport proximity, NRI investment ease, Devanahalli corridor appreciation. All checkpoints pass.',
    firstUserMessage: 'Hi, yes I saw your message. I am calling from Dubai.',
  },
  disengaged: {
    label: '5. Disengaged',
    hint: 'User is lukewarm and distracted. Has timeline concern (2029 feels too far). Use the investment reframe angle. Eventually warm up to CTA.',
    firstUserMessage: 'Yeah, hi. What is this about?',
  },

  get: function(key) {
    return this[key] && typeof this[key] === 'object' && this[key].hint ? this[key] : null;
  }
};
```

- [ ] **Step 2: Verify in browser console:**

```javascript
console.assert(Scenarios.get('ideal') !== null, 'ideal scenario exists');
console.assert(Scenarios.get('nri').firstUserMessage.indexOf('Dubai') !== -1, 'NRI scenario has Dubai message');
console.assert(Scenarios.get('nonexistent') === null, 'missing scenario returns null');
console.log('Scenario tests passed');
```

- [ ] **Step 3: Commit**

```bash
git add js/scenarios.js
git commit -m "feat: add 5 conversation scenario presets"
```

---

## Task 7: UI Module

**Files:**
- Create: `js/ui.js`

- [ ] **Step 1: Create `js/ui.js`**

Note: All DOM text is set via `textContent` — never `innerHTML` — to avoid XSS.

```javascript
// ui.js
// All DOM manipulation — transcript, stage bar, status, timer, qualification card
// Security: uses textContent for all user-derived and API-derived text (no innerHTML)

var UI = {
  timerInterval: null,
  secondsElapsed: 0,

  // ── Screen switching ──────────────────────────────────────────
  showScreen: function(id) {
    document.querySelectorAll('.screen').forEach(function(s) {
      s.classList.remove('active');
    });
    document.getElementById(id).classList.add('active');
  },

  // ── Stage bar ─────────────────────────────────────────────────
  updateStage: function(stage) {
    var stageOrder = ['INTRO', 'INTENT', 'GEOGRAPHY', 'BUDGET', 'TIMELINE', 'PITCH', 'CTA', 'END'];
    var currentIndex = stageOrder.indexOf(stage);
    document.querySelectorAll('.stage-item').forEach(function(el, i) {
      el.classList.remove('active', 'completed', 'disqualified');
      if (stage === 'DISQUALIFIED') {
        if (i <= currentIndex) el.classList.add('disqualified');
      } else if (i < currentIndex) {
        el.classList.add('completed');
      } else if (i === currentIndex) {
        el.classList.add('active');
      }
    });
  },

  // ── Transcript ────────────────────────────────────────────────
  // Uses DOM API (createElement + textContent) — never innerHTML — to prevent XSS
  addMessage: function(role, text) {
    var transcript = document.getElementById('transcript');

    var msgEl = document.createElement('div');
    msgEl.className = 'message ' + role;

    var speakerEl = document.createElement('div');
    speakerEl.className = 'speaker';
    speakerEl.textContent = role === 'bot' ? 'Priya (Agent)' : 'Lead';

    var bubbleEl = document.createElement('div');
    bubbleEl.className = 'bubble';
    bubbleEl.textContent = text;

    msgEl.appendChild(speakerEl);
    msgEl.appendChild(bubbleEl);
    transcript.appendChild(msgEl);
    transcript.scrollTop = transcript.scrollHeight;
  },

  clearTranscript: function() {
    var t = document.getElementById('transcript');
    while (t.firstChild) t.removeChild(t.firstChild);
  },

  // ── Status indicator ──────────────────────────────────────────
  setStatus: function(state, text) {
    var dot = document.querySelector('.status-dot');
    var label = document.getElementById('status-text');
    dot.className = 'status-dot';
    if (state) dot.classList.add(state);
    label.textContent = text;
  },

  // ── Timer ─────────────────────────────────────────────────────
  startTimer: function() {
    var self = this;
    this.secondsElapsed = 0;
    this.timerInterval = setInterval(function() {
      self.secondsElapsed++;
      var m = Math.floor(self.secondsElapsed / 60);
      var s = self.secondsElapsed % 60;
      document.getElementById('call-timer').textContent = m + ':' + (s < 10 ? '0' : '') + s;
    }, 1000);
  },

  stopTimer: function() {
    clearInterval(this.timerInterval);
  },

  // ── Scenario buttons ──────────────────────────────────────────
  setActiveScenario: function(key) {
    document.querySelectorAll('.scenario-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.scenario === key);
    });
  },

  // ── Button states ─────────────────────────────────────────────
  setCallActive: function(active) {
    document.getElementById('start-call-btn').disabled = active;
    document.getElementById('end-call-btn').disabled = !active;
    document.getElementById('mute-btn').disabled = !active;
  },

  setMuted: function(muted) {
    document.getElementById('mute-btn').textContent = muted ? 'Unmute' : 'Mute';
  },

  // ── Qualification summary card ────────────────────────────────
  showSummary: function(checkpoints, result) {
    var entries = [
      { key: 'intent', id: 'cp-intent' },
      { key: 'geography', id: 'cp-geography' },
      { key: 'budget', id: 'cp-budget' },
      { key: 'timeline', id: 'cp-timeline' },
    ];

    entries.forEach(function(entry) {
      var el = document.getElementById(entry.id);
      var valueEl = document.getElementById(entry.id + '-value');
      var icon = el.querySelector('.cp-icon');
      el.classList.remove('pass', 'fail', 'partial');
      if (checkpoints[entry.key] === true) {
        el.classList.add('pass');
        icon.textContent = 'Pass';
        valueEl.textContent = 'Pass';
      } else if (checkpoints[entry.key] === false) {
        el.classList.add('fail');
        icon.textContent = 'Fail';
        valueEl.textContent = 'Fail';
      } else {
        icon.textContent = 'o';
        valueEl.textContent = 'Not reached';
      }
    });

    var resultEl = document.getElementById('qualification-result');
    resultEl.className = 'qualification-result ' + result;
    var labels = {
      qualified: 'Qualified Lead — Ready for Property Expert handoff',
      disqualified: 'Disqualified — Geography or budget mismatch',
      partial: 'Partial — Follow up recommended',
    };
    resultEl.textContent = labels[result] || result;

    this.showScreen('summary-screen');
  },
};
```

- [ ] **Step 2: Verify in browser console:**

```javascript
UI.showScreen('call-screen');
UI.updateStage('GEOGRAPHY');
UI.addMessage('bot', 'Hello, this is Priya from Divyasree.');
UI.addMessage('user', 'Yes, go ahead.');
UI.setStatus('listening', 'Listening...');
UI.startTimer();
// Verify: stage bar shows GEOGRAPHY as active, INTRO as completed
// Verify: transcript shows both messages with textContent (not innerHTML)
// Verify: timer is counting up
```

- [ ] **Step 3: Commit**

```bash
git add js/ui.js
git commit -m "feat: add UI module with XSS-safe DOM manipulation"
```

---

## Task 8: Main App Orchestration

**Files:**
- Create: `js/app.js`

- [ ] **Step 1: Create `js/app.js`**

```javascript
// app.js
// Wires all modules together — event handlers, call lifecycle, turn loop

var App = {
  silenceRetries: 0,
  MAX_SILENCE_RETRIES: 2,
  muted: false,

  init: function() {
    var self = this;

    // Load saved API key
    var savedKey = localStorage.getItem('anthropic_key');
    if (savedKey) {
      Claude.init(savedKey);
      UI.showScreen('call-screen');
    }

    // Setup screen
    document.getElementById('save-key-btn').addEventListener('click', function() {
      var key = document.getElementById('api-key-input').value.trim();
      if (!key) { alert('Please enter your API key.'); return; }
      localStorage.setItem('anthropic_key', key);
      Claude.init(key);
      UI.showScreen('call-screen');
    });

    // Start call
    document.getElementById('start-call-btn').addEventListener('click', function() {
      self.startCall();
    });

    // End call
    document.getElementById('end-call-btn').addEventListener('click', function() {
      self.endCall();
    });

    // Mute
    document.getElementById('mute-btn').addEventListener('click', function() {
      self.muted = !self.muted;
      if (self.muted) Voice.stopListening();
      else Voice.startListening();
      UI.setMuted(self.muted);
    });

    // Scenario presets
    document.querySelectorAll('.scenario-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        State.activeScenario = btn.dataset.scenario;
        UI.setActiveScenario(btn.dataset.scenario);
      });
    });

    // New call (from summary screen)
    document.getElementById('new-call-btn').addEventListener('click', function() {
      UI.showScreen('call-screen');
      UI.clearTranscript();
      UI.updateStage('INTRO');
      UI.setActiveScenario(null);
    });

    // Init voice
    try {
      Voice.init();
    } catch (e) {
      alert(e.message);
      return;
    }

    Voice.onUserSpeech = function(text) { self.handleUserSpeech(text); };
    Voice.onSilenceTimeout = function() { self.handleSilenceTimeout(); };
  },

  startCall: function() {
    var self = this;
    State.reset();
    Claude.reset();
    this.silenceRetries = 0;
    this.muted = false;

    UI.setCallActive(true);
    UI.clearTranscript();
    UI.startTimer();
    UI.updateStage('INTRO');
    UI.setStatus('thinking', 'Connecting...');

    var scenario = State.activeScenario ? Scenarios.get(State.activeScenario) : null;
    var scenarioHint = scenario ? scenario.hint : '';
    var systemPrompt = SystemPrompt.build(State.stage, State.checkpoints, scenarioHint);
    var openingMessage = scenario ? scenario.firstUserMessage : 'Hello?';

    Claude.addUserMessage(openingMessage);
    this.getBotResponse(systemPrompt, scenarioHint);
  },

  handleUserSpeech: function(text) {
    if (State.isCallOver()) return;
    this.silenceRetries = 0;

    UI.addMessage('user', text);
    UI.setStatus('thinking', 'Thinking...');

    Claude.addUserMessage(text);
    var scenario = State.activeScenario ? Scenarios.get(State.activeScenario) : null;
    var scenarioHint = scenario ? scenario.hint : '';
    var systemPrompt = SystemPrompt.build(State.stage, State.checkpoints, scenarioHint);

    this.getBotResponse(systemPrompt, scenarioHint);
  },

  getBotResponse: function(systemPrompt) {
    var self = this;
    Claude.send(systemPrompt).then(function(raw) {
      var parsed = State.parseResponse(raw);
      var spokenText = parsed.spokenText;
      var metadata = parsed.metadata;

      if (metadata) State.applyUpdate(metadata);

      Claude.addAssistantMessage(raw);
      UI.addMessage('bot', spokenText);
      UI.updateStage(State.stage);
      UI.setStatus('speaking', 'Speaking...');

      Voice.speak(spokenText, function() {
        if (State.isCallOver()) {
          self.endCall();
        } else {
          UI.setStatus('listening', 'Listening...');
        }
      });
    }).catch(function(e) {
      UI.setStatus(null, 'Error: ' + e.message);
      console.error(e);
    });
  },

  handleSilenceTimeout: function() {
    var self = this;
    if (State.isCallOver()) return;

    this.silenceRetries++;
    if (this.silenceRetries > this.MAX_SILENCE_RETRIES) {
      var exitText = "I'll have someone from our team reach out at a better time. Thank you, and have a wonderful day!";
      UI.addMessage('bot', exitText);
      Voice.speak(exitText, function() { self.endCall(); });
      return;
    }

    var retryText = "Sorry, I didn't catch that — could you say that again?";
    UI.addMessage('bot', retryText);
    UI.setStatus('speaking', 'Speaking...');
    Voice.speak(retryText, function() {
      UI.setStatus('listening', 'Listening...');
    });
  },

  endCall: function() {
    var self = this;
    Voice.stop();
    UI.stopTimer();
    UI.setCallActive(false);
    UI.setStatus(null, 'Call ended');

    setTimeout(function() {
      UI.showSummary(State.checkpoints, State.getQualificationResult());
    }, 800);
  },
};

document.addEventListener('DOMContentLoaded', function() { App.init(); });
```

- [ ] **Step 2: Full integration test — open `index.html` in Chrome:**
  1. Enter API key → click "Start Agent" → call screen shows
  2. Click "1. Ideal Lead" → click "Start Call" → timer starts, bot speaks intro
  3. Respond naturally into mic → transcript shows your words, bot responds
  4. Complete conversation through CTA → End Call → summary card appears with checkpoints filled
  5. Verify no console errors throughout

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: add main app orchestration — full call loop working"
```

---

## Task 9: End-to-End Testing — 5 Scenario Runs

No code changes. Manual verification for screen recording readiness.

- [ ] **Scenario 1 — Ideal Lead:** Click "1. Ideal Lead", start call, respond positively to all checkpoints. Expected: all 4 checkpoints pass, result = "Qualified Lead".

- [ ] **Scenario 2 — Irritated User:** Click "2. Irritated", start call, say "Stop calling me, I'm not interested." Expected: bot apologizes immediately and exits, summary shows partial/disqualified.

- [ ] **Scenario 3 — Location Mismatch:** Click "3. Location Mismatch", start call, at geography say "No, I only want South Bengaluru." Expected: bot disqualifies gracefully, geography = Fail on summary.

- [ ] **Scenario 4 — NRI Investor:** Click "4. NRI Investor", start call, say you're from Dubai. Expected: bot mentions KIAL proximity and Devanahalli appreciation, all checkpoints pass.

- [ ] **Scenario 5 — Disengaged:** Click "5. Disengaged", start call, express concern about 2029 timeline. Expected: bot uses investment reframe ("lower entry price, strong appreciation"), conversation recovers.

- [ ] **Commit**

```bash
git add .
git commit -m "test: verify all 5 scenario flows end-to-end"
```

---

## Task 10: GitHub Repo Setup

- [ ] **Step 1: Initialize git repo and push to AnlinNazareth's account**

```bash
cd /d/Anlin
git init
git add index.html css/ js/ docs/
git commit -m "feat: initial commit — Divyasree WOW voice agent"
gh repo create AnlinNazareth/whispers-of-the-wind-voice-bot --public --source=. --remote=origin --push
```

- [ ] **Step 2: Verify the repo is live at `https://github.com/AnlinNazareth/whispers-of-the-wind-voice-bot`**

---

## Task 11: System Prompt PDF

- [ ] **Step 1: Open `index.html` in Chrome, open DevTools console, run:**

```javascript
console.log(SystemPrompt.build('INTRO', {intent:null,geography:null,budget:null,timeline:null}, ''));
```

Copy the full output from the console.

- [ ] **Step 2: Paste into Google Docs. Add title: "Divyasree WOW Voice Agent — System Prompt". Add Anlin Nazareth's name and date (2026-04-16).**

- [ ] **Step 3: File > Download > PDF Document. Save as `Divyasree_WOW_System_Prompt.pdf` in `D:/Anlin/`.**

---

## Self-Review Notes

- All 5 scenarios covered with distinct flows
- Echo prevention via STT disable during TTS (voice.js)
- Disqualification paths at GEOGRAPHY and BUDGET with graceful exits
- Silence timeout: 2 retries then graceful exit
- Checkpoint skip logic explicit in system prompt
- NRI, Hindi, irritated, and disengaged edge cases all in system prompt
- Stage indicator, timer, transcript, qualification card all wired in ui.js
- API key in localStorage, never hardcoded
- All DOM text via textContent — no innerHTML with untrusted content (XSS-safe)
- No build tools — single directory, open index.html in Chrome
