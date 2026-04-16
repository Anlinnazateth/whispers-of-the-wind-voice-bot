// app.js
// Main orchestration — wires all modules together
// Call lifecycle: startCall -> getBotResponse -> handleUserSpeech -> getBotResponse -> ... -> endCall

var App = {
  silenceRetries: 0,
  MAX_SILENCE_RETRIES: 2,
  muted: false,
  callActive: false,
  isThinking: false,

  init: function() {
    var self = this;

    // Load saved API key
    var savedKey = localStorage.getItem('anthropic_key');
    if (savedKey) {
      Claude.init(savedKey);
      UI.showScreen('call-screen');
    }

    // Setup screen — save key
    document.getElementById('save-key-btn').addEventListener('click', function() {
      var key = document.getElementById('api-key-input').value.trim();
      if (!key) { alert('Please enter your Anthropic API key.'); return; }
      localStorage.setItem('anthropic_key', key);
      Claude.init(key);
      UI.showScreen('call-screen');
    });

    // Allow Enter key on API key input
    document.getElementById('api-key-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('save-key-btn').click();
    });

    // Start call
    document.getElementById('start-call-btn').addEventListener('click', function() {
      self.startCall();
    });

    // End call
    document.getElementById('end-call-btn').addEventListener('click', function() {
      self.endCall();
    });

    // Mute / unmute
    document.getElementById('mute-btn').addEventListener('click', function() {
      self.muted = !self.muted;
      if (self.muted) {
        Voice.stopListening();
      } else {
        Voice.startListening();
      }
      UI.setMuted(self.muted);
    });

    // Scenario preset buttons
    document.querySelectorAll('.scenario-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (self.callActive) return; // Don't change scenario mid-call
        State.activeScenario = btn.dataset.scenario;
        UI.setActiveScenario(btn.dataset.scenario);
      });
    });

    // New call button (from summary screen)
    document.getElementById('new-call-btn').addEventListener('click', function() {
      UI.showScreen('call-screen');
      UI.clearTranscript();
      UI.updateStage('INTRO');
      UI.setStatus(null, 'Ready');
      UI.setActiveScenario(null);
      State.activeScenario = null;
    });

    // Init voice module
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

    if (!Claude.apiKey) {
      alert('No API key found. Please refresh and enter your key.');
      return;
    }

    State.reset();
    Claude.reset();
    this.silenceRetries = 0;
    this.muted = false;
    this.callActive = true;

    UI.setCallActive(true);
    UI.clearTranscript();
    UI.startTimer();
    UI.updateStage('INTRO');
    UI.setMuted(false);
    UI.setStatus('thinking', 'Connecting...');

    var scenario = State.activeScenario ? Scenarios.get(State.activeScenario) : null;
    var scenarioHint = scenario ? scenario.hint : '';
    var openingMessage = scenario ? scenario.firstUserMessage : 'Hello?';

    // Simulate the lead picking up the phone — this triggers Priya's opening line
    Claude.addUserMessage(openingMessage);
    UI.addMessage('user', openingMessage);

    this.isThinking = true;
    var systemPrompt = SystemPrompt.build(State.stage, State.checkpoints, scenarioHint);
    this.getBotResponse(systemPrompt, scenarioHint);
  },

  handleUserSpeech: function(text) {
    if (!this.callActive || State.isCallOver()) return;
    this.silenceRetries = 0;

    UI.addMessage('user', text);
    UI.setStatus('thinking', 'Thinking...');
    this.isThinking = true;
    Voice.stopListening(); // stop STT while we wait for Claude

    Claude.addUserMessage(text);

    var scenario = State.activeScenario ? Scenarios.get(State.activeScenario) : null;
    var scenarioHint = scenario ? scenario.hint : '';
    var systemPrompt = SystemPrompt.build(State.stage, State.checkpoints, scenarioHint);

    this.getBotResponse(systemPrompt, scenarioHint);
  },

  getBotResponse: function(systemPrompt) {
    var self = this;

    Claude.send(systemPrompt).then(function(raw) {
      if (!self.callActive) return; // Call was ended while waiting

      var parsed = State.parseResponse(raw);
      var spokenText = parsed.spokenText;
      var metadata = parsed.metadata;

      // Fall back gracefully if Claude didn't include JSON
      if (!spokenText && raw.trim()) spokenText = raw.trim();

      if (metadata) State.applyUpdate(metadata);

      self.isThinking = false;
      // Store full raw response in conversation history
      Claude.addAssistantMessage(raw);

      UI.addMessage('bot', spokenText);
      UI.updateStage(State.stage);
      UI.setStatus('speaking', 'Speaking...');

      Voice.speak(spokenText, function() {
        if (!self.callActive) return;
        if (State.isCallOver()) {
          self.endCall();
        } else {
          UI.setStatus('listening', 'Listening...');
        }
      });
    }).catch(function(e) {
      self.isThinking = false;
      UI.setStatus(null, 'Error: ' + e.message);
      console.error('Claude API error:', e);
    });
  },

  handleSilenceTimeout: function() {
    var self = this;
    if (!this.callActive || State.isCallOver() || this.isThinking) return;

    this.silenceRetries++;

    if (this.silenceRetries > this.MAX_SILENCE_RETRIES) {
      // Give up gracefully after 2 retries
      var exitText = "I'll have someone from our team reach out at a better time. Thank you so much, and have a wonderful day!";
      UI.addMessage('bot', exitText);
      UI.setStatus('speaking', 'Speaking...');
      Voice.speak(exitText, function() { self.endCall(); });
      return;
    }

    var retryText = "Sorry, I didn't quite catch that — could you say that again?";
    UI.addMessage('bot', retryText);
    UI.setStatus('speaking', 'Speaking...');
    Voice.speak(retryText, function() {
      UI.setStatus('listening', 'Listening...');
    });
  },

  endCall: function() {
    var self = this;
    this.callActive = false;
    Voice.stop();
    UI.stopTimer();
    UI.setCallActive(false);
    UI.setStatus(null, 'Call ended');

    // Brief pause before showing summary
    setTimeout(function() {
      UI.showSummary(State.checkpoints, State.getQualificationResult());
    }, 900);
  },
};

document.addEventListener('DOMContentLoaded', function() {
  App.init();
});
