// ui.js
// All DOM manipulation — transcript, stage bar, status indicator, timer, qualification card
// Security: all user-derived and API-derived text is set via textContent (never innerHTML)

var UI = {
  timerInterval: null,
  secondsElapsed: 0,

  // ── Screen switching ──────────────────────────────────────────────────────
  showScreen: function(id) {
    document.querySelectorAll('.screen').forEach(function(s) {
      s.classList.remove('active');
    });
    var target = document.getElementById(id);
    if (target) target.classList.add('active');
  },

  // ── Stage bar ─────────────────────────────────────────────────────────────
  updateStage: function(stage) {
    var stageOrder = ['INTRO', 'INTENT', 'GEOGRAPHY', 'BUDGET', 'TIMELINE', 'PITCH', 'CTA', 'END'];
    var currentIndex = stageOrder.indexOf(stage);

    document.querySelectorAll('.stage-item').forEach(function(el, i) {
      el.classList.remove('active', 'completed', 'disqualified');
      if (stage === 'DISQUALIFIED') {
        // Mark all up to current as disqualified
        if (i <= currentIndex || currentIndex === -1) el.classList.add('disqualified');
      } else if (i < currentIndex) {
        el.classList.add('completed');
      } else if (i === currentIndex) {
        el.classList.add('active');
      }
    });
  },

  // ── Transcript ────────────────────────────────────────────────────────────
  // Uses createElement + textContent exclusively — never innerHTML — to prevent XSS
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

  // ── Status indicator ──────────────────────────────────────────────────────
  // state: 'listening' | 'speaking' | 'thinking' | null
  setStatus: function(state, text) {
    var dot = document.querySelector('.status-dot');
    var label = document.getElementById('status-text');
    dot.className = 'status-dot';
    if (state) dot.classList.add(state);
    label.textContent = text || '';
  },

  // ── Call timer ────────────────────────────────────────────────────────────
  startTimer: function() {
    var self = this;
    this.secondsElapsed = 0;
    clearInterval(this.timerInterval);
    document.getElementById('call-timer').textContent = '0:00';
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

  // ── Scenario buttons ──────────────────────────────────────────────────────
  setActiveScenario: function(key) {
    document.querySelectorAll('.scenario-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.scenario === key);
    });
  },

  // ── Call control buttons ──────────────────────────────────────────────────
  setCallActive: function(active) {
    document.getElementById('start-call-btn').disabled = active;
    document.getElementById('end-call-btn').disabled = !active;
    document.getElementById('mute-btn').disabled = !active;
  },

  setMuted: function(muted) {
    document.getElementById('mute-btn').textContent = muted ? 'Unmute' : 'Mute';
  },

  // ── Qualification summary card ────────────────────────────────────────────
  showSummary: function(checkpoints, result) {
    var entries = [
      { key: 'intent',     id: 'cp-intent' },
      { key: 'geography',  id: 'cp-geography' },
      { key: 'budget',     id: 'cp-budget' },
      { key: 'timeline',   id: 'cp-timeline' },
    ];

    entries.forEach(function(entry) {
      var rowEl   = document.getElementById(entry.id);
      var iconEl  = rowEl.querySelector('.cp-icon');
      var valueEl = document.getElementById(entry.id + '-value');

      rowEl.classList.remove('pass', 'fail', 'partial');

      if (checkpoints[entry.key] === true) {
        rowEl.classList.add('pass');
        iconEl.textContent  = 'Pass';
        valueEl.textContent = 'Pass';
      } else if (checkpoints[entry.key] === false) {
        rowEl.classList.add('fail');
        iconEl.textContent  = 'Fail';
        valueEl.textContent = 'Fail';
      } else {
        iconEl.textContent  = 'o';
        valueEl.textContent = 'Not reached';
      }
    });

    var resultEl = document.getElementById('qualification-result');
    resultEl.className = 'qualification-result ' + result;

    var labels = {
      qualified:    'Qualified Lead — Ready for Property Expert handoff',
      disqualified: 'Disqualified — Geography or budget mismatch',
      partial:      'Partial Lead — Follow-up recommended',
    };
    resultEl.textContent = labels[result] || result;

    this.showScreen('summary-screen');
  },
};
