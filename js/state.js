// state.js
// Tracks conversation stage and checkpoint qualification status

var STAGES = ['INTRO', 'INTENT', 'GEOGRAPHY', 'BUDGET', 'TIMELINE', 'PITCH', 'CTA', 'END', 'DISQUALIFIED'];

var State = {
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
    if (parsed.stage && STAGES.indexOf(parsed.stage) !== -1) {
      this.stage = parsed.stage;
    }
    if (parsed.checkpoints) {
      var cp = parsed.checkpoints;
      if (cp.intent !== undefined) this.checkpoints.intent = cp.intent;
      if (cp.geography !== undefined) this.checkpoints.geography = cp.geography;
      if (cp.budget !== undefined) this.checkpoints.budget = cp.budget;
      if (cp.timeline !== undefined) this.checkpoints.timeline = cp.timeline;
    }
    if (parsed.callEnd === true) this.callEnd = true;
    if (parsed.disqualified === true) {
      this.disqualified = true;
      this.stage = 'DISQUALIFIED';
    }
  },

  /**
   * Extracts JSON metadata from Claude's raw response.
   * The JSON is expected on the last non-empty line of the response.
   * Returns { spokenText, metadata }
   * @param {string} raw - Full Claude response text
   */
  parseResponse: function(raw) {
    var lines = raw.split('\n');
    // Walk from the end to find the last non-empty line
    var lastLine = '';
    var lastLineIndex = lines.length - 1;
    while (lastLineIndex >= 0) {
      var trimmed = lines[lastLineIndex].trim();
      if (trimmed.length > 0) { lastLine = trimmed; break; }
      lastLineIndex--;
    }

    // Try to parse that last line as JSON
    if (lastLine.charAt(0) === '{') {
      try {
        var metadata = JSON.parse(lastLine);
        var spokenText = lines.slice(0, lastLineIndex).join('\n').trim();
        return { spokenText: spokenText, metadata: metadata };
      } catch (e) {
        // Not valid JSON — fall through
      }
    }

    return { spokenText: raw.trim(), metadata: null };
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
