// voice.js
// Web Speech API wrapper
// CRITICAL: STT is disabled while TTS is active to prevent the bot from hearing itself

var Voice = {
  recognition: null,
  synthesis: window.speechSynthesis,
  isSpeaking: false,
  isListening: false,
  onUserSpeech: null,       // callback(text: string)
  onSilenceTimeout: null,   // callback()
  silenceTimer: null,
  SILENCE_TIMEOUT_MS: 7000,
  _voicesLoaded: false,

  init: function() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Web Speech API not supported. Please use Google Chrome or Microsoft Edge.');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-IN';

    var self = this;

    this.recognition.onresult = function(event) {
      clearTimeout(self.silenceTimer);
      var transcript = event.results[0][0].transcript.trim();
      if (transcript && self.onUserSpeech) {
        self.onUserSpeech(transcript);
      }
    };

    this.recognition.onend = function() {
      self.isListening = false;
      // If not speaking and call is active, start silence countdown
      if (!self.isSpeaking) {
        self.silenceTimer = setTimeout(function() {
          if (self.onSilenceTimeout) self.onSilenceTimeout();
        }, self.SILENCE_TIMEOUT_MS);
      }
    };

    this.recognition.onerror = function(event) {
      self.isListening = false;
      // Restart on no-speech; ignore other errors silently
      if (event.error === 'no-speech' && !self.isSpeaking) {
        self._startListening();
      }
    };

    // Pre-load voices (Chrome loads them async)
    if (this.synthesis.getVoices().length === 0) {
      this.synthesis.addEventListener('voiceschanged', function() {
        self._voicesLoaded = true;
      });
    } else {
      this._voicesLoaded = true;
    }
  },

  _startListening: function() {
    if (this.isSpeaking || this.isListening) return;
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      // Recognition already started — ignore InvalidStateError
    }
  },

  startListening: function() {
    clearTimeout(this.silenceTimer);
    this._startListening();
  },

  stopListening: function() {
    clearTimeout(this.silenceTimer);
    if (this.isListening) {
      try { this.recognition.stop(); } catch (e) { /* ignore */ }
      this.isListening = false;
    }
  },

  /**
   * Speaks text aloud. Disables STT while speaking, re-enables after done.
   * @param {string} text - Spoken text only (no JSON metadata)
   * @param {function} onDone - Called when speech completes
   */
  speak: function(text, onDone) {
    this.stopListening();
    this.synthesis.cancel();
    this.isSpeaking = true;
    var self = this;

    // Small delay to let cancel() take effect
    setTimeout(function() {
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      utterance.rate = 0.9;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      // Prefer a female English voice
      var voices = self.synthesis.getVoices();
      var preferredNames = ['Google UK English Female', 'Samantha', 'Zira', 'Female'];
      var femaleVoice = null;
      for (var i = 0; i < preferredNames.length; i++) {
        femaleVoice = voices.find(function(v) {
          return v.lang.indexOf('en') === 0 && v.name.indexOf(preferredNames[i]) !== -1;
        });
        if (femaleVoice) break;
      }
      // Fallback: any English voice
      if (!femaleVoice) {
        femaleVoice = voices.find(function(v) { return v.lang.indexOf('en') === 0; });
      }
      if (femaleVoice) utterance.voice = femaleVoice;

      utterance.onend = function() {
        self.isSpeaking = false;
        if (onDone) onDone();
        // Delay before restarting STT — Web Speech API needs time to reset
        setTimeout(function() { self.startListening(); }, 300);
      };

      utterance.onerror = function() {
        self.isSpeaking = false;
        if (onDone) onDone();
      };

      self.synthesis.speak(utterance);
    }, 100);
  },

  stop: function() {
    this.stopListening();
    this.synthesis.cancel();
    this.isSpeaking = false;
    clearTimeout(this.silenceTimer);
  },

  /** Switch recognition language. Call before startListening. */
  setLanguage: function(lang) {
    // lang: 'en-IN' or 'hi-IN'
    if (this.recognition) this.recognition.lang = lang;
  }
};
