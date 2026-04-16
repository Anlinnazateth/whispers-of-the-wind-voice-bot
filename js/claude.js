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
   * @returns {Promise<string>} Raw response text (spoken text + JSON metadata on last line)
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
          var msg = (err && err.error && err.error.message) ? err.error.message : ('API error ' + response.status);
          throw new Error(msg);
        });
      }
      return response.json();
    }).then(function(data) {
      return (data.content && data.content[0] && data.content[0].text) || '';
    });
  }
};
