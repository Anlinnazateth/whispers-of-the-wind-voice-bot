# Design Spec: Divyasree "Whispers of the Wind" Voice AI Bot
**Date:** 2026-04-16
**For:** Anlin Nazareth — REVSPOT Assignment
**Repo:** AnlinNazareth/whispers-of-the-wind-voice-bot

---

## Overview

A browser-based outbound AI voice agent that qualifies leads for Divyasree's "Whispers of the Wind" luxury villa plot project. Built as a single `index.html` file using the Claude API for conversation intelligence and the Web Speech API for voice I/O. Demo delivered as a Google Drive screen recording.

---

## Deliverables

1. `index.html` — fully functional voice agent (run locally in Chrome)
2. `system-prompt.pdf` — the full system message used to configure the bot
3. Google Drive link — screen recording of 5 conversation flows

---

## Architecture

```
User Mic → Web Speech API (STT) → Claude API (claude-sonnet-4-6) → Web Speech API (TTS) → Speaker
                                          ↑
                                   System Prompt
                                   + Conversation State
```

**Key constraint:** STT is disabled while TTS is active (prevents echo loop where the bot hears itself).

**State machine** (tracked in JS, communicated to Claude via system prompt):
```
INTRO → INTENT → GEOGRAPHY → BUDGET → TIMELINE → PITCH → CTA → END
```
Each state can also transition to `DISQUALIFIED` with a graceful exit.

**No build tools.** Single HTML file. API key entered in UI, stored in `localStorage`.

---

## UI Components

| Component | Description |
|---|---|
| API key input | One-time entry, persisted in localStorage |
| Call stage indicator | Progress bar showing current conversation phase |
| Call timer | Elapsed time counter (target: 2–3 min) |
| Live transcript panel | Scrolling user/bot conversation display |
| Lead qualification card | End-of-call summary: 4 checkpoints with pass/fail |
| Scenario presets | 5 buttons to inject predefined user personas for recording |
| Status indicator | Listening / Speaking / Thinking states |
| Mute button | Pause STT mid-call |

---

## System Prompt Design

### Pronunciation Dictionary
- Divyasree → "Div-yaa-shree"
- Nandi → "Nun-dhee"
- Devanahalli → "Dev-aa-naa-halli"
- Lakh → "Luk" (rhymes with luck)
- Crore → "Crow-r"

### Conversation Flow

**INTRO**
- Greet warmly, introduce as Priya from Divyasree
- Mention project name and location
- Ask permission: "Is this a good time to speak for 2–3 minutes?"
- If no → thank and exit gracefully
- If demo (browser) context → skip permission, start directly with introduction

**INTENT** (Checkpoint 1)
- "Are you looking at this more for personal use — like a weekend retreat — or as an investment?"
- Skip if user already mentioned intent

**GEOGRAPHY** (Checkpoint 2)
- "The project is in Nandi Valley, near Nandi Hills and the Devanahalli corridor in North Bengaluru. Does that location work for you?"
- If no → disqualify: "Understood, that's helpful to know. I won't take more of your time — if your requirements change, we'd love to connect."

**BUDGET** (Checkpoint 3)
- "Our plots start at ₹92.4 lakh and go up to ₹2.46 crore, all-inclusive. Does that fit your budget?"
- If no → disqualify with same graceful exit
- If budget fits but location doesn't → note both in qualification card

**TIMELINE** (Checkpoint 4)
- "Possession is scheduled for December 2029. Are you comfortable with that timeline?"
- If no → acknowledge, still proceed to pitch (investment angle covers this)

**PITCH**
- "Let me paint a picture for you: Whispers of the Wind is set across Nandi Valley with 74% open green spaces — eco-parks, scenic hill views, and a 20,000 square foot clubhouse. These are Private Valley villa plots, 1200 to 3199 square feet, designed for people who want a home that's truly away from the city — or a premium asset in one of Bengaluru's fastest-growing corridors."

**CTA**
- "I'd love to have our Property Expert walk you through the site plan and pricing in detail. Could I schedule a quick 15-minute call for you?"
- Collect preferred time/day

### Checkpoint Skip Logic (explicit rules)
- If user mentions intent in INTRO, skip INTENT checkpoint
- If user mentions location comfort, skip GEOGRAPHY
- If user mentions budget range that fits, skip BUDGET
- If user mentions timeline, skip TIMELINE
- Always confirm skipped info with an affirmation ("Perfect, noted that you're looking at investment")

### Affirmations
Use naturally: "Understood", "Perfect", "That's great to hear", "Absolutely", "Of course"

### Tone Rules
- Max 2–3 sentences per bot turn
- Never repeat a question already answered
- Premium, warm, non-pushy
- Never mention competitors

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Irritated user ("Stop calling me!") | "I completely understand, I apologize for the interruption. Have a great day." — end call |
| Budget fit, location mismatch | Disqualify gracefully at GEOGRAPHY, note in summary card |
| Location fit, budget mismatch | Disqualify gracefully at BUDGET, note in summary card |
| User asks project details (area, amenities) | Answer from project knowledge base in system prompt |
| Silent user / STT timeout | "Sorry, I didn't catch that — could you repeat?" (max 2 retries, then graceful exit) |
| User speaks Hindi | Respond in Hindi, continue in Hindi for the rest of the call |
| User is an NRI | Emphasize investment yield, connectivity to airport (Devanahalli near KIAL) |
| User wants to call back | "Of course! I'll have our expert reach out at your preferred time." |

---

## 5 Scenario Presets (for screen recording)

| # | Scenario | Key Flow |
|---|---|---|
| 1 | Ideal lead | All checkpoints pass → full pitch → CTA accepted |
| 2 | Irritated user | Rejects at INTRO → graceful exit |
| 3 | Budget fit, location mismatch | Disqualifies at GEOGRAPHY |
| 4 | NRI investor | Passes all → NRI-specific pitch → CTA |
| 5 | Disengaged / slow | Timeline concern → investment reframe → CTA |

---

## Technical Notes

- **Echo prevention**: `speechSynthesis.onstart` disables STT; `speechSynthesis.onend` re-enables it
- **STT timeout recovery**: if `SpeechRecognition` fires `onend` with no result, bot prompts once
- **API key security**: stored in `localStorage`, only sent to `api.anthropic.com`
- **Conversation history**: full message array passed to Claude each turn (stateless API, stateful UI)
- **System prompt injection**: current checkpoint state injected dynamically so Claude knows where we are
- **Browser support**: Chrome or Edge required (Web Speech API)
